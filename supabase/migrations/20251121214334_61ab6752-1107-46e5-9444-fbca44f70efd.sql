-- Add sexo column to employees table
ALTER TABLE public.employees
ADD COLUMN sexo text;

COMMENT ON COLUMN public.employees.sexo IS 'Sexo do funcionário: Masculino, Feminino, Outro, Prefiro não informar';