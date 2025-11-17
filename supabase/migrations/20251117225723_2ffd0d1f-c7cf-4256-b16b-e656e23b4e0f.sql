-- Add salario field to employees table
ALTER TABLE public.employees 
ADD COLUMN salario DECIMAL(10,2);

-- Create setores table
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on setores
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- Gestors can manage all sectors
CREATE POLICY "Gestors can manage all sectors"
ON public.setores
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Create trigger for setores updated_at
CREATE TRIGGER update_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();