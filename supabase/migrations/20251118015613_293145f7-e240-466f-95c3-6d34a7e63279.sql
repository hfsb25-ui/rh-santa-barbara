-- Create table for time off history
CREATE TABLE public.historico_folgas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  alterado_por UUID REFERENCES public.profiles(id),
  alterado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_folgas ENABLE ROW LEVEL SECURITY;

-- Policy for gestors to view all history
CREATE POLICY "Gestors can view all time off history"
ON public.historico_folgas
FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Policy for gestors to insert history
CREATE POLICY "Gestors can insert time off history"
ON public.historico_folgas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Create index for faster queries
CREATE INDEX idx_historico_folgas_employee_id ON public.historico_folgas(employee_id);
CREATE INDEX idx_historico_folgas_alterado_em ON public.historico_folgas(alterado_em DESC);