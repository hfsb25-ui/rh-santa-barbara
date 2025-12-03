-- Add bank agreement number field to empresas table
ALTER TABLE public.empresas 
ADD COLUMN numero_convenio_bancario TEXT;