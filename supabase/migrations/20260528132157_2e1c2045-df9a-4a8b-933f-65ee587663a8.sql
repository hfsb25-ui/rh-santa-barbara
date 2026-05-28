
-- ============ DENUNCIAS ============
CREATE TABLE public.nr1_denuncias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  categoria text NOT NULL,
  descricao text NOT NULL,
  setor text,
  empresa_id uuid,
  classificacao_gravidade text DEFAULT 'media',
  status text NOT NULL DEFAULT 'recebida',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.nr1_denuncias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_denuncias TO authenticated;
GRANT ALL ON public.nr1_denuncias TO service_role;

ALTER TABLE public.nr1_denuncias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit denuncias" ON public.nr1_denuncias
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Gestors manage denuncias" ON public.nr1_denuncias
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial manage denuncias" ON public.nr1_denuncias
  FOR ALL USING (has_role(auth.uid(), 'admin_parcial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ DENUNCIAS ANEXOS ============
CREATE TABLE public.nr1_denuncias_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.nr1_denuncias(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.nr1_denuncias_anexos TO anon;
GRANT SELECT, INSERT, DELETE ON public.nr1_denuncias_anexos TO authenticated;
GRANT ALL ON public.nr1_denuncias_anexos TO service_role;

ALTER TABLE public.nr1_denuncias_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can add anexos" ON public.nr1_denuncias_anexos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Gestors manage anexos" ON public.nr1_denuncias_anexos
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial manage anexos" ON public.nr1_denuncias_anexos
  FOR ALL USING (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ APURACAO ============
CREATE TABLE public.nr1_denuncias_apuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.nr1_denuncias(id) ON DELETE CASCADE,
  registrado_por uuid,
  nota text NOT NULL,
  evidencia_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_denuncias_apuracao TO authenticated;
GRANT ALL ON public.nr1_denuncias_apuracao TO service_role;

ALTER TABLE public.nr1_denuncias_apuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors manage apuracao" ON public.nr1_denuncias_apuracao
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial manage apuracao" ON public.nr1_denuncias_apuracao
  FOR ALL USING (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ PESQUISAS CLIMA ============
CREATE TABLE public.nr1_pesquisas_clima (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'rascunho',
  setor_id uuid,
  empresa_id uuid,
  data_inicio date,
  data_fim date,
  perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nr1_pesquisas_clima TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_pesquisas_clima TO authenticated;
GRANT ALL ON public.nr1_pesquisas_clima TO service_role;

ALTER TABLE public.nr1_pesquisas_clima ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pesquisas" ON public.nr1_pesquisas_clima
  FOR SELECT TO anon, authenticated USING (status = 'ativa');

CREATE POLICY "Gestors manage pesquisas" ON public.nr1_pesquisas_clima
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial manage pesquisas" ON public.nr1_pesquisas_clima
  FOR ALL USING (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ CLIMA RESPOSTAS ============
CREATE TABLE public.nr1_clima_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.nr1_pesquisas_clima(id) ON DELETE CASCADE,
  setor text,
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.nr1_clima_respostas TO anon;
GRANT SELECT, INSERT ON public.nr1_clima_respostas TO authenticated;
GRANT ALL ON public.nr1_clima_respostas TO service_role;

ALTER TABLE public.nr1_clima_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit respostas" ON public.nr1_clima_respostas
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Gestors view respostas" ON public.nr1_clima_respostas
  FOR SELECT USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial view respostas" ON public.nr1_clima_respostas
  FOR SELECT USING (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ PESQUISA TOKENS ============
CREATE TABLE public.nr1_pesquisa_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.nr1_pesquisas_clima(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  usado boolean NOT NULL DEFAULT false,
  usado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.nr1_pesquisa_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_pesquisa_tokens TO authenticated;
GRANT ALL ON public.nr1_pesquisa_tokens TO service_role;

ALTER TABLE public.nr1_pesquisa_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tokens for validation" ON public.nr1_pesquisa_tokens
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can mark token used" ON public.nr1_pesquisa_tokens
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Gestors manage tokens" ON public.nr1_pesquisa_tokens
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin parcial manage tokens" ON public.nr1_pesquisa_tokens
  FOR ALL USING (has_role(auth.uid(), 'admin_parcial'::app_role));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('nr1-denuncias', 'nr1-denuncias', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload nr1 denuncia files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'nr1-denuncias');

CREATE POLICY "Gestors view nr1 denuncia files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'nr1-denuncias' AND (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin_parcial'::app_role)));

CREATE POLICY "Gestors delete nr1 denuncia files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'nr1-denuncias' AND (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin_parcial'::app_role)));

-- ============ TRIGGERS UPDATED_AT ============
CREATE TRIGGER trg_nr1_denuncias_updated BEFORE UPDATE ON public.nr1_denuncias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_nr1_pesquisas_updated BEFORE UPDATE ON public.nr1_pesquisas_clima
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
