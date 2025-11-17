-- Adicionar coluna de quantidade de folgas na tabela employees
ALTER TABLE public.employees 
ADD COLUMN quantidade_folgas INTEGER DEFAULT 0;