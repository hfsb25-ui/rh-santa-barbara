
-- =========================================
-- NR-1 FASES 2 e 3
-- =========================================

-- Gestão de Riscos Psicossociais
CREATE TABLE public.nr1_riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid,
  empresa_id uuid,
  categoria text NOT NULL,
  descricao text NOT NULL,
  probabilidade integer NOT NULL DEFAULT 1,
  severidade integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'identificado',
  plano_acao text,
  responsavel_employee_id uuid,
  data_identificacao date NOT NULL DEFAULT CURRENT_DATE,
  data_revisao date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_riscos TO authenticated;
GRANT ALL ON public.nr1_riscos TO service_role;
ALTER TABLE public.nr1_riscos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_riscos" ON public.nr1_riscos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));

-- Avaliação de Liderança (100% anônima)
CREATE TABLE public.nr1_lideranca_pesquisas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  lider_employee_id uuid NOT NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  ativa boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_lideranca_pesquisas TO authenticated;
GRANT ALL ON public.nr1_lideranca_pesquisas TO service_role;
ALTER TABLE public.nr1_lideranca_pesquisas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_lideranca_pesquisas" ON public.nr1_lideranca_pesquisas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));

CREATE TABLE public.nr1_lideranca_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.nr1_lideranca_pesquisas(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  usado boolean NOT NULL DEFAULT false,
  usado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nr1_lideranca_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_lideranca_tokens TO authenticated;
GRANT ALL ON public.nr1_lideranca_tokens TO service_role;
ALTER TABLE public.nr1_lideranca_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_lideranca_tokens" ON public.nr1_lideranca_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));
CREATE POLICY "Anyone can validate token" ON public.nr1_lideranca_tokens FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can mark token used" ON public.nr1_lideranca_tokens FOR UPDATE TO anon USING (usado = false) WITH CHECK (usado = true);

CREATE TABLE public.nr1_lideranca_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.nr1_lideranca_pesquisas(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.nr1_lideranca_respostas TO anon;
GRANT SELECT, INSERT, DELETE ON public.nr1_lideranca_respostas TO authenticated;
GRANT ALL ON public.nr1_lideranca_respostas TO service_role;
ALTER TABLE public.nr1_lideranca_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors view nr1_lideranca_respostas" ON public.nr1_lideranca_respostas FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));
CREATE POLICY "Gestors delete nr1_lideranca_respostas" ON public.nr1_lideranca_respostas FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));
CREATE POLICY "Anyone can submit nr1_lideranca_respostas" ON public.nr1_lideranca_respostas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth users can submit nr1_lideranca_respostas" ON public.nr1_lideranca_respostas FOR INSERT TO authenticated WITH CHECK (true);

-- Treinamentos NR-1
CREATE TABLE public.nr1_treinamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'geral',
  carga_horaria integer DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT false,
  reciclagem_meses integer,
  conteudo_url text,
  youtube_video_id text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_treinamentos TO authenticated;
GRANT ALL ON public.nr1_treinamentos TO service_role;
ALTER TABLE public.nr1_treinamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_treinamentos" ON public.nr1_treinamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));
CREATE POLICY "Funcionarios view active nr1_treinamentos" ON public.nr1_treinamentos FOR SELECT TO authenticated USING (ativo = true);

CREATE TABLE public.nr1_treinamento_conclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.nr1_treinamentos(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  data_conclusao timestamptz NOT NULL DEFAULT now(),
  nota numeric,
  certificado_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(treinamento_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_treinamento_conclusoes TO authenticated;
GRANT ALL ON public.nr1_treinamento_conclusoes TO service_role;
ALTER TABLE public.nr1_treinamento_conclusoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_treinamento_conclusoes" ON public.nr1_treinamento_conclusoes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));
CREATE POLICY "Funcionarios view own nr1_treinamento_conclusoes" ON public.nr1_treinamento_conclusoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM employees WHERE employees.id = nr1_treinamento_conclusoes.employee_id AND employees.user_id = auth.uid()));

-- Ações Preventivas
CREATE TABLE public.nr1_acoes_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  responsavel_employee_id uuid,
  prazo date,
  status text NOT NULL DEFAULT 'pendente',
  prioridade text NOT NULL DEFAULT 'media',
  origem text,
  origem_id uuid,
  setor_id uuid,
  evidencia_url text,
  data_conclusao date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_acoes_preventivas TO authenticated;
GRANT ALL ON public.nr1_acoes_preventivas TO service_role;
ALTER TABLE public.nr1_acoes_preventivas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_acoes" ON public.nr1_acoes_preventivas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));

-- Configurações NR-1 (singleton)
CREATE TABLE public.nr1_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_denuncias_qtd integer NOT NULL DEFAULT 5,
  clima_score_minimo numeric NOT NULL DEFAULT 6.0,
  alerta_lideranca_score numeric NOT NULL DEFAULT 5.0,
  reciclagem_padrao_meses integer NOT NULL DEFAULT 12,
  observacoes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_config TO authenticated;
GRANT ALL ON public.nr1_config TO service_role;
ALTER TABLE public.nr1_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors manage nr1_config" ON public.nr1_config FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'))
  WITH CHECK (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'admin_parcial'));

INSERT INTO public.nr1_config DEFAULT VALUES;

-- Triggers updated_at
CREATE TRIGGER nr1_riscos_updated BEFORE UPDATE ON public.nr1_riscos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nr1_lideranca_pesquisas_updated BEFORE UPDATE ON public.nr1_lideranca_pesquisas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nr1_treinamentos_updated BEFORE UPDATE ON public.nr1_treinamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nr1_acoes_updated BEFORE UPDATE ON public.nr1_acoes_preventivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nr1_config_updated BEFORE UPDATE ON public.nr1_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
