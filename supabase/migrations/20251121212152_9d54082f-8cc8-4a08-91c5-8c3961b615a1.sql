-- Criar enum para tipo de salário
CREATE TYPE public.tipo_salario AS ENUM ('mensal', 'diario', 'por_hora');

-- Adicionar coluna tipo_salario na tabela employees
ALTER TABLE public.employees
ADD COLUMN tipo_salario public.tipo_salario DEFAULT 'mensal';