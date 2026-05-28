
CREATE TABLE public.configuracao_alertas_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervalo_min_minutos integer NOT NULL DEFAULT 60,
  intervalo_max_minutos integer NOT NULL DEFAULT 120,
  tolerancia_atraso_minutos integer NOT NULL DEFAULT 10,
  tolerancia_saida_minutos integer NOT NULL DEFAULT 10,
  banco_horas_min numeric NOT NULL DEFAULT -10,
  banco_horas_max numeric NOT NULL DEFAULT 40,
  ocorrencias_minimas integer NOT NULL DEFAULT 3,
  janela_dias integer NOT NULL DEFAULT 30,
  alerta_intervalo_curto_ativo boolean NOT NULL DEFAULT true,
  alerta_intervalo_longo_ativo boolean NOT NULL DEFAULT true,
  alerta_atraso_ativo boolean NOT NULL DEFAULT true,
  alerta_saida_antecipada_ativo boolean NOT NULL DEFAULT true,
  alerta_banco_horas_ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracao_alertas_ponto TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.configuracao_alertas_ponto TO authenticated;
GRANT ALL ON public.configuracao_alertas_ponto TO service_role;

ALTER TABLE public.configuracao_alertas_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view alertas ponto config"
  ON public.configuracao_alertas_ponto FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Gestors can manage alertas ponto config"
  ON public.configuracao_alertas_ponto FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'admin_parcial'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'admin_parcial'::app_role));

CREATE TRIGGER update_configuracao_alertas_ponto_updated_at
  BEFORE UPDATE ON public.configuracao_alertas_ponto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracao_alertas_ponto DEFAULT VALUES;
