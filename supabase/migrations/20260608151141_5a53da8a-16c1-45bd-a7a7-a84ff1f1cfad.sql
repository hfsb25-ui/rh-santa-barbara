CREATE TABLE public.configuracao_holerite_diferenca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variaveis_desconto_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracao_holerite_diferenca TO authenticated;
GRANT ALL ON public.configuracao_holerite_diferenca TO service_role;

ALTER TABLE public.configuracao_holerite_diferenca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view config holerite diferenca"
ON public.configuracao_holerite_diferenca FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Gestor manage config holerite diferenca"
ON public.configuracao_holerite_diferenca FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER update_config_holerite_diferenca_updated_at
BEFORE UPDATE ON public.configuracao_holerite_diferenca
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracao_holerite_diferenca (variaveis_desconto_ids, ativo)
VALUES (ARRAY[]::UUID[], true);