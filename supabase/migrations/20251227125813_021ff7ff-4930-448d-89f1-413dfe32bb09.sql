-- Create table for fixed payroll variables per employee
CREATE TABLE public.variaveis_fixas_funcionario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  variavel_id UUID NOT NULL REFERENCES public.variaveis_folha(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, variavel_id)
);

-- Enable RLS
ALTER TABLE public.variaveis_fixas_funcionario ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users"
ON public.variaveis_fixas_funcionario
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_variaveis_fixas_funcionario_updated_at
BEFORE UPDATE ON public.variaveis_fixas_funcionario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();