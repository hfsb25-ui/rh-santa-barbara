-- Adicionar política para gestores visualizarem setores (já coberto pelo ALL, mas vamos verificar)
-- A tabela setores já tem política ALL para gestores, então não precisa de alteração

-- Verificar se a política de empresas está funcionando corretamente para gestores
-- A política ALL já deveria cobrir SELECT, INSERT, UPDATE, DELETE

-- O problema pode ser que o usuário não está autenticado ou não tem role de gestor
-- Vamos adicionar uma política SELECT explícita para setores como backup

-- Política para permitir que qualquer usuário autenticado veja setores (necessário para filtros)
CREATE POLICY "Authenticated users can view sectors"
ON public.setores
FOR SELECT
USING (auth.uid() IS NOT NULL);