
-- Add column to track if reminder was already sent
ALTER TABLE public.eventos ADD COLUMN lembrete_enviado boolean DEFAULT false;

-- Create index for efficient reminder queries
CREATE INDEX idx_eventos_lembrete_pendente ON public.eventos(data_inicio, lembrete_enviado) 
WHERE whatsapp_phone IS NOT NULL AND lembrete_enviado = false AND concluido = false;
