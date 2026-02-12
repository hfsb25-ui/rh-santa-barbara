
-- Add daily reminder fields to configuracoes_whatsapp
ALTER TABLE public.configuracoes_whatsapp 
ADD COLUMN numero_lembrete text DEFAULT '',
ADD COLUMN horario_lembrete time DEFAULT '07:00:00',
ADD COLUMN lembrete_ativo boolean DEFAULT false;

-- Create conversation history table for AI memory
CREATE TABLE public.whatsapp_conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role key)
CREATE POLICY "Service role can manage conversations"
ON public.whatsapp_conversas
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for quick lookups by phone number
CREATE INDEX idx_whatsapp_conversas_phone ON public.whatsapp_conversas(phone_number, created_at DESC);

-- Auto-cleanup: keep only last 30 days of conversations
CREATE OR REPLACE FUNCTION public.cleanup_old_whatsapp_conversas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.whatsapp_conversas 
  WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_whatsapp_conversas
AFTER INSERT ON public.whatsapp_conversas
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_whatsapp_conversas();
