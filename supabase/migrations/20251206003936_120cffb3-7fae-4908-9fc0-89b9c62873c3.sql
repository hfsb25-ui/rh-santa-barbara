-- Add codigo field to variaveis_folha table
ALTER TABLE public.variaveis_folha 
ADD COLUMN codigo text UNIQUE;

-- Update existing default variables with codes
UPDATE public.variaveis_folha SET codigo = 'INSS' WHERE nome = 'INSS';
UPDATE public.variaveis_folha SET codigo = 'VT' WHERE nome = 'Vale Transporte';
UPDATE public.variaveis_folha SET codigo = 'VR' WHERE nome = 'Vale Refeição';
UPDATE public.variaveis_folha SET codigo = 'HE' WHERE nome = 'Hora Extra';
UPDATE public.variaveis_folha SET codigo = 'AN' WHERE nome = 'Adicional Noturno';
UPDATE public.variaveis_folha SET codigo = 'ADT' WHERE nome = 'Adiantamento';
UPDATE public.variaveis_folha SET codigo = 'CONTA' WHERE nome = 'Valor em Conta';