-- Create eventos table for calendar integration
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  local VARCHAR(255),
  tipo VARCHAR(50) DEFAULT 'geral',
  cor VARCHAR(20) DEFAULT '#3B82F6',
  recorrente BOOLEAN DEFAULT FALSE,
  recorrencia_tipo VARCHAR(20),
  lembrete_minutos INTEGER DEFAULT 30,
  participantes UUID[],
  criado_por UUID REFERENCES public.profiles(id),
  empresa_id UUID REFERENCES public.empresas(id),
  google_event_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Policies for eventos
CREATE POLICY "Gestores podem ver todos os eventos" 
ON public.eventos 
FOR SELECT 
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionários podem ver eventos onde são participantes" 
ON public.eventos 
FOR SELECT 
USING (
  auth.uid() = ANY(participantes) OR
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND id = ANY(eventos.participantes)
  )
);

CREATE POLICY "Gestores podem criar eventos" 
ON public.eventos 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestores podem atualizar eventos" 
ON public.eventos 
FOR UPDATE 
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestores podem excluir eventos" 
ON public.eventos 
FOR DELETE 
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();