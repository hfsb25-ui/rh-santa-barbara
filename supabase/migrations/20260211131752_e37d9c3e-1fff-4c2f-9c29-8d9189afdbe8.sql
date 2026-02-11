
CREATE TABLE public.configuracoes_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evolution_api_url TEXT DEFAULT '',
  evolution_api_key TEXT DEFAULT '',
  evolution_instance_name TEXT DEFAULT '',
  whatsapp_allowed_numbers TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores can view whatsapp config"
ON public.configuracoes_whatsapp
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'
  )
);

CREATE POLICY "Gestores can insert whatsapp config"
ON public.configuracoes_whatsapp
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'
  )
);

CREATE POLICY "Gestores can update whatsapp config"
ON public.configuracoes_whatsapp
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'
  )
);
