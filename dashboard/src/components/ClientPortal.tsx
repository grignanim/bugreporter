import { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  User, 
  Plus, 
  LogOut, 
  ExternalLink, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Share2,
  Check
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import type { Company, Report, Priority } from '../types';

interface ClientPortalProps {
  companySlug: string;
}

export default function ClientPortal({ companySlug }: ClientPortalProps) {
  // Navigation & Authentication states
  const [step, setStep] = useState<'loading' | 'error' | 'password' | 'user_select' | 'dashboard'>('loading');
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  
  // UI states
  const [authError, setAuthError] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // New Report Form states
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [reportPriority, setReportPriority] = useState<Priority>('medium');
  const [reportPortal, setReportPortal] = useState<string>('');
  const [correlationId, setCorrelationId] = useState<string>('');
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [saveCredentials, setSaveCredentials] = useState<boolean>(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [pasteInstructionVisible, setPasteInstructionVisible] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // LocalStorage keys specific to this company slug
  const PASS_KEY = `bugreport_pass_${companySlug}`;
  const USER_KEY = `bugreport_user_${companySlug}`;
  const LOGIN_USER_KEY = `bugreport_login_user_${companySlug}`;
  const LOGIN_PASS_KEY = `bugreport_login_pass_${companySlug}`;
  const SAVE_CREDS_KEY = `bugreport_save_creds_${companySlug}`;

  // Fetch company info on mount
  useEffect(() => {
    fetchCompanyData();
  }, [companySlug]);

  // Auto-expand report from URL param ?report=ID after dashboard is loaded
  useEffect(() => {
    if (step !== 'dashboard' || reports.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    if (!reportId) return;
    const exists = reports.some((r) => r.id === reportId);
    if (!exists) return;
    setExpandedReportId(reportId);
    // Scroll to the report card after a short delay to ensure it's rendered
    setTimeout(() => {
      const el = document.getElementById(`report-${reportId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [step, reports]);

  const fetchCompanyData = async () => {
    try {
      setStep('loading');
      // Fetch company members and name (public API)
      const res = await fetch(`/api/companies/${companySlug}`);
      if (!res.ok) {
        throw new Error('Empresa não encontrada');
      }
      const data = await res.json();
      setCompany(data);

      // Check if user has saved credentials
      const savedSaveCreds = localStorage.getItem(SAVE_CREDS_KEY) === 'true';
      if (savedSaveCreds) {
        setSaveCredentials(true);
        const savedLoginUser = localStorage.getItem(LOGIN_USER_KEY);
        const savedLoginPass = localStorage.getItem(LOGIN_PASS_KEY);
        if (savedLoginUser) setLoginUser(savedLoginUser);
        if (savedLoginPass) setLoginPassword(savedLoginPass);
      }

      // Check saved credentials
      const savedPass = localStorage.getItem(PASS_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedPass) {
        setPassword(savedPass);
        // Verify saved password is still valid and fetch reports
        const valid = await verifyPasswordAndLoad(savedPass);
        if (valid) {
          if (savedUser && data.members.includes(savedUser)) {
            setSelectedUser(savedUser);
            setStep('dashboard');
          } else {
            setStep('user_select');
          }
          return;
        }
      }
      
      setStep('password');
    } catch (err) {
      console.error(err);
      setStep('error');
    }
  };

  const verifyPasswordAndLoad = async (pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: companySlug, password: pass })
      });
      
      if (res.ok) {
        // Fetch reports
        const reportsRes = await fetch(`/api/companies/${companySlug}/reports`, {
          headers: { 'x-client-password': pass }
        });
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setReports(reportsData);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoadingAction(true);

    try {
      const res = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: companySlug, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Senha inválida.');
      }

      // Password valid, save it
      localStorage.setItem(PASS_KEY, password);
      
      // Load reports
      const reportsRes = await fetch(`/api/companies/${companySlug}/reports`, {
        headers: { 'x-client-password': password }
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }

      setStep('user_select');
    } catch (err: any) {
      setAuthError(err.message || 'Senha incorreta.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUserSelect = (user: string) => {
    setSelectedUser(user);
    localStorage.setItem(USER_KEY, user);
    setStep('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem(PASS_KEY);
    localStorage.removeItem(USER_KEY);
    setSelectedUser('');
    setPassword('');
    setReports([]);
    setStep('password');
  };

  const handleRefreshReports = async () => {
    if (!company) return;
    try {
      const reportsRes = await fetch(`/api/companies/${companySlug}/reports`, {
        headers: { 'x-client-password': password }
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
    } catch (err) {
      console.error('Erro ao atualizar relatórios:', err);
    }
  };

  // Clipboard Paste (Ctrl+V) handler for screenshot
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isReportModalOpen) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageAttachment(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isReportModalOpen]);

  const handleImageAttachment = (file: File) => {
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setScreenshotBase64(base64);
      setScreenshotPreview(base64);
      setPasteInstructionVisible(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageAttachment(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageAttachment(files[0]);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotBase64('');
    setScreenshotPreview('');
    setPasteInstructionVisible(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportDesc.trim()) return;
    
    setLoadingAction(true);
    
    try {
      const formData = new FormData();
      formData.append('companyId', company?.id || '');
      formData.append('title', reportTitle);
      formData.append('description', reportDesc);
      formData.append('priority', reportPriority);
      formData.append('reporter', selectedUser);
      formData.append('url', reportUrl);
      if (reportPortal) formData.append('portal', reportPortal);
      if (correlationId) formData.append('correlationId', correlationId);
      if (loginUser) formData.append('loginUser', loginUser);
      if (loginPassword) formData.append('loginPassword', loginPassword);
      
      if (screenshotFile) {
        formData.append('file', screenshotFile);
      } else if (screenshotBase64) {
        formData.append('screenshotBase64', screenshotBase64);
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData // Multipar/form-data
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar o apontamento.');
      }

      // Save or clear credentials in local storage
      if (saveCredentials) {
        localStorage.setItem(LOGIN_USER_KEY, loginUser);
        localStorage.setItem(LOGIN_PASS_KEY, loginPassword);
        localStorage.setItem(SAVE_CREDS_KEY, 'true');
      } else {
        localStorage.removeItem(LOGIN_USER_KEY);
        localStorage.removeItem(LOGIN_PASS_KEY);
        localStorage.setItem(SAVE_CREDS_KEY, 'false');
      }

      setSubmitSuccess(true);
      await handleRefreshReports();
      
      // Reset form
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportTitle('');
        setReportDesc('');
        setReportUrl('');
        setReportPriority('medium');
        setReportPortal('');
        setCorrelationId('');
        if (!saveCredentials) {
          setLoginUser('');
          setLoginPassword('');
        }
        handleRemoveScreenshot();
        setSubmitSuccess(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao enviar o relatório de bug. Tente novamente.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleShareReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/c/${companySlug}?report=${reportId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(reportId);
      setTimeout(() => setCopiedId(null), 2500);
    });
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

  const getPriorityBadgeColor = (prio: Priority) => {
    switch (prio) {
      case 'high': return 'bg-red-950/40 text-red-500 border-red-900/50';
      case 'medium': return 'bg-amber-950/40 text-amber-500 border-amber-900/50';
      case 'low': return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const getStatusLabelAndColor = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Aguardando', color: 'bg-zinc-900 text-zinc-300 border-zinc-800' };
      case 'investigating': return { label: 'Em Análise', color: 'bg-primary/10 text-primary border-primary/20' };
      case 'resolved': return { label: 'Resolvido', color: 'bg-primary/20 text-primary border-primary/40' };
      case 'closed': return { label: 'Finalizado', color: 'bg-zinc-900 text-zinc-500 border-zinc-800 line-through' };
      default: return { label: status, color: 'bg-zinc-900 text-zinc-400 border-zinc-800' };
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-500 text-sm mt-4 font-mono">carregando portal...</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-black p-6">
        <div className="max-w-md w-full glass-panel p-8 rounded-xl border border-zinc-800">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Erro de Acesso</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            O link acessado é inválido ou a empresa não está cadastrada em nossa base. Por favor, solicite o link correto à equipe da agência.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 px-4 rounded-md transition-all cursor-pointer border border-zinc-800"
          >
            Ir para Home
          </button>
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
        <div className="max-w-md w-full glass-panel p-8 rounded-xl relative overflow-hidden">
          {/* Subtle lime glow in background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Portal do Cliente</h1>
            <p className="text-zinc-500 text-sm mt-1">Acesso para a empresa <span className="text-white font-semibold">{company?.name}</span></p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2 font-mono">Senha de Acesso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha fornecida"
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
              {loadingAction ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Desbloquear Portal'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'user_select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
        <div className="max-w-xl w-full glass-panel p-8 rounded-xl relative">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quem está reportando?</h1>
            <p className="text-zinc-500 text-sm mt-1">Selecione seu nome para acessar o painel da <span className="text-white font-semibold">{company?.name}</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
            {company?.members && company.members.length > 0 ? (
              company.members.map((member) => (
                <button
                  key={member}
                  onClick={() => handleUserSelect(member)}
                  className="flex items-center gap-3 p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-primary/60 text-white text-left transition-all hover:bg-zinc-900 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                    <User className="w-4 h-4 text-zinc-500 group-hover:text-primary-foreground transition-all" />
                  </div>
                  <span className="font-medium group-hover:text-primary transition-all text-sm">{member}</span>
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 text-zinc-600 text-sm">
                Nenhum membro cadastrado para esta empresa. Contate o administrador.
              </div>
            )}
          </div>
          
          <div className="mt-8 border-t border-zinc-900 pt-4 flex justify-between items-center text-xs">
            <button 
              onClick={() => setStep('password')}
              className="text-zinc-500 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            >
              ← Voltar
            </button>
            <span className="text-zinc-600 font-mono">empresa: {company?.slug}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-mono text-xl font-bold tracking-tight">
              {company?.name} <span className="text-primary font-normal">/portal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-zinc-300 font-medium">{selectedUser}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white bg-transparent hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 px-3 py-1.5 rounded-md transition-all cursor-pointer"
              title="Trocar de Usuário / Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col">
        
        {/* Intro Dashboard Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Apontamentos Reportados</h1>
            <p className="text-zinc-500 text-sm mt-1">Acompanhe o andamento das correções solicitadas por sua equipe.</p>
          </div>
          
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="self-start md:self-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-3 rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(132,204,22,0.15)] hover:shadow-[0_0_25px_rgba(132,204,22,0.3)] text-sm"
          >
            <Plus className="w-4 h-4" />
            Reportar Novo Item
          </button>
        </div>

        {/* Reports Feed */}
        <div className="flex-1 flex flex-col gap-4">
          {reports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 glass-card rounded-xl border border-zinc-900 my-4 min-h-[300px]">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Tudo limpo!</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                Nenhum bug ou apontamento registrado por sua empresa até o momento. Use o botão acima se encontrar algum problema!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const isExpanded = expandedReportId === report.id;
                const statusInfo = getStatusLabelAndColor(report.status);
                
                return (
                  <div 
                    key={report.id}
                    id={`report-${report.id}`}
                    className="glass-card rounded-xl overflow-hidden border border-zinc-900 transition-all duration-200"
                  >
                    {/* Card Header (Always Visible) */}
                    <div 
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                      className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-zinc-950/20 transition-all select-none"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadgeColor(report.priority)}`}>
                            {report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-zinc-600 text-xs font-mono hidden sm:inline">#{report.id.slice(-5)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{report.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {report.reporter}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(report.createdAt)}
                          </span>
                          {report.url && (
                            <span className="flex items-center gap-1 text-zinc-500 truncate max-w-[200px] sm:max-w-xs" title={report.url}>
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                              <span className="truncate">{report.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Share Button */}
                        <button
                          onClick={(e) => handleShareReport(report.id, e)}
                          title="Copiar link para compartilhar"
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition-all cursor-pointer ${
                            copiedId === report.id
                              ? 'bg-primary/15 text-primary border-primary/40'
                              : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {copiedId === report.id ? (
                            <><Check className="w-3.5 h-3.5" /> Copiado!</>
                          ) : (
                            <><Share2 className="w-3.5 h-3.5" /> Compartilhar</>
                          )}
                        </button>

                        <div className="text-zinc-500 hover:text-white p-1 rounded bg-zinc-900 border border-zinc-800">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Card Expanded Content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-zinc-900/60 bg-zinc-950/30 space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Descrição do Problema</h4>
                          <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{report.description}</p>
                        </div>

                        {report.url && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Link Relacionado</h4>
                            <a 
                              href={report.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs flex items-center gap-1.5 self-start w-fit bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded"
                            >
                              Abrir na Plataforma <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {report.attachmentUrl && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Print Anexo</h4>
                            <div className="relative group max-w-sm rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer" onClick={() => setLightboxImage(`${report.attachmentUrl}`)}>
                              <img 
                                src={`${report.attachmentUrl}`} 
                                alt="Screenshot do bug" 
                                className="max-h-48 w-full object-cover group-hover:scale-[1.02] transition-all"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-xs font-medium gap-1 text-white">
                                <ImageIcon className="w-4 h-4" /> Clique para ampliar
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Extra fields: portal, correlation ID, and hidden login details notice */}
                        {(report.portal || report.correlationId || report.hasLoginDetails) && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-900/60">
                            {report.portal && (
                              <div className="space-y-0.5">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Portal</h4>
                                <p className="text-zinc-300 text-xs font-semibold">{report.portal}</p>
                              </div>
                            )}
                            {report.correlationId && (
                              <div className="space-y-0.5">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">ID de Correlação</h4>
                                <p className="text-zinc-300 text-xs font-mono">{report.correlationId}</p>
                              </div>
                            )}
                            {report.hasLoginDetails && (
                              <div className="space-y-0.5 sm:col-span-2 flex items-center gap-1.5 text-zinc-400">
                                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-xs font-medium font-sans">
                                  Credenciais enviadas (visíveis apenas para o admin)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-950 bg-black py-6 mt-12 text-center text-xs text-zinc-600 font-mono">
        &copy; 2026 PIXELOGIC. Todos os direitos reservados.
      </footer>

      {/* Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={(open: boolean) => { if (!loadingAction) setIsReportModalOpen(open); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-primary">Novo</span> Apontamento
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">
              Preencha os dados do problema. Você pode colar capturas de tela direto da área de transferência (Ctrl+V).
            </DialogDescription>
          </DialogHeader>

          {submitSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white">Reportado com sucesso!</h3>
              <p className="text-zinc-500 text-sm">O chamado foi cadastrado e sua equipe já pode visualizá-lo.</p>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="space-y-5 pt-2">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Título Curto</label>
                <input
                  type="text"
                  placeholder="Ex: Erro ao finalizar boleto no checkout"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Descrição / Passos para Reproduzir</label>
                <textarea
                  placeholder="Descreva o que aconteceu, o que era esperado e como simular o erro."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all min-h-[100px] resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Portal (only for freteclick) */}
                {companySlug === 'freteclick' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Portal</label>
                    <select
                      value={reportPortal}
                      onChange={(e) => setReportPortal(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      required
                    >
                      <option value="">Selecione o portal...</option>
                      <option value="Admin">Admin</option>
                      <option value="HUB">HUB</option>
                      <option value="CotaFácil">CotaFácil</option>
                    </select>
                  </div>
                )}

                {/* Related URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">URL Relacionada (Link)</label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/checkout"
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Prioridade / Severidade</label>
                  <select
                    value={reportPriority}
                    onChange={(e) => setReportPriority(e.target.value as Priority)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="low">Baixa (Dúvida, sugestão ou ajuste estético)</option>
                    <option value="medium">Média (Funcionamento incorreto mas contornável)</option>
                    <option value="high">Alta (Bloqueia o uso da plataforma ou causa erro crítico)</option>
                  </select>
                </div>
              </div>

              {/* Login User + Login Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">ID de Correlação</label>
                  <input
                    type="text"
                    placeholder="Ex: abc123-def456"
                    value={correlationId}
                    onChange={(e) => setCorrelationId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Usuário logado</label>
                  <input
                    type="text"
                    placeholder="Ex: usuario@email.com"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Senha utilizada</label>
                  <input
                    type="text"
                    placeholder="Ex: minhasenha123"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2.5 px-3.5 text-white placeholder-zinc-700 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              {/* Save credentials checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="saveCredentials"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary focus:ring-offset-black cursor-pointer"
                />
                <label htmlFor="saveCredentials" className="text-xs text-zinc-400 select-none cursor-pointer hover:text-zinc-300 transition-colors">
                  Salvar informações de usuário e senha nesta máquina
                </label>
              </div>

              <p className="text-xs text-zinc-450 flex items-center gap-1 mt-1 font-sans">
                🔒 Estas credenciais serão visíveis apenas para a equipe administrativa e ficarão ocultas para outros usuários no portal do cliente.
              </p>

              {/* Drag/Drop and Paste zone for Screenshot */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">Captura de Tela (Print Opcional)</label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-lg p-5 text-center transition-all ${
                    screenshotPreview 
                      ? 'border-primary/40 bg-zinc-900/40' 
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/10'
                  }`}
                >
                  {screenshotPreview ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-16 h-12 rounded border border-zinc-800 overflow-hidden bg-black flex-shrink-0">
                          <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white truncate max-w-[200px]">
                            {screenshotFile ? screenshotFile.name : 'Imagem da área de transferência'}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">Pronto para envio</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="text-zinc-400 hover:text-red-500 p-1.5 rounded hover:bg-zinc-800 transition-all cursor-pointer"
                        title="Remover print"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-xs text-zinc-400">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Selecione um arquivo
                        </button>
                        <span> ou arraste-o aqui</span>
                      </div>
                      {pasteInstructionVisible && (
                        <p className="text-[10px] text-zinc-600 font-mono">
                          DICA: Aperte <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 text-[9px]">Ctrl + V</kbd> em qualquer lugar do formulário para colar um print
                        </p>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-zinc-900 gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
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
                  {loadingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Apontamento'
                  )}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 cursor-zoom-out select-none animate-fade-in"
        >
          <img src={lightboxImage} alt="Fullscreen screenshot" className="max-w-full max-h-full object-contain rounded border border-zinc-800 shadow-2xl" />
        </div>
      )}
    </div>
  );
}
