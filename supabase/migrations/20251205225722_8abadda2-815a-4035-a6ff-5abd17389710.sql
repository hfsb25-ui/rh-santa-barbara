-- Create enum for variable types
CREATE TYPE public.tipo_variavel_folha AS ENUM ('desconto', 'provento');

-- Create table for payroll variables
CREATE TABLE public.variaveis_folha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo tipo_variavel_folha NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for payroll items (values per variable per payment)
CREATE TABLE public.folha_pagamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_pagamento_id UUID NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE CASCADE,
  variavel_id UUID NOT NULL REFERENCES public.variaveis_folha(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variaveis_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamento_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for variaveis_folha
CREATE POLICY "Gestors can manage all payroll variables"
ON public.variaveis_folha
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- RLS policies for folha_pagamento_itens
CREATE POLICY "Gestors can manage all payroll items"
ON public.folha_pagamento_itens
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own payroll items"
ON public.folha_pagamento_itens
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM folha_pagamento fp
  JOIN employees e ON e.id = fp.employee_id
  WHERE fp.id = folha_pagamento_itens.folha_pagamento_id
  AND e.user_id = auth.uid()
));

-- Create updated_at trigger
CREATE TRIGGER update_variaveis_folha_updated_at
BEFORE UPDATE ON public.variaveis_folha
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default variables
INSERT INTO public.variaveis_folha (nome, tipo) VALUES
  ('Hora Extra', 'provento'),
  ('Adicional Noturno', 'provento'),
  ('Comissão', 'provento'),
  ('Gratificação', 'provento'),
  ('Bonificação', 'provento'),
  ('INSS', 'desconto'),
  ('IRRF', 'desconto'),
  ('Vale Transporte', 'desconto'),
  ('Vale Refeição', 'desconto'),
  ('Adiantamento', 'desconto'),
  ('Faltas', 'desconto'),
  ('Empréstimo Consignado', 'desconto');