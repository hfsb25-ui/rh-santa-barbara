
-- Add rescisão fields to folha_pagamento
ALTER TABLE public.folha_pagamento 
  ADD COLUMN IF NOT EXISTS tipo_rescisao text,
  ADD COLUMN IF NOT EXISTS aviso_previo_cumprido boolean,
  ADD COLUMN IF NOT EXISTS data_desligamento date;
