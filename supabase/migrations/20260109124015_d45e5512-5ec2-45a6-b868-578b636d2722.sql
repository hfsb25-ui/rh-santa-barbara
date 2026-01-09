-- Add concluido column to eventos table
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS concluido boolean DEFAULT false;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS concluido_em timestamp with time zone;