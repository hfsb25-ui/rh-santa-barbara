-- Criar ENUM para status de vagas
CREATE TYPE public.vaga_status AS ENUM ('aberta', 'pausada', 'fechada');

-- Criar ENUM para status de candidaturas
CREATE TYPE public.candidatura_status AS ENUM ('nova', 'em_analise', 'entrevista_agendada', 'aprovada', 'reprovada', 'contratada');

-- Tabela de vagas
CREATE TABLE public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  funcao_id UUID REFERENCES public.funcoes(id) ON DELETE SET NULL,
  tipo_contrato tipo_contrato NOT NULL,
  tipo_salario tipo_salario NOT NULL,
  salario NUMERIC,
  exibir_salario BOOLEAN DEFAULT false,
  quantidade_vagas INTEGER DEFAULT 1,
  requisitos TEXT NOT NULL,
  beneficios TEXT,
  status vaga_status DEFAULT 'aberta',
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fechamento DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de candidaturas
CREATE TABLE public.candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  endereco TEXT,
  curriculum_url TEXT,
  carta_apresentacao TEXT,
  experiencia_resumo TEXT,
  status candidatura_status DEFAULT 'nova',
  data_candidatura TIMESTAMP WITH TIME ZONE DEFAULT now(),
  avaliacao_gestor TEXT,
  nota_avaliacao INTEGER CHECK (nota_avaliacao >= 1 AND nota_avaliacao <= 5),
  data_entrevista TIMESTAMP WITH TIME ZONE,
  avaliado_por UUID REFERENCES public.profiles(id),
  data_avaliacao TIMESTAMP WITH TIME ZONE,
  motivo_reprovacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de status
CREATE TABLE public.historico_status_candidatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  status_anterior candidatura_status,
  status_novo candidatura_status NOT NULL,
  observacao TEXT,
  alterado_por UUID REFERENCES public.profiles(id),
  alterado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_vagas_status ON public.vagas(status);
CREATE INDEX idx_vagas_empresa ON public.vagas(empresa_id);
CREATE INDEX idx_candidaturas_vaga ON public.candidaturas(vaga_id);
CREATE INDEX idx_candidaturas_status ON public.candidaturas(status);
CREATE INDEX idx_historico_candidatura ON public.historico_status_candidatura(candidatura_id);

-- Trigger para updated_at em vagas
CREATE TRIGGER update_vagas_updated_at
  BEFORE UPDATE ON public.vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em candidaturas
CREATE TRIGGER update_candidaturas_updated_at
  BEFORE UPDATE ON public.candidaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function para registrar histórico de status
CREATE OR REPLACE FUNCTION public.registrar_historico_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.historico_status_candidatura (
      candidatura_id,
      status_anterior,
      status_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para histórico de status
CREATE TRIGGER historico_status_candidatura_trigger
  AFTER UPDATE OF status ON public.candidaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_historico_status();

-- RLS Policies para vagas
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;

-- Público pode ver vagas abertas
CREATE POLICY "Vagas abertas são públicas"
  ON public.vagas
  FOR SELECT
  USING (status = 'aberta');

-- Gestores podem gerenciar todas as vagas
CREATE POLICY "Gestores podem gerenciar vagas"
  ON public.vagas
  FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies para candidaturas
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- Público pode inserir candidaturas (sem autenticação)
CREATE POLICY "Qualquer pessoa pode candidatar"
  ON public.candidaturas
  FOR INSERT
  WITH CHECK (true);

-- Gestores podem ver e editar todas as candidaturas
CREATE POLICY "Gestores podem gerenciar candidaturas"
  ON public.candidaturas
  FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies para histórico
ALTER TABLE public.historico_status_candidatura ENABLE ROW LEVEL SECURITY;

-- Gestores podem ver histórico
CREATE POLICY "Gestores podem ver histórico"
  ON public.historico_status_candidatura
  FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

-- Inserção automática via trigger
CREATE POLICY "Sistema pode inserir histórico"
  ON public.historico_status_candidatura
  FOR INSERT
  WITH CHECK (true);

-- Criar bucket de storage para currículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculos', 'curriculos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para currículos
CREATE POLICY "Público pode fazer upload de currículos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'curriculos');

CREATE POLICY "Gestores podem acessar currículos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'curriculos' AND public.has_role(auth.uid(), 'gestor'));