-- Add RG and birth date columns to employees table
ALTER TABLE public.employees
ADD COLUMN rg text,
ADD COLUMN data_nascimento date;

COMMENT ON COLUMN public.employees.rg IS 'RG do funcionário';
COMMENT ON COLUMN public.employees.data_nascimento IS 'Data de nascimento do funcionário';