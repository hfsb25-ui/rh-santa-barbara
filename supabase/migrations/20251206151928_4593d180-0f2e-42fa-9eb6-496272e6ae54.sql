-- Política para permitir que qualquer usuário autenticado veja empresas (necessário para filtros)
CREATE POLICY "Authenticated users can view companies"
ON public.empresas
FOR SELECT
USING (auth.uid() IS NOT NULL);