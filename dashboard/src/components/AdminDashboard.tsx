import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bug, 
  Settings as SettingsIcon, 
  LogOut, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  ExternalLink,
  Shield,
  User,
  Loader2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import type { Company, Report, Priority, ReportStatus } from '../types';

interface AdminDashboardProps {
  navigate: (to: string) => void;
}

type TabType = 'bugs' | 'companies' | 'settings';

export default function AdminDashboard({ navigate }: AdminDashboardProps) {
  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  
  // Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  // Navigation / Filter states
  const [activeTab, setActiveTab] = useState<TabType>('bugs');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Loading states
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [copiedCompanyId, setCopiedCompanyId] = useState<string | null>(null);

  // Modals & Selected Objects
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companySlug, setCompanySlug] = useState<string>('');
  const [companyMembersInput, setCompanyMembersInput] = useState<string>('');
  const [companyError, setCompanyError] = useState<string>('');
  const [companyPassword, setCompanyPassword] = useState<string>('');

  // Settings Form states
  const [newAdminPass, setNewAdminPass] = useState<string>('');
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // LocalStorage admin auth key
  const ADMIN_PASS_KEY = 'bugreport_admin_pass';

  // Check auth on mount
  useEffect(() => {
    const savedAdminPass = localStorage.getItem(ADMIN_PASS_KEY);
    if (savedAdminPass) {
      verifyAdminPassAndLoad(savedAdminPass);
    }
  }, []);

  const verifyAdminPassAndLoad = async (pass: string) => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });

      if (res.ok) {
        setIsAdminAuthenticated(true);
        localStorage.setItem(ADMIN_PASS_KEY, pass);
        // Load all data
        await loadAllAdminData(pass);
      } else {
        localStorage.removeItem(ADMIN_PASS_KEY);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAllAdminData = async (pass: string) => {
    try {
      const headers = { 'x-admin-password': pass };
      
      const [reportsRes, companiesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/reports', { headers }),
        fetch('/api/admin/companies', { headers }),
        fetch('/api/admin/settings', { headers })
      ]);

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setNewAdminPass(settingsData.adminPassword || '');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do administrador:', err);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoadingAction(true);

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      if (!res.ok) {
        throw new Error('Senha administrativa incorreta.');
      }

      setIsAdminAuthenticated(true);
      localStorage.setItem(ADMIN_PASS_KEY, adminPassword);
      await loadAllAdminData(adminPassword);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(ADMIN_PASS_KEY);
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    setReports([]);
    setCompanies([]);
  };

  const currentAdminPass = () => localStorage.getItem(ADMIN_PASS_KEY) || '';

  // Update Report (Status, Priority, Internal Notes)
  const handleUpdateReport = async (reportId: string, fieldsToUpdate: Partial<Report>) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': currentAdminPass()
        },
        body: JSON.stringify(fieldsToUpdate)
      });

      if (!res.ok) throw new Error('Erro ao atualizar relatório.');

      const updatedReport = await res.json();
      
      // Update locally
      setReports(reports.map(r => r.id === reportId ? { ...r, ...updatedReport } : r));
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ...updatedReport });
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar o bug.');
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Deseja realmente deletar este apontamento?')) return;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': currentAdminPass() }
      });

      if (!res.ok) throw new Error('Erro ao excluir relatório.');

      setReports(reports.filter(r => r.id !== reportId));
      setIsReportModalOpen(false);
      setSelectedReport(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao deletar apontamento.');
    }
  };

  // Copy Company Link
  const handleCopyLink = (companySlug: string, id: string) => {
    const link = `${window.location.origin}/c/${companySlug}`;
    navigator.clipboard.writeText(link);
    setCopiedCompanyId(id);
    setTimeout(() => setCopiedCompanyId(null), 2000);
  };

  // Create or Update Company
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError('');
    if (!companyName.trim() || !companySlug.trim()) return;

    setLoadingAction(true);
    const members = companyMembersInput
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');

    const payload = {
      name: companyName,
      slug: companySlug.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
      password: companyPassword,
      members
    };

    try {
      if (editingCompany) {
        // Update company
        const res = await fetch(`/api/admin/companies/${editingCompany.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': currentAdminPass()
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao editar empresa.');
        }

        const updated = await res.json();
        setCompanies(companies.map(c => c.id === editingCompany.id ? updated : c));
      } else {
        // Create company
        const res = await fetch('/api/admin/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': currentAdminPass()
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao cadastrar empresa.');
        }

        const created = await res.json();
        setCompanies([...companies, created]);
      }

      setIsCompanyModalOpen(false);
      setCompanyName('');
      setCompanySlug('');
      setCompanyPassword('');
      setCompanyMembersInput('');
      setEditingCompany(null);
    } catch (err: any) {
      setCompanyError(err.message || 'Erro ao salvar empresa.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete Company
  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Deseja realmente deletar esta empresa? Atenção: todos os apontamentos vinculados a ela também serão excluídos!')) return;

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': currentAdminPass() }
      });

      if (!res.ok) throw new Error('Erro ao excluir empresa.');

      setCompanies(companies.filter(c => c.id !== companyId));
      // Refresh reports since they are cascade deleted on the server
      await loadAllAdminData(currentAdminPass());
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir empresa.');
    }
  };

  const openEditCompanyModal = (comp: Company) => {
    setEditingCompany(comp);
    setCompanyName(comp.name);
    setCompanySlug(comp.slug);
    setCompanyPassword(comp.password || '');
    setCompanyMembersInput(comp.members.join(', '));
    setCompanyError('');
    setIsCompanyModalOpen(true);
  };

  const openCreateCompanyModal = () => {
    setEditingCompany(null);
    setCompanyName('');
    setCompanySlug('');
    setCompanyPassword('');
    setCompanyMembersInput('');
    setCompanyError('');
    setIsCompanyModalOpen(true);
  };

  // Update Settings (Passwords)
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);

    if (!newAdminPass.trim()) {
      setSettingsMessage({ text: 'A senha não pode estar em branco.', type: 'error' });
      return;
    }

    setLoadingAction(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': currentAdminPass()
        },
        body: JSON.stringify({
          adminPassword: newAdminPass
        })
      });

      if (!res.ok) throw new Error('Erro ao atualizar configurações.');

      await res.json();
      
      // Update local storage in case admin password itself was changed
      localStorage.setItem(ADMIN_PASS_KEY, newAdminPass);
      
      setSettingsMessage({ text: 'Configurações atualizadas com sucesso!', type: 'success' });
    } catch (err) {
      console.error(err);
      setSettingsMessage({ text: 'Erro ao salvar as novas senhas.', type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Metric Calculation
  const totalBugs = reports.length;
  const pendingBugs = reports.filter(r => r.status === 'pending').length;
  const investigatingBugs = reports.filter(r => r.status === 'investigating').length;
  const resolvedBugs = reports.filter(r => r.status === 'resolved' || r.status === 'closed').length;

  // Filtered reports list
  const filteredReports = reports.filter(report => {
    // Search query match
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporter.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCompany = filterCompany === 'all' || report.companyId === filterCompany;

    // Status match
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;

    // Priority match
    const matchesPriority = filterPriority === 'all' || report.priority === filterPriority;

    return matchesSearch && matchesCompany && matchesStatus && matchesPriority;
  });

  const getPriorityBadgeColor = (prio: Priority) => {
    switch (prio) {
      case 'high': return 'bg-red-950/40 text-red-500 border-red-900/50';
      case 'medium': return 'bg-amber-950/40 text-amber-500 border-amber-900/50';
      case 'low': return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-zinc-950 text-zinc-400 border-zinc-800';
      case 'investigating': return 'bg-primary/10 text-primary border-primary/20';
      case 'resolved': return 'bg-primary/20 text-primary border-primary/40';
      case 'closed': return 'bg-zinc-900 text-zinc-500 border-zinc-800 line-through';
      default: return 'bg-zinc-900 text-zinc-400 border-zinc-850';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'investigating': return 'Em Análise';
      case 'resolved': return 'Resolvido';
      case 'closed': return 'Finalizado';
      default: return status;
    }
  };

  const getCompanyName = (companyId: string) => {
    const comp = companies.find(c => c.id === companyId);
    return comp ? comp.name : 'Desconhecido';
  };

  if (loadingData && !isAdminAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-500 text-sm mt-4 font-mono">autenticando painel administrativo...</p>
      </div>
    );
  }

  // Admin Login Screen
  if (!isAdminAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
        <div className="max-w-md w-full glass-panel p-8 rounded-xl relative">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PIXELOGIC</h1>
            <p className="text-zinc-500 text-sm mt-1">Acesso administrativo e triagem de bugs</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2 font-mono">Senha Administrativa</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Senha admin"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-3 px-4 text-white placeholder-zinc-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center tracking-widest"
                required
              />
              {authError && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" /> {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingAction}
              className="w-full bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground font-semibold py-3 px-4 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Admin Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider font-sans">PIXELOGIC</span>
            <div 
              onClick={() => navigate('/')}
              className="font-mono text-xl font-bold tracking-tight cursor-pointer hover:opacity-85"
            >
              bugs<span className="text-primary">;</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white bg-transparent hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 px-3 py-1.5 rounded-md transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do Painel
            </button>
          </div>
        </div>
      </header>

      {/* Admin Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0 flex md:flex-col gap-2 border-b md:border-b-0 md:border-r border-zinc-900 pb-4 md:pb-0 md:pr-4">
          <button
            onClick={() => setActiveTab('bugs')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-left text-sm font-semibold transition-all cursor-pointer w-full ${
              activeTab === 'bugs' 
                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(132,204,22,0.15)]' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Bug className="w-4 h-4" />
            Apontamentos
          </button>
          
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-left text-sm font-semibold transition-all cursor-pointer w-full ${
              activeTab === 'companies' 
                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(132,204,22,0.15)]' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Clientes / Empresas
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-left text-sm font-semibold transition-all cursor-pointer w-full ${
              activeTab === 'settings' 
                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(132,204,22,0.15)]' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Configurações
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: BUGS LIST */}
          {activeTab === 'bugs' && (
            <div className="space-y-6">
              
              {/* Metrics Header */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Total Reportado</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold">{totalBugs}</span>
                    <span className="text-xs text-zinc-600 font-mono">chamados</span>
                  </div>
                </div>
                
                <div className="glass-card p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Pendentes</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-amber-500">{pendingBugs}</span>
                    <span className="text-xs text-zinc-600 font-mono">aguardando</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Em Análise</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-primary">{investigatingBugs}</span>
                    <span className="text-xs text-zinc-600 font-mono">analisando</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Resolvidos</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-zinc-400">{resolvedBugs}</span>
                    <span className="text-xs text-zinc-600 font-mono">corrigidos</span>
                  </div>
                </div>
              </div>

              {/* Filters Header */}
              <div className="glass-panel p-4 rounded-xl border border-zinc-900 flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por título, descrição ou reporter..."
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Company Filter */}
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 rounded-md px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todas Empresas</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 rounded-md px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todos Status</option>
                    <option value="pending">Pendente</option>
                    <option value="investigating">Em Análise</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Finalizado</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 rounded-md px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todas Prioridades</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              {/* Bugs Grid / Table */}
              <div className="glass-card rounded-xl border border-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-zinc-950/80 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                      <tr>
                        <th className="px-6 py-4">Data / ID</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">Título / Autor</th>
                        <th className="px-6 py-4">Prioridade</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredReports.length > 0 ? (
                        filteredReports.map((report) => (
                          <tr key={report.id} className="hover:bg-zinc-950/30 transition-all">
                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-zinc-500">
                              <div>{formatDate(report.createdAt).split(' ')[0]}</div>
                              <div className="text-[10px]">#{report.id.substring(7, 12)}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                              {getCompanyName(report.companyId)}
                            </td>
                            <td className="px-6 py-4 max-w-[240px]">
                              <div className="font-semibold text-zinc-200 truncate" title={report.title}>{report.title}</div>
                              <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
                                <User className="w-3 h-3" /> {report.reporter}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadgeColor(report.priority)}`}>
                                {report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadgeColor(report.status)}`}>
                                {getStatusLabel(report.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setIsReportModalOpen(true);
                                  }}
                                  className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="text-zinc-500 hover:text-red-500 p-1.5 rounded hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium">
                            Nenhum apontamento encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANIES LIST */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Empresas Clientes</h1>
                  <p className="text-zinc-500 text-sm mt-1">Configure os slugs de URL exclusiva e cadastre os membros autorizados.</p>
                </div>
                
                <button
                  onClick={openCreateCompanyModal}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(132,204,22,0.1)] text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Nova Empresa
                </button>
              </div>

              {/* Companies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.length > 0 ? (
                  companies.map((comp) => (
                    <div 
                      key={comp.id}
                      className="glass-card p-6 rounded-xl border border-zinc-900 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">{comp.name}</h3>
                            <span className="text-zinc-500 text-xs font-mono">slug: {comp.slug}</span>
                          </div>
                          
                          <button
                            onClick={() => handleCopyLink(comp.slug, comp.id)}
                            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 px-2.5 py-1.5 rounded transition-all cursor-pointer"
                            title="Copiar link de acesso do cliente"
                          >
                            {copiedCompanyId === comp.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-primary" />
                                <span className="text-primary font-bold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Members tag list */}
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Membros Cadastrados ({comp.members.length})</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {comp.members.length > 0 ? (
                              comp.members.map(member => (
                                <span key={member} className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-400">
                                  {member}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-650 italic">Nenhum membro cadastrado</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center gap-2 border-t border-zinc-900/60 pt-4 mt-6">
                        <button
                          onClick={() => openEditCompanyModal(comp)}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-2 rounded text-xs font-medium transition-all cursor-pointer text-center"
                        >
                          Editar Empresa
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(comp.id)}
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-950/20 border border-transparent hover:border-red-900/40 p-2 rounded transition-all cursor-pointer"
                          title="Excluir Empresa"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-12 text-center text-zinc-500 glass-card rounded-xl border border-zinc-900">
                    Nenhuma empresa cadastrada. Use o botão acima para cadastrar a primeira!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Configurações Gerais</h1>
                <p className="text-zinc-500 text-sm mt-1">Gerencie as senhas de acesso do portal.</p>
              </div>

              <div className="glass-panel p-6 rounded-xl border border-zinc-900">
                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  {settingsMessage && (
                    <div className={`p-4 rounded-md border text-sm flex items-center gap-2 ${
                      settingsMessage.type === 'success' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-red-950/20 text-red-500 border-red-900/40'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                      <span>{settingsMessage.text}</span>
                    </div>
                  )}

                  {/* Admin Pass */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Senha Administrativa (PIXELOGIC)</label>
                      <span className="text-[10px] text-zinc-500">Acesso a esta tela (/admin)</span>
                    </div>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-zinc-650 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        placeholder="Senha admin"
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-md py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-primary transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-3 px-4 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Footer */}
      <footer className="border-t border-zinc-950 bg-black py-6 text-center text-xs text-zinc-605 font-mono mt-12">
        &copy; 2026 PIXELOGIC. Painel de Controle Administrativo.
      </footer>

      {/* Company Create/Edit Modal */}
      <Dialog open={isCompanyModalOpen} onOpenChange={(open: boolean) => { if (!loadingAction) setIsCompanyModalOpen(open); }}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border border-zinc-800 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">
              Preencha os dados cadastrais da empresa cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompanySubmit} className="space-y-4 pt-2">
            {companyError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-500 text-xs rounded-md flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{companyError}</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Nome da Empresa</label>
              <input
                type="text"
                placeholder="Ex: Frete Click"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>

            {/* Slug URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Slug da URL Exclusiva</label>
              <div className="flex items-center">
                <span className="bg-zinc-900 border border-r-0 border-zinc-800 rounded-l-md px-3.5 py-2.5 text-zinc-500 text-sm font-mono select-none">/c/</span>
                <input
                  type="text"
                  placeholder="freteclick"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-r-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                  required
                  disabled={!!editingCompany} // Prevent slug changes after creation for path integrity
                />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono">Sem espaços, acentos ou caracteres especiais. Ex: calvinklein, portus.</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Senha de Acesso do Cliente</label>
              <input
                type="text"
                placeholder="Ex: fr3tecl1ck"
                value={companyPassword}
                onChange={(e) => setCompanyPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                required
              />
              <p className="text-[10px] text-zinc-600 font-mono">Senha que o cliente usará para desbloquear o portal (/c/{companySlug || 'slug'}).</p>
            </div>

            {/* Members comma separated */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Membros Cadastrados</label>
              <textarea
                placeholder="Ex: João Silva, Maria Souza, Carlos Eduardo"
                value={companyMembersInput}
                onChange={(e) => setCompanyMembersInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary transition-all min-h-[80px]"
              />
              <p className="text-[10px] text-zinc-650 font-mono">Separe os nomes por vírgula. Estas pessoas aparecerão na tela "Quem é você?".</p>
            </div>

            <DialogFooter className="pt-2 border-t border-zinc-900 gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                disabled={loadingAction}
                className="bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white px-4 py-2 rounded-md border border-zinc-900 hover:border-zinc-800 transition-all text-sm cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingAction}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2 rounded-md transition-all text-sm cursor-pointer disabled:bg-primary/50 flex items-center justify-center gap-1.5"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCompany ? 'Salvar Empresa' : 'Cadastrar'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bug Details Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={(open: boolean) => { if (!loadingAction) setIsReportModalOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-6xl w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl overflow-y-auto max-h-[90vh] p-6">
          <DialogHeader className="pb-6 border-b border-zinc-900">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-primary animate-pulse" /> Detalhes do Apontamento
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Triagem de bug, notas de desenvolvimento e alteração de status.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <>
              {/* Content Body */}
              <div className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  
                  {/* Left Column: Bug Description and Attachment */}
                  <div className="md:col-span-3 space-y-6">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Título</h4>
                      <p className="text-xl font-extrabold text-white leading-tight tracking-tight">{selectedReport.title}</p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Descrição Detalhada</h4>
                      <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-lg text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedReport.description}
                      </div>
                    </div>

                    {/* Extra metadata: portal, correlation ID, user credentials */}
                    {(selectedReport.portal || selectedReport.correlationId || selectedReport.loginUser || selectedReport.loginPassword) && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-900/20 border border-zinc-900/80 p-4 rounded-lg">
                        {selectedReport.portal && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Portal</span>
                            <div className="text-xs font-bold text-primary mt-0.5">{selectedReport.portal}</div>
                          </div>
                        )}
                        {selectedReport.correlationId && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">ID de Correlação</span>
                            <div className="text-xs font-mono text-zinc-300 mt-0.5">{selectedReport.correlationId}</div>
                          </div>
                        )}
                        {selectedReport.loginUser && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Usuário</span>
                            <div className="text-xs font-mono text-zinc-300 mt-0.5">{selectedReport.loginUser}</div>
                          </div>
                        )}
                        {selectedReport.loginPassword && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Senha</span>
                            <div className="text-xs font-mono text-zinc-300 mt-0.5">{selectedReport.loginPassword}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedReport.url && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">URL Afetada</h4>
                        <a 
                          href={selectedReport.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline text-xs flex items-center gap-1.5 self-start bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-2 rounded w-fit transition-all"
                        >
                          Abrir link original <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {selectedReport.attachmentUrl && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Captura de Tela Anexa</h4>
                        <div 
                          className="relative group max-w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer" 
                          onClick={() => setLightboxImage(`${selectedReport.attachmentUrl}`)}
                        >
                          <img 
                            src={`${selectedReport.attachmentUrl}`} 
                            alt="Bug attachment screenshot" 
                            className="max-h-[380px] w-full object-contain group-hover:scale-[1.01] transition-all bg-zinc-900/40"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-xs font-medium gap-1 text-white">
                            <ImageIcon className="w-4 h-4" /> Clique para ampliar
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Metadata, Status/Priority and Internal Notes */}
                  <div className="md:col-span-2 space-y-6 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-8">
                    
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-lg">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Empresa</span>
                        <div className="text-xs font-bold text-white mt-0.5 truncate">{getCompanyName(selectedReport.companyId)}</div>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-lg">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Autor</span>
                        <div className="text-xs font-bold text-white mt-0.5 truncate flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" /> {selectedReport.reporter}
                        </div>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-lg">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Data</span>
                        <div className="text-[10px] font-mono text-zinc-300 mt-0.5">{formatDate(selectedReport.createdAt)}</div>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-lg">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">ID Chamado</span>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">#{selectedReport.id.substring(7, 15)}</div>
                      </div>
                    </div>

                    {/* Status & Priority Toggles */}
                    <div className="space-y-4 bg-zinc-900/20 border border-zinc-900/80 p-4 rounded-lg">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Status</label>
                        <select
                          value={selectedReport.status}
                          onChange={(e) => handleUpdateReport(selectedReport.id, { status: e.target.value as ReportStatus })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-white text-xs focus:outline-none focus:border-primary transition-all cursor-pointer"
                        >
                          <option value="pending">Pendente (Aguardando Triagem)</option>
                          <option value="investigating">Em Análise (Desenvolvimento)</option>
                          <option value="resolved">Resolvido (Pronto em Homologação)</option>
                          <option value="closed">Finalizado (Concluído & Arquivado)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Prioridade</label>
                        <select
                          value={selectedReport.priority}
                          onChange={(e) => handleUpdateReport(selectedReport.id, { priority: e.target.value as Priority })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-white text-xs focus:outline-none focus:border-primary transition-all cursor-pointer"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Notas Internas (Confidencial)</label>
                        <span className="bg-zinc-900 text-zinc-500 text-[9px] px-2 py-0.5 rounded border border-zinc-850">Visível apenas no admin</span>
                      </div>
                      <textarea
                        value={selectedReport.internalNotes || ''}
                        onChange={(e) => handleUpdateReport(selectedReport.id, { internalNotes: e.target.value })}
                        placeholder="Adicione observações da triagem, ID da tarefa no Jira/Trello..."
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-md py-2.5 px-3.5 text-zinc-300 placeholder-zinc-700 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-[150px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 mt-6 border-t border-zinc-900 flex items-center justify-between bg-transparent">
                <button
                  type="button"
                  onClick={() => handleDeleteReport(selectedReport.id)}
                  className="bg-transparent hover:bg-red-950/20 text-zinc-500 hover:text-red-500 px-4 py-2 rounded-md border border-zinc-900 hover:border-red-900/40 transition-all text-xs cursor-pointer"
                >
                  Excluir Apontamento
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2.5 rounded-md transition-all text-xs cursor-pointer shadow-[0_0_10px_rgba(132,204,22,0.15)]"
                >
                  Concluir Triagem
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 cursor-zoom-out select-none"
        >
          <img src={lightboxImage} alt="Fullscreen screenshot" className="max-w-full max-h-full object-contain rounded border border-zinc-850 shadow-2xl" />
        </div>
      )}
    </div>
  );
}
