import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client with service_role_key (server-side only, bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to map DB row (snake_case) to app format (camelCase)
function mapCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    password: row.password,
    members: row.members || []
  };
}

function mapReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    reporter: row.reporter,
    url: row.url || '',
    attachmentUrl: row.attachment_url || '',
    internalNotes: row.internal_notes || '',
    portal: row.portal || '',
    correlationId: row.correlation_id || '',
    loginUser: row.login_user || '',
    loginPassword: row.login_password || '',
    createdAt: row.created_at
  };
}

export const db = {
  // ─── Settings ────────────────────────────────────────────────
  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    if (error) throw new Error('Erro ao buscar configurações: ' + error.message);
    return { adminPassword: data.admin_password };
  },

  async updateSettings(newSettings) {
    const updates = {};
    if (newSettings.adminPassword !== undefined) updates.admin_password = newSettings.adminPassword;

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw new Error('Erro ao atualizar configurações: ' + error.message);
    return { adminPassword: data.admin_password };
  },

  // ─── Companies ───────────────────────────────────────────────
  async getCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    if (error) throw new Error('Erro ao buscar empresas: ' + error.message);
    return (data || []).map(mapCompany);
  },

  async getCompanyById(id) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return mapCompany(data);
  },

  async getCompanyBySlug(slug) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .ilike('slug', slug)
      .single();
    if (error) return null;
    return mapCompany(data);
  },

  async createCompany({ name, slug, password, members }) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', cleanSlug)
      .single();
    if (existing) throw new Error(`Empresa com URL slug "${cleanSlug}" já existe.`);

    const newCompany = {
      id: `company-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      slug: cleanSlug,
      password: password || '123',
      members: members || []
    };

    const { data, error } = await supabase
      .from('companies')
      .insert(newCompany)
      .select()
      .single();
    if (error) throw new Error('Erro ao criar empresa: ' + error.message);
    return mapCompany(data);
  },

  async updateCompany(id, companyData) {
    // Build update object (only update fields that are provided)
    const updates = {};
    if (companyData.name !== undefined) updates.name = companyData.name;
    if (companyData.password !== undefined) updates.password = companyData.password;
    if (companyData.members !== undefined) updates.members = companyData.members;
    // Note: slug updates not allowed after creation for URL integrity

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Erro ao atualizar empresa: ' + error.message);
    if (!data) throw new Error('Empresa não encontrada.');
    return mapCompany(data);
  },

  async deleteCompany(id) {
    // ON DELETE CASCADE in schema handles associated reports
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Erro ao excluir empresa: ' + error.message);
    return true;
  },

  // ─── Reports ─────────────────────────────────────────────────
  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Erro ao buscar reports: ' + error.message);
    return (data || []).map(mapReport);
  },

  async getReportsByCompany(companyId) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Erro ao buscar reports da empresa: ' + error.message);
    return (data || []).map(mapReport);
  },

  async getReportById(id) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return mapReport(data);
  },

  async createReport({ companyId, title, description, priority, reporter, url, attachmentUrl, portal, correlationId, loginUser, loginPassword }) {
    const newReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      company_id: companyId,
      title,
      description,
      priority: priority || 'medium',
      status: 'pending',
      reporter,
      url: url || '',
      attachment_url: attachmentUrl || '',
      internal_notes: '',
      portal: portal || '',
      correlation_id: correlationId || '',
      login_user: loginUser || '',
      login_password: loginPassword || ''
    };

    const { data, error } = await supabase
      .from('reports')
      .insert(newReport)
      .select()
      .single();
    if (error) throw new Error('Erro ao criar report: ' + error.message);
    return mapReport(data);
  },

  async updateReport(id, reportData) {
    const updates = {};
    if (reportData.status !== undefined) updates.status = reportData.status;
    if (reportData.priority !== undefined) updates.priority = reportData.priority;
    if (reportData.internalNotes !== undefined) updates.internal_notes = reportData.internalNotes;
    if (reportData.attachmentUrl !== undefined) updates.attachment_url = reportData.attachmentUrl;
    if (reportData.portal !== undefined) updates.portal = reportData.portal;
    if (reportData.correlationId !== undefined) updates.correlation_id = reportData.correlationId;
    if (reportData.loginUser !== undefined) updates.login_user = reportData.loginUser;
    if (reportData.loginPassword !== undefined) updates.login_password = reportData.loginPassword;

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Erro ao atualizar report: ' + error.message);
    if (!data) throw new Error('Relatório não encontrado.');
    return mapReport(data);
  },

  async deleteReport(id) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Erro ao excluir report: ' + error.message);
    return true;
  }
};
