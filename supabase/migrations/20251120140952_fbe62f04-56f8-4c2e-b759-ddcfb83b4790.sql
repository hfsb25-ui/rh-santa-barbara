-- Add signature field to epis table
ALTER TABLE public.epis
ADD COLUMN assinatura_funcionario TEXT;

-- Add signature field to uniformes table
ALTER TABLE public.uniformes
ADD COLUMN assinatura_funcionario TEXT;

-- Add signature date field to epis table
ALTER TABLE public.epis
ADD COLUMN data_assinatura TIMESTAMP WITH TIME ZONE;

-- Add signature date field to uniformes table
ALTER TABLE public.uniformes
ADD COLUMN data_assinatura TIMESTAMP WITH TIME ZONE;