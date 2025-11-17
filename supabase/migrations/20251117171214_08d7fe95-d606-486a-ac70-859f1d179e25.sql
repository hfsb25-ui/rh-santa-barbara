-- Criar tabela de estoque de EPIs
CREATE TABLE IF NOT EXISTS public.estoque_epis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_epi TEXT NOT NULL,
  marca_modelo TEXT,
  ca TEXT, -- Certificado de Aprovação
  tamanho TEXT,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 10,
  finalidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de estoque de uniformes
CREATE TABLE IF NOT EXISTS public.estoque_uniformes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_uniforme TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 10,
  cor TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.estoque_epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_uniformes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas gestores podem gerenciar estoque
CREATE POLICY "Gestors can manage EPI stock" 
ON public.estoque_epis 
FOR ALL 
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can manage uniform stock" 
ON public.estoque_uniformes 
FOR ALL 
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_estoque_epis_updated_at
BEFORE UPDATE ON public.estoque_epis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estoque_uniformes_updated_at
BEFORE UPDATE ON public.estoque_uniformes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();