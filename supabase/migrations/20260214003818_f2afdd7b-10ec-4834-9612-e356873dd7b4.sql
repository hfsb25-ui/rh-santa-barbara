
CREATE TABLE public.configuracoes_ia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_gemini_api_key text,
  modelo text DEFAULT 'gemini-2.0-flash',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage IA config"
  ON public.configuracoes_ia
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_configuracoes_ia_updated_at
  BEFORE UPDATE ON public.configuracoes_ia
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
