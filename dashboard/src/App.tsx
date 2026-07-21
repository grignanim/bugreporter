import { useState, useEffect } from 'react';
import ClientPortal from './components/ClientPortal';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
  };

  // Determine which page to render
  if (path.startsWith('/c/')) {
    const slug = path.split('/')[2];
    if (!slug) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-black">
          <h1 className="text-2xl font-bold text-destructive">Erro: Slug de Empresa Inválido</h1>
          <p className="text-muted-foreground mt-2">Por favor, acesse o link correto fornecido pela PIXELOGIC.</p>
        </div>
      );
    }
    return <ClientPortal companySlug={slug} />;
  }

  if (path === '/admin') {
    return <AdminDashboard navigate={navigate} />;
  }

  // Default page (root path)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-black p-6">
      <div className="max-w-md w-full glass-card p-8 rounded-xl border border-zinc-800">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
          Portal de <span className="text-primary">apontamentos;</span>
        </h1>
        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
          Plataforma para reporte de bugs e melhorias. Se você é um cliente, utilize a URL exclusiva fornecida para a sua empresa.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-3 px-4 rounded-md transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(132,204,22,0.15)] hover:shadow-[0_0_25px_rgba(132,204,22,0.3)]"
        >
          Acessar Painel da PIXELOGIC (Admin)
        </button>
      </div>
    </div>
  );
}

export default App;
