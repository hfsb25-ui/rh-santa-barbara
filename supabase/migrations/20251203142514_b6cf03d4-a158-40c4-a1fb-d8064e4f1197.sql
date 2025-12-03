-- Add column for allowed contract types in employee dashboard
ALTER TABLE public.configuracoes_dashboard_funcionario
ADD COLUMN tipos_contrato_permitidos text[] NOT NULL DEFAULT ARRAY['fixo', 'intermitente', 'prestador_servico']::text[];