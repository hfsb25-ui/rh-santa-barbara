-- Add column for vacation progress visibility in employee dashboard
ALTER TABLE public.configuracoes_dashboard_funcionario
ADD COLUMN ferias_visivel boolean NOT NULL DEFAULT true;