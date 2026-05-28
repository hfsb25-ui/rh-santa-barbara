
-- Grants for NR-1 tables (allow anon and authenticated to use the Data API)
GRANT SELECT, INSERT ON public.nr1_denuncias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_denuncias TO authenticated;
GRANT ALL ON public.nr1_denuncias TO service_role;

GRANT SELECT, INSERT ON public.nr1_denuncias_anexos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_denuncias_anexos TO authenticated;
GRANT ALL ON public.nr1_denuncias_anexos TO service_role;

GRANT SELECT, INSERT ON public.nr1_clima_respostas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_clima_respostas TO authenticated;
GRANT ALL ON public.nr1_clima_respostas TO service_role;

GRANT SELECT, UPDATE ON public.nr1_pesquisa_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_pesquisa_tokens TO authenticated;
GRANT ALL ON public.nr1_pesquisa_tokens TO service_role;

GRANT SELECT ON public.nr1_pesquisas_clima TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_pesquisas_clima TO authenticated;
GRANT ALL ON public.nr1_pesquisas_clima TO service_role;

GRANT SELECT, UPDATE ON public.nr1_lideranca_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_lideranca_tokens TO authenticated;
GRANT ALL ON public.nr1_lideranca_tokens TO service_role;

GRANT SELECT ON public.nr1_lideranca_pesquisas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_lideranca_pesquisas TO authenticated;
GRANT ALL ON public.nr1_lideranca_pesquisas TO service_role;

GRANT INSERT ON public.nr1_lideranca_respostas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_lideranca_respostas TO authenticated;
GRANT ALL ON public.nr1_lideranca_respostas TO service_role;

-- Allow anonymous validation of active leadership surveys (read)
DROP POLICY IF EXISTS "Anon can view active lideranca pesquisas" ON public.nr1_lideranca_pesquisas;
CREATE POLICY "Anon can view active lideranca pesquisas"
ON public.nr1_lideranca_pesquisas
FOR SELECT
TO anon, authenticated
USING (ativa = true);
