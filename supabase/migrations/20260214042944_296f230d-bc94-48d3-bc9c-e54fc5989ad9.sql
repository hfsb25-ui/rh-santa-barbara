
-- Table to store Cérebrum's learned knowledge
CREATE TABLE public.cerebrum_memorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL DEFAULT 'geral', -- preferencia, correcao, padrao_rh, fato, regra
  conteudo TEXT NOT NULL,
  contexto TEXT, -- what triggered this learning
  ensinado_por TEXT, -- phone number or user identifier
  nome_professor TEXT, -- name of person who taught
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cerebrum_memorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage all memorias" ON public.cerebrum_memorias
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_cerebrum_memorias_updated_at
  BEFORE UPDATE ON public.cerebrum_memorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
