-- Permissions per partial-admin user (which modules they can access)
CREATE TABLE IF NOT EXISTS public.admin_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_amp_user ON public.admin_module_permissions(user_id);

ALTER TABLE public.admin_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors manage all module permissions"
ON public.admin_module_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Users can view own module permissions"
ON public.admin_module_permissions
FOR SELECT
USING (user_id = auth.uid());