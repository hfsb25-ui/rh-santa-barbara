-- Add tipo_folha column to folha_pagamento table
ALTER TABLE public.folha_pagamento 
ADD COLUMN tipo_folha text NOT NULL DEFAULT 'salario';

-- Add comment to explain the field
COMMENT ON COLUMN public.folha_pagamento.tipo_folha IS 'Tipo da folha: salario, complementar, adiantamento, decimo_terceiro';