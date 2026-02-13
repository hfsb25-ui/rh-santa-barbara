-- Add column for numbers that receive global system events in their daily reminder
ALTER TABLE public.configuracoes_whatsapp ADD COLUMN numeros_eventos_globais text DEFAULT '';