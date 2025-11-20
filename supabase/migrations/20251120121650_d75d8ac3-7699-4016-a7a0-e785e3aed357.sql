-- Create funcoes table
CREATE TABLE public.funcoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cbo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Gestors can manage all funcoes"
  ON public.funcoes
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view funcoes"
  ON public.funcoes
  FOR SELECT
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_funcoes_updated_at
  BEFORE UPDATE ON public.funcoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();