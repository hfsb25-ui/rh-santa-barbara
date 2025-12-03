-- Adicionar colunas de desligamento na tabela plano_checklist_funcionario
ALTER TABLE public.plano_checklist_funcionario 
ADD COLUMN IF NOT EXISTS tipo_desligamento TEXT,
ADD COLUMN IF NOT EXISTS motivo_desligamento TEXT,
ADD COLUMN IF NOT EXISTS aviso_tipo TEXT,
ADD COLUMN IF NOT EXISTS dias_aviso INTEGER,
ADD COLUMN IF NOT EXISTS observacoes_desligamento TEXT;