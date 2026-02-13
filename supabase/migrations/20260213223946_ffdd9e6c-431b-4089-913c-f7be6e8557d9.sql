-- Add whatsapp_phone column to eventos to track who created events via WhatsApp
ALTER TABLE public.eventos ADD COLUMN whatsapp_phone text;

-- Create index for efficient lookup by phone number
CREATE INDEX idx_eventos_whatsapp_phone ON public.eventos(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;