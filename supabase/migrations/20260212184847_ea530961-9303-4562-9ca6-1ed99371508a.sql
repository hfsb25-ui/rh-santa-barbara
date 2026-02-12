
-- Fix RLS on whatsapp_conversas - restrict to gestores only (not service role bypass)
DROP POLICY IF EXISTS "Service role can manage conversations" ON public.whatsapp_conversas;

CREATE POLICY "Gestores can view conversations"
ON public.whatsapp_conversas
FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Edge functions use service role key which bypasses RLS, so no INSERT/UPDATE/DELETE policies needed
