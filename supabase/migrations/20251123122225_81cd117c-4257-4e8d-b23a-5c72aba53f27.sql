-- Create table for sector workforce configuration
CREATE TABLE public.configuracao_setor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  quantidade_media INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(setor_id)
);

-- Enable RLS
ALTER TABLE public.configuracao_setor ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Gestors can manage sector configurations"
ON public.configuracao_setor
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_configuracao_setor_updated_at
BEFORE UPDATE ON public.configuracao_setor
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();