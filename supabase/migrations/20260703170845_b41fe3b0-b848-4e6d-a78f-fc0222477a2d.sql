CREATE OR REPLACE FUNCTION public.bloquear_alteracao_assinatura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'assinado' THEN
      IF NEW.hash_documento IS DISTINCT FROM OLD.hash_documento
        OR NEW.hash_assinatura IS DISTINCT FROM OLD.hash_assinatura
        OR NEW.protocolo IS DISTINCT FROM OLD.protocolo
        OR NEW.data_assinatura IS DISTINCT FROM OLD.data_assinatura
        OR NEW.cpf IS DISTINCT FROM OLD.cpf
        OR NEW.selfie_path IS DISTINCT FROM OLD.selfie_path
        OR NEW.assinatura_imagem_path IS DISTINCT FROM OLD.assinatura_imagem_path
        OR NEW.ip_publico IS DISTINCT FROM OLD.ip_publico
        OR NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Campos imutaveis apos assinatura';
      END IF;
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;