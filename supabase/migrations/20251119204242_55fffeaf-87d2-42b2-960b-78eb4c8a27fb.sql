-- Add tipo_contrato to employees table
CREATE TYPE public.tipo_contrato AS ENUM ('fixo', 'intermitente', 'prestador_servico');

ALTER TABLE public.employees 
ADD COLUMN tipo_contrato public.tipo_contrato DEFAULT 'fixo';

-- Create folha_pagamento table
CREATE TABLE public.folha_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor_bruto NUMERIC NOT NULL DEFAULT 0,
  descontos NUMERIC DEFAULT 0,
  valor_liquido NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folha_pagamento
CREATE POLICY "Gestors can manage all payroll"
ON public.folha_pagamento
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own payroll"
ON public.folha_pagamento
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = folha_pagamento.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_folha_pagamento_updated_at
BEFORE UPDATE ON public.folha_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();