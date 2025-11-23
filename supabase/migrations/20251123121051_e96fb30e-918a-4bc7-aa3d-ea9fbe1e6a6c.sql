-- Create ferias_planejadas table for vacation planning
CREATE TABLE public.ferias_planejadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dias_totais INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'aprovado', 'rejeitado', 'efetivado')),
  observacoes TEXT,
  criado_por UUID,
  aprovado_por UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create configuracoes_ferias table for vacation settings
CREATE TABLE public.configuracoes_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID,
  empresa_id UUID,
  percentual_maximo_ausencia NUMERIC DEFAULT 30,
  funcionarios_chave UUID[],
  cobertura_minima INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ferias_planejadas
ALTER TABLE public.ferias_planejadas ENABLE ROW LEVEL SECURITY;

-- Enable RLS on configuracoes_ferias
ALTER TABLE public.configuracoes_ferias ENABLE ROW LEVEL SECURITY;

-- Policies for ferias_planejadas
CREATE POLICY "Gestors can manage all planned vacations"
ON public.ferias_planejadas
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own planned vacations"
ON public.ferias_planejadas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = ferias_planejadas.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Policies for configuracoes_ferias
CREATE POLICY "Gestors can manage vacation configurations"
ON public.configuracoes_ferias
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Create trigger for updated_at on ferias_planejadas
CREATE TRIGGER update_ferias_planejadas_updated_at
BEFORE UPDATE ON public.ferias_planejadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on configuracoes_ferias
CREATE TRIGGER update_configuracoes_ferias_updated_at
BEFORE UPDATE ON public.configuracoes_ferias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();