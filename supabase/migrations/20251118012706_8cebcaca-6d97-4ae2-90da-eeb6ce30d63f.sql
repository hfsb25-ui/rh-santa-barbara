-- Add column to track last time off quantity change
ALTER TABLE public.employees 
ADD COLUMN ultima_alteracao_folgas timestamp with time zone;