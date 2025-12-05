-- Adicionar coluna desconto na tabela folha_pagamento
ALTER TABLE public.folha_pagamento 
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0;