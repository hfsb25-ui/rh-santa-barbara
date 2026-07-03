
-- Permitir DELETE em eventos de auditoria (cascata do holerite); bloquear apenas UPDATE
CREATE OR REPLACE FUNCTION public.bloquear_alteracao_eventos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Eventos de auditoria sao imutaveis';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_alteracao_eventos ON public.holerite_eventos_auditoria;
CREATE TRIGGER trg_bloquear_alteracao_eventos
BEFORE UPDATE ON public.holerite_eventos_auditoria
FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_eventos();

-- Permitir DELETE em exportações fiscais quando o holerite pai é removido; bloquear apenas UPDATE
CREATE OR REPLACE FUNCTION public.bloquear_alteracao_exportacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Registros de exportacao de fiscalizacao sao imutaveis';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_update_exportacoes ON public.holerite_exportacoes_fiscalizacao;
CREATE TRIGGER trg_bloquear_update_exportacoes
BEFORE UPDATE ON public.holerite_exportacoes_fiscalizacao
FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_exportacoes();
