
CREATE TABLE public.nfe_vinculos_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao_nfe TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('epi', 'uniforme')),
  estoque_item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_nfe_vinculos_descricao ON public.nfe_vinculos_estoque (LOWER(descricao_nfe));

ALTER TABLE public.nfe_vinculos_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage NF-e vinculos"
  ON public.nfe_vinculos_estoque
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));
