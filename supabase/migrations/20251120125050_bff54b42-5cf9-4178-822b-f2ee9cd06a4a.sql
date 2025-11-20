-- Add return confirmation fields to ferias table
ALTER TABLE public.ferias
ADD COLUMN data_retorno_confirmada BOOLEAN DEFAULT FALSE,
ADD COLUMN confirmado_por UUID REFERENCES public.profiles(id),
ADD COLUMN data_confirmacao TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the fields
COMMENT ON COLUMN public.ferias.data_retorno_confirmada IS 'Indicates if the manager confirmed the employee returned from vacation';
COMMENT ON COLUMN public.ferias.confirmado_por IS 'User ID of the manager who confirmed the return';
COMMENT ON COLUMN public.ferias.data_confirmacao IS 'Timestamp when the return was confirmed';