-- Tabela para configuração de horas de trabalho esperadas por funcionário
CREATE TABLE IF NOT EXISTS public.configuracao_horas_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  horas_diarias_esperadas NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id)
);

-- Tabela para registros de ponto
CREATE TABLE IF NOT EXISTS public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_entrada TIME,
  hora_saida TIME,
  hora_inicio_intervalo TIME,
  hora_fim_intervalo TIME,
  horas_trabalhadas NUMERIC(4,2),
  tipo_dia TEXT NOT NULL DEFAULT 'normal', -- normal, abonado, falta, ferias, atestado
  observacoes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, data)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_registros_ponto_employee ON public.registros_ponto(employee_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data ON public.registros_ponto(data);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_employee_data ON public.registros_ponto(employee_id, data);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracao_horas_trabalho_updated_at
  BEFORE UPDATE ON public.configuracao_horas_trabalho
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registros_ponto_updated_at
  BEFORE UPDATE ON public.registros_ponto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.configuracao_horas_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- Gestores podem gerenciar tudo
CREATE POLICY "Gestors can manage all work hour configs"
  ON public.configuracao_horas_trabalho
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can manage all attendance records"
  ON public.registros_ponto
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));

-- Funcionários podem ver seus próprios registros
CREATE POLICY "Employees can view own attendance records"
  ON public.registros_ponto
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = registros_ponto.employee_id
      AND employees.user_id = auth.uid()
    )
  );