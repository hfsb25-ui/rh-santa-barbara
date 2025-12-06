-- Create unique constraint for folha_pagamento upsert
ALTER TABLE public.folha_pagamento 
ADD CONSTRAINT folha_pagamento_employee_mes_ano_tipo_unique 
UNIQUE (employee_id, mes, ano, tipo_folha);