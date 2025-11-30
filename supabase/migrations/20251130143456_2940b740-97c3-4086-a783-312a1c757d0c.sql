-- Adicionar coluna para controlar se os alertas estão ativos
ALTER TABLE public.configuracao_setor 
ADD COLUMN IF NOT EXISTS alertas_ativos boolean NOT NULL DEFAULT true;