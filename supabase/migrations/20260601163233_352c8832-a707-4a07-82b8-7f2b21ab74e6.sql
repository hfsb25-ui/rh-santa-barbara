
ALTER TABLE public.folha_pagamento ADD COLUMN IF NOT EXISTS backup_drive_em timestamptz;
ALTER TABLE public.historico_estoque_epis ADD COLUMN IF NOT EXISTS backup_drive_em timestamptz;
ALTER TABLE public.historico_estoque_uniformes ADD COLUMN IF NOT EXISTS backup_drive_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_folha_pagamento_backup_pendente ON public.folha_pagamento (created_at) WHERE backup_drive_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_hist_epi_backup_pendente ON public.historico_estoque_epis (created_at) WHERE backup_drive_em IS NULL AND tipo_movimentacao = 'saida' AND employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hist_unif_backup_pendente ON public.historico_estoque_uniformes (created_at) WHERE backup_drive_em IS NULL AND tipo_movimentacao = 'saida' AND employee_id IS NOT NULL;
