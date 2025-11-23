-- Permitir que qualquer pessoa veja os logos das empresas (apenas o campo logo_url)
-- Isso é necessário para exibir a logo na tela de login antes da autenticação
CREATE POLICY "Anyone can view company logos"
ON public.empresas
FOR SELECT
USING (true);