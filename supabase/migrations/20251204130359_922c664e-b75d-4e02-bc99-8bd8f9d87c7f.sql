-- Add ultimo_acesso column to track when employee last accessed a lesson
ALTER TABLE public.progresso_treinamento 
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to have ultimo_acesso same as created_at
UPDATE public.progresso_treinamento 
SET ultimo_acesso = COALESCE(data_conclusao, created_at)
WHERE ultimo_acesso IS NULL;