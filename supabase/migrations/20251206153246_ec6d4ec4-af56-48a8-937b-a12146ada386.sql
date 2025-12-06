-- Adicionar coluna para controlar visibilidade do holerite no dashboard do funcionário
ALTER TABLE public.configuracoes_dashboard_funcionario
ADD COLUMN holerite_visivel boolean NOT NULL DEFAULT true;