
CREATE TABLE public.holerite_exportacoes_fiscalizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exportado_por uuid NOT NULL,
  nome_exportador text,
  email_exportador text,
  filtros_aplicados jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantidade_holerites integer NOT NULL DEFAULT 0,
  quantidade_assinados integer NOT NULL DEFAULT 0,
  hash_pacote text,
  tamanho_bytes bigint,
  ip text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.holerite_exportacoes_fiscalizacao TO authenticated;
GRANT ALL ON public.holerite_exportacoes_fiscalizacao TO service_role;

ALTER TABLE public.holerite_exportacoes_fiscalizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver historico de exportacoes"
  ON public.holerite_exportacoes_fiscalizacao FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'admin_parcial'::app_role)
  );

CREATE OR REPLACE FUNCTION public.bloquear_alteracao_exportacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Registros de exportacao de fiscalizacao sao imutaveis';
END;
$$;

CREATE TRIGGER trg_bloquear_update_exportacoes
  BEFORE UPDATE OR DELETE ON public.holerite_exportacoes_fiscalizacao
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_exportacoes();

CREATE INDEX idx_exportacoes_fiscalizacao_por ON public.holerite_exportacoes_fiscalizacao(exportado_por);
CREATE INDEX idx_exportacoes_fiscalizacao_data ON public.holerite_exportacoes_fiscalizacao(created_at DESC);
