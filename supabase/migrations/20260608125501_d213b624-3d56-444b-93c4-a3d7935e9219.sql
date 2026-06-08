ALTER TABLE public.folha_pagamento
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'final';

CREATE INDEX IF NOT EXISTS idx_folha_pagamento_status ON public.folha_pagamento(status);