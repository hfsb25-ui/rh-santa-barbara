UPDATE public.variaveis_folha SET codigo = NULL WHERE codigo = '' OR btrim(codigo) = '';
ALTER TABLE public.variaveis_folha DROP CONSTRAINT IF EXISTS variaveis_folha_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS variaveis_folha_codigo_unique ON public.variaveis_folha (codigo) WHERE codigo IS NOT NULL;