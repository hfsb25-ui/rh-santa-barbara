-- Create enum for TAC types
CREATE TYPE public.tipo_tac AS ENUM ('advertencia_verbal', 'advertencia_escrita', 'suspensao', 'compromisso');

-- Create enum for TAC status
CREATE TYPE public.status_tac AS ENUM ('pendente', 'visualizado', 'confirmado');

-- Create TACs table
CREATE TABLE public.tacs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo tipo_tac NOT NULL,
  data_ocorrencia DATE NOT NULL,
  data_publicacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status status_tac NOT NULL DEFAULT 'pendente',
  lido_em TIMESTAMP WITH TIME ZONE,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tacs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Gestors can manage all TACs"
ON public.tacs
FOR ALL
USING (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Employees can view own TACs"
ON public.tacs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees
  WHERE employees.id = tacs.employee_id
  AND employees.user_id = auth.uid()
));

CREATE POLICY "Employees can update own TAC status"
ON public.tacs
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM employees
  WHERE employees.id = tacs.employee_id
  AND employees.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM employees
  WHERE employees.id = tacs.employee_id
  AND employees.user_id = auth.uid()
));

-- Add updated_at trigger
CREATE TRIGGER update_tacs_updated_at
BEFORE UPDATE ON public.tacs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add tacs_visivel to dashboard config
ALTER TABLE public.configuracoes_dashboard_funcionario 
ADD COLUMN IF NOT EXISTS tacs_visivel BOOLEAN NOT NULL DEFAULT true;