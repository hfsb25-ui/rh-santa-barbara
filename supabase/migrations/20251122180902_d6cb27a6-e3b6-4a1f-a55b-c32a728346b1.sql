-- Criar enum para tipos de exame médico
CREATE TYPE public.tipo_exame_medico AS ENUM (
  'admissional',
  'demissional',
  'periodico',
  'mudanca_riscos',
  'retorno_trabalho'
);

-- Criar enum para status de encaminhamento
CREATE TYPE public.status_encaminhamento AS ENUM (
  'pendente',
  'agendado',
  'realizado',
  'cancelado'
);

-- Criar tabela de encaminhamentos médicos
CREATE TABLE public.encaminhamentos_medicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Dados do exame
  tipo_exame tipo_exame_medico NOT NULL,
  data_encaminhamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_agendamento DATE,
  data_realizacao DATE,
  
  -- Informações ocupacionais (serão copiadas do employee no momento do encaminhamento)
  funcao TEXT NOT NULL,
  cbo TEXT,
  setor TEXT,
  matricula_esocial TEXT,
  descricao_atividade TEXT,
  
  -- Condições especiais
  beneficiario_reabilitado BOOLEAN NOT NULL DEFAULT false,
  portador_deficiencia BOOLEAN NOT NULL DEFAULT false,
  trabalho_altura BOOLEAN NOT NULL DEFAULT false,
  espaco_confinado BOOLEAN NOT NULL DEFAULT false,
  
  -- Status e controle
  status status_encaminhamento NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  resultado_exame TEXT,
  apto_trabalho BOOLEAN,
  
  -- Auditoria
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.encaminhamentos_medicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Gestores podem gerenciar todos os encaminhamentos"
ON public.encaminhamentos_medicos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionários podem ver próprios encaminhamentos"
ON public.encaminhamentos_medicos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = encaminhamentos_medicos.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_encaminhamentos_medicos_updated_at
BEFORE UPDATE ON public.encaminhamentos_medicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_encaminhamentos_employee_id ON public.encaminhamentos_medicos(employee_id);
CREATE INDEX idx_encaminhamentos_empresa_id ON public.encaminhamentos_medicos(empresa_id);
CREATE INDEX idx_encaminhamentos_status ON public.encaminhamentos_medicos(status);
CREATE INDEX idx_encaminhamentos_data_agendamento ON public.encaminhamentos_medicos(data_agendamento);
CREATE INDEX idx_encaminhamentos_tipo_exame ON public.encaminhamentos_medicos(tipo_exame);