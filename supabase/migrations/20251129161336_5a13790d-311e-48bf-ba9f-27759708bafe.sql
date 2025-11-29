-- Criar tabela para banco de horas dos funcionários
CREATE TABLE public.banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  saldo_horas NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id)
);

-- Habilitar RLS
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para gestores gerenciarem todo o banco de horas
CREATE POLICY "Gestors can manage all banco horas"
ON public.banco_horas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Políticas RLS para funcionários visualizarem apenas seu próprio banco de horas
CREATE POLICY "Employees can view own banco horas"
ON public.banco_horas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees
    WHERE employees.id = banco_horas.employee_id
      AND employees.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_banco_horas_updated_at
BEFORE UPDATE ON public.banco_horas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de histórico do banco de horas
CREATE TABLE public.historico_banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('adicao', 'uso', 'zerado')),
  horas NUMERIC NOT NULL,
  saldo_anterior NUMERIC NOT NULL,
  saldo_novo NUMERIC NOT NULL,
  mes_referencia TEXT,
  observacao TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS no histórico
ALTER TABLE public.historico_banco_horas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para gestores visualizarem todo o histórico
CREATE POLICY "Gestors can view all banco horas history"
ON public.historico_banco_horas
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Políticas RLS para gestores inserirem no histórico
CREATE POLICY "Gestors can insert banco horas history"
ON public.historico_banco_horas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Políticas RLS para funcionários visualizarem apenas seu próprio histórico
CREATE POLICY "Employees can view own banco horas history"
ON public.historico_banco_horas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees
    WHERE employees.id = historico_banco_horas.employee_id
      AND employees.user_id = auth.uid()
  )
);