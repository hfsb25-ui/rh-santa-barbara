-- Create table for EPI stock movements history
CREATE TABLE public.historico_estoque_epis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estoque_epi_id UUID NOT NULL REFERENCES public.estoque_epis(id) ON DELETE CASCADE,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  motivo TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Uniform stock movements history
CREATE TABLE public.historico_estoque_uniformes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estoque_uniforme_id UUID NOT NULL REFERENCES public.estoque_uniformes(id) ON DELETE CASCADE,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  motivo TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historico_estoque_epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_estoque_uniformes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for EPI stock history
CREATE POLICY "Gestors can view EPI stock history"
  ON public.historico_estoque_epis
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can insert EPI stock history"
  ON public.historico_estoque_epis
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Create RLS policies for Uniform stock history
CREATE POLICY "Gestors can view uniform stock history"
  ON public.historico_estoque_uniformes
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can insert uniform stock history"
  ON public.historico_estoque_uniformes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_historico_estoque_epis_created_at ON public.historico_estoque_epis(created_at DESC);
CREATE INDEX idx_historico_estoque_uniformes_created_at ON public.historico_estoque_uniformes(created_at DESC);
CREATE INDEX idx_historico_estoque_epis_estoque_id ON public.historico_estoque_epis(estoque_epi_id);
CREATE INDEX idx_historico_estoque_uniformes_estoque_id ON public.historico_estoque_uniformes(estoque_uniforme_id);