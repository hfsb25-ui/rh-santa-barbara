-- Criar tabela para histórico de reajustes salariais
CREATE TABLE public.historico_reajustes_salariais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salario_anterior NUMERIC NOT NULL,
  salario_novo NUMERIC NOT NULL,
  percentual_reajuste NUMERIC,
  justificativa TEXT NOT NULL,
  aplicado_por UUID REFERENCES public.profiles(id),
  aplicado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.historico_reajustes_salariais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Gestors can view all salary adjustments"
  ON public.historico_reajustes_salariais
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can insert salary adjustments"
  ON public.historico_reajustes_salariais
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Índices para performance
CREATE INDEX idx_historico_reajustes_employee_id ON public.historico_reajustes_salariais(employee_id);
CREATE INDEX idx_historico_reajustes_aplicado_em ON public.historico_reajustes_salariais(aplicado_em DESC);