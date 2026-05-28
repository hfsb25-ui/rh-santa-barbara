ALTER TABLE public.configuracao_alertas_ponto
ADD COLUMN IF NOT EXISTS hora_entrada_padrao time NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_saida_padrao time NOT NULL DEFAULT '17:00:00';