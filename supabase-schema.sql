-- =========================================================
-- PIXELOGIC Bug Report Portal - Supabase Schema
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- (supabase.com → Seu Projeto → SQL Editor → New Query)
-- =========================================================

-- Tabela de configurações (senha admin)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  admin_password TEXT NOT NULL DEFAULT '250891',
  CHECK (id = 1)  -- garante que só exista uma linha
);

-- Seed inicial de configurações
INSERT INTO settings (id, admin_password)
VALUES (1, '250891')
ON CONFLICT (id) DO NOTHING;

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '123',
  members TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed inicial de empresas (opcional - ajuste conforme necessário)
INSERT INTO companies (id, name, slug, password, members) VALUES
  ('company-freteclick', 'Frete Click', 'freteclick', 'fr3tecl1ck', ARRAY['Monalisa', 'Ricardo', 'Mariano', 'Elba', 'Ellen', 'Marcos', 'Leonardo']),
  ('company-calvinklein', 'Calvin Klein', 'calvinklein', 'ck2026', ARRAY['Rodrigo Costa', 'Juliana Lins', 'Felipe Santos']),
  ('company-portus', 'Portus', 'portus', 'portus123', ARRAY['Marcos Silva', 'Patricia Lima', 'Gabriel Souza'])
ON CONFLICT (id) DO NOTHING;

-- Tabela de apontamentos/reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'closed')),
  reporter TEXT NOT NULL,
  url TEXT DEFAULT '',
  attachment_url TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas por empresa (melhora performance)
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Row Level Security (RLS) - desabilitado pois o backend usa service_role_key
-- O service_role_key ignora RLS, o que é o comportamento correto para um backend server-side.
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
