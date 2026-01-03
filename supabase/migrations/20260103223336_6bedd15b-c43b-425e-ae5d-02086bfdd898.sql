-- Remove a constraint antiga e adiciona uma nova com todos os valores
ALTER TABLE public.adiantamentos DROP CONSTRAINT IF EXISTS adiantamentos_forma_pagamento_check;

ALTER TABLE public.adiantamentos ADD CONSTRAINT adiantamentos_forma_pagamento_check 
CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'emprestimo', 'consumo', 'em_maos', 'em_conta'));