-- Add unique constraint on notas_avaliacao for upsert operations
ALTER TABLE public.notas_avaliacao 
ADD CONSTRAINT notas_avaliacao_avaliacao_criterio_unique 
UNIQUE (avaliacao_id, criterio_id);