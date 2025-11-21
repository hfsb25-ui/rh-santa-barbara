-- Alterar a constraint da tabela avisos para permitir exclusão de gestores
-- mantendo os avisos mas setando created_by como NULL

ALTER TABLE public.avisos
DROP CONSTRAINT IF EXISTS avisos_created_by_fkey;

ALTER TABLE public.avisos
ADD CONSTRAINT avisos_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Fazer o mesmo para outras tabelas que referenciam profiles
ALTER TABLE public.afastamentos
DROP CONSTRAINT IF EXISTS afastamentos_created_by_fkey;

ALTER TABLE public.afastamentos
ADD CONSTRAINT afastamentos_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.epis
DROP CONSTRAINT IF EXISTS epis_created_by_fkey;

ALTER TABLE public.epis
ADD CONSTRAINT epis_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.faltas
DROP CONSTRAINT IF EXISTS faltas_created_by_fkey;

ALTER TABLE public.faltas
ADD CONSTRAINT faltas_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.ferias
DROP CONSTRAINT IF EXISTS ferias_created_by_fkey;

ALTER TABLE public.ferias
ADD CONSTRAINT ferias_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.ferias
DROP CONSTRAINT IF EXISTS ferias_confirmado_por_fkey;

ALTER TABLE public.ferias
ADD CONSTRAINT ferias_confirmado_por_fkey 
FOREIGN KEY (confirmado_por) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.folgas
DROP CONSTRAINT IF EXISTS folgas_created_by_fkey;

ALTER TABLE public.folgas
ADD CONSTRAINT folgas_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.folha_pagamento
DROP CONSTRAINT IF EXISTS folha_pagamento_created_by_fkey;

ALTER TABLE public.folha_pagamento
ADD CONSTRAINT folha_pagamento_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.historico_estoque_epis
DROP CONSTRAINT IF EXISTS historico_estoque_epis_created_by_fkey;

ALTER TABLE public.historico_estoque_epis
ADD CONSTRAINT historico_estoque_epis_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.historico_estoque_uniformes
DROP CONSTRAINT IF EXISTS historico_estoque_uniformes_created_by_fkey;

ALTER TABLE public.historico_estoque_uniformes
ADD CONSTRAINT historico_estoque_uniformes_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.historico_folgas
DROP CONSTRAINT IF EXISTS historico_folgas_alterado_por_fkey;

ALTER TABLE public.historico_folgas
ADD CONSTRAINT historico_folgas_alterado_por_fkey 
FOREIGN KEY (alterado_por) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.uniformes
DROP CONSTRAINT IF EXISTS uniformes_created_by_fkey;

ALTER TABLE public.uniformes
ADD CONSTRAINT uniformes_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;