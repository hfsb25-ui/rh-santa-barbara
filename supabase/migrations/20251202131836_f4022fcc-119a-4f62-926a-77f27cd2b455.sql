-- Add expected entry and exit time columns to configuracao_horas_trabalho
ALTER TABLE public.configuracao_horas_trabalho 
ADD COLUMN hora_entrada_prevista time DEFAULT '08:00:00',
ADD COLUMN hora_saida_prevista time DEFAULT '17:00:00';