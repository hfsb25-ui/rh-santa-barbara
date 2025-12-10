-- Create table for experience period alert configuration
CREATE TABLE public.configuracao_alertas_experiencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT true,
  dias_antecedencia INTEGER NOT NULL DEFAULT 7,
  marcos_dias INTEGER[] NOT NULL DEFAULT ARRAY[45, 90],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracao_alertas_experiencia ENABLE ROW LEVEL SECURITY;

-- Only managers can manage this configuration
CREATE POLICY "Gestors can manage experience alert config"
ON public.configuracao_alertas_experiencia
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_configuracao_alertas_experiencia_updated_at
BEFORE UPDATE ON public.configuracao_alertas_experiencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.configuracao_alertas_experiencia (ativo, dias_antecedencia, marcos_dias)
VALUES (true, 7, ARRAY[45, 90]);