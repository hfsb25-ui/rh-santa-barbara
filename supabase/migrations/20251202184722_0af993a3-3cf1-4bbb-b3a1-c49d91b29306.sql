-- Create table for employee dashboard visibility settings
CREATE TABLE public.configuracoes_dashboard_funcionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avisos_visivel boolean NOT NULL DEFAULT true,
  saldo_horas_visivel boolean NOT NULL DEFAULT true,
  banco_horas_visivel boolean NOT NULL DEFAULT true,
  folgas_visivel boolean NOT NULL DEFAULT true,
  treinamentos_visivel boolean NOT NULL DEFAULT true,
  epis_visivel boolean NOT NULL DEFAULT true,
  uniformes_visivel boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_dashboard_funcionario ENABLE ROW LEVEL SECURITY;

-- Policy for gestors to manage settings
CREATE POLICY "Gestors can manage dashboard settings"
ON public.configuracoes_dashboard_funcionario
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Policy for employees to read settings
CREATE POLICY "Employees can view dashboard settings"
ON public.configuracoes_dashboard_funcionario
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_configuracoes_dashboard_funcionario_updated_at
BEFORE UPDATE ON public.configuracoes_dashboard_funcionario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.configuracoes_dashboard_funcionario (id) 
VALUES (gen_random_uuid());