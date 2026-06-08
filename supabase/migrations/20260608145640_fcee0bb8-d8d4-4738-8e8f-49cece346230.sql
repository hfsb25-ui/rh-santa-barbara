CREATE POLICY "Authenticated can view payroll variables"
ON public.variaveis_folha
FOR SELECT
TO authenticated
USING (true);