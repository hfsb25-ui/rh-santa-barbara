-- Create enum for checklist type
CREATE TYPE public.tipo_checklist AS ENUM ('admissao', 'desligamento');

-- Create enum for checklist status
CREATE TYPE public.status_checklist AS ENUM ('em_andamento', 'concluido', 'cancelado');

-- Table for checklist templates
CREATE TABLE public.plano_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo tipo_checklist NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  funcao_id UUID REFERENCES public.funcoes(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for template items
CREATE TABLE public.plano_checklist_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.plano_checklist_templates(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  prazo_dias INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for employee checklist instances
CREATE TABLE public.plano_checklist_funcionario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.plano_checklist_templates(id) ON DELETE SET NULL,
  tipo tipo_checklist NOT NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  status status_checklist NOT NULL DEFAULT 'em_andamento',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking individual item completion
CREATE TABLE public.plano_checklist_funcionario_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_funcionario_id UUID NOT NULL REFERENCES public.plano_checklist_funcionario(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.plano_checklist_itens(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  prazo_dias INTEGER,
  concluido BOOLEAN NOT NULL DEFAULT false,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  concluido_por UUID REFERENCES public.profiles(id),
  observacoes TEXT,
  anexo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plano_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_checklist_funcionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_checklist_funcionario_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Gestors can manage all templates"
ON public.plano_checklist_templates
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- RLS Policies for template items
CREATE POLICY "Gestors can manage all template items"
ON public.plano_checklist_itens
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- RLS Policies for employee checklists
CREATE POLICY "Gestors can manage all employee checklists"
ON public.plano_checklist_funcionario
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Employees can view own checklists"
ON public.plano_checklist_funcionario
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees
  WHERE employees.id = plano_checklist_funcionario.employee_id
  AND employees.user_id = auth.uid()
));

-- RLS Policies for checklist items
CREATE POLICY "Gestors can manage all checklist items"
ON public.plano_checklist_funcionario_itens
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Employees can view own checklist items"
ON public.plano_checklist_funcionario_itens
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM plano_checklist_funcionario pcf
  JOIN employees e ON e.id = pcf.employee_id
  WHERE pcf.id = plano_checklist_funcionario_itens.checklist_funcionario_id
  AND e.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_plano_checklist_templates_updated_at
BEFORE UPDATE ON public.plano_checklist_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plano_checklist_funcionario_updated_at
BEFORE UPDATE ON public.plano_checklist_funcionario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admission template
INSERT INTO public.plano_checklist_templates (nome, tipo) VALUES 
('Template Padrão de Admissão', 'admissao'),
('Template Padrão de Desligamento', 'desligamento');

-- Get template IDs and insert items
DO $$
DECLARE
  admissao_id UUID;
  desligamento_id UUID;
BEGIN
  SELECT id INTO admissao_id FROM public.plano_checklist_templates WHERE tipo = 'admissao' LIMIT 1;
  SELECT id INTO desligamento_id FROM public.plano_checklist_templates WHERE tipo = 'desligamento' LIMIT 1;

  -- Admission items
  INSERT INTO public.plano_checklist_itens (template_id, titulo, descricao, ordem, obrigatorio, prazo_dias) VALUES
  (admissao_id, 'Documentos Pessoais', 'RG, CPF, Título de Eleitor, Certidão de Nascimento/Casamento', 1, true, 1),
  (admissao_id, 'Comprovante de Residência', 'Conta de luz, água ou telefone recente', 2, true, 1),
  (admissao_id, 'Carteira de Trabalho', 'CTPS física ou digital', 3, true, 1),
  (admissao_id, 'Exame Admissional', 'ASO - Atestado de Saúde Ocupacional', 4, true, 3),
  (admissao_id, 'Foto 3x4', 'Para cadastro e crachá', 5, true, 1),
  (admissao_id, 'Dados Bancários', 'Conta para depósito de salário', 6, true, 3),
  (admissao_id, 'Contrato de Trabalho', 'Assinatura do contrato', 7, true, 1),
  (admissao_id, 'Entrega de EPIs', 'Equipamentos de proteção necessários', 8, false, 3),
  (admissao_id, 'Entrega de Uniformes', 'Uniformes da empresa', 9, false, 3),
  (admissao_id, 'Treinamento Inicial', 'Integração e treinamentos obrigatórios', 10, false, 7),
  (admissao_id, 'Cadastro no Sistema', 'Criação de acesso ao sistema', 11, true, 1),
  (admissao_id, 'Apresentação à Equipe', 'Apresentar o novo colaborador', 12, false, 1);

  -- Termination items
  INSERT INTO public.plano_checklist_itens (template_id, titulo, descricao, ordem, obrigatorio, prazo_dias) VALUES
  (desligamento_id, 'Comunicado Formal', 'Carta de demissão ou aviso prévio', 1, true, 1),
  (desligamento_id, 'Exame Demissional', 'ASO demissional obrigatório', 2, true, 10),
  (desligamento_id, 'Devolução de EPIs', 'Recolher todos os equipamentos', 3, true, 1),
  (desligamento_id, 'Devolução de Uniformes', 'Recolher uniformes da empresa', 4, true, 1),
  (desligamento_id, 'Devolução de Crachá', 'Recolher crachá de identificação', 5, true, 1),
  (desligamento_id, 'Devolução de Equipamentos', 'Notebook, celular, ferramentas, etc.', 6, false, 1),
  (desligamento_id, 'Desativação de Acessos', 'Revogar acessos a sistemas', 7, true, 1),
  (desligamento_id, 'Cálculo de Rescisão', 'Férias, 13º, saldo de salário, FGTS', 8, true, 10),
  (desligamento_id, 'Homologação', 'Quando aplicável (mais de 1 ano)', 9, false, 10),
  (desligamento_id, 'Entrevista de Desligamento', 'Feedback do colaborador', 10, false, 5),
  (desligamento_id, 'Baixa na CTPS', 'Registro de saída na carteira', 11, true, 10),
  (desligamento_id, 'Entrega de Documentos', 'TRCT, guias do seguro-desemprego, etc.', 12, true, 10);
END $$;