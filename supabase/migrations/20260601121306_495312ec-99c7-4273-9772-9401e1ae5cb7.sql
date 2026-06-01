
CREATE TABLE public.drive_backup_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT false,
  pasta_raiz_id TEXT,
  pasta_raiz_nome TEXT NOT NULL DEFAULT 'RH Santa Bárbara - Backup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drive_backup_config_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.drive_backup_config TO authenticated;
GRANT ALL ON public.drive_backup_config TO service_role;
ALTER TABLE public.drive_backup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores podem ver config drive" ON public.drive_backup_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestores podem inserir config drive" ON public.drive_backup_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestores podem atualizar config drive" ON public.drive_backup_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'gestor'));

CREATE TABLE public.drive_folder_cache (
  caminho TEXT PRIMARY KEY,
  drive_folder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.drive_folder_cache TO authenticated;
GRANT ALL ON public.drive_folder_cache TO service_role;
ALTER TABLE public.drive_folder_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores acessam cache pastas" ON public.drive_folder_cache FOR ALL TO authenticated USING (public.has_role(auth.uid(),'gestor')) WITH CHECK (public.has_role(auth.uid(),'gestor'));

CREATE TABLE public.drive_backup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  employee_id UUID,
  drive_file_id TEXT,
  drive_url TEXT,
  status TEXT NOT NULL DEFAULT 'sucesso',
  erro_mensagem TEXT,
  tamanho_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_drive_backup_log_created ON public.drive_backup_log(created_at DESC);
CREATE INDEX idx_drive_backup_log_tipo ON public.drive_backup_log(tipo);
GRANT SELECT, INSERT ON public.drive_backup_log TO authenticated;
GRANT ALL ON public.drive_backup_log TO service_role;
ALTER TABLE public.drive_backup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores veem log drive" ON public.drive_backup_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Autenticados inserem log drive" ON public.drive_backup_log FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.drive_backup_config (id, ativo) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
