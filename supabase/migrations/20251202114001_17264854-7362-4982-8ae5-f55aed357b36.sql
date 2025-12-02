-- Criar tabela de adiantamentos
CREATE TABLE public.adiantamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('em_conta', 'em_maos')),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.adiantamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Gestors can manage all adiantamentos"
  ON public.adiantamentos
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own adiantamentos"
  ON public.adiantamentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = adiantamentos.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_adiantamentos_updated_at
  BEFORE UPDATE ON public.adiantamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();