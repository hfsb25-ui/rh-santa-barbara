-- Criar tabela para modelos de contrato por função
CREATE TABLE public.modelos_contrato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcao_id UUID NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  tipo_contrato tipo_contrato NOT NULL,
  conteudo_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funcao_id, tipo_contrato)
);

-- Enable Row Level Security
ALTER TABLE public.modelos_contrato ENABLE ROW LEVEL SECURITY;

-- Gestors can manage all contract templates
CREATE POLICY "Gestors can manage all contract templates"
ON public.modelos_contrato
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_modelos_contrato_updated_at
BEFORE UPDATE ON public.modelos_contrato
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();