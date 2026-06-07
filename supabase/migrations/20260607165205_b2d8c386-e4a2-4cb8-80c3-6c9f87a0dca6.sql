
-- Tabela principal
CREATE TABLE public.holerite_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_pagamento_id UUID NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  protocolo TEXT NOT NULL UNIQUE,
  hash_documento TEXT NOT NULL,
  hash_assinatura TEXT,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  matricula TEXT,
  pdf_original_path TEXT NOT NULL,
  pdf_certificado_path TEXT,
  selfie_path TEXT,
  assinatura_imagem_path TEXT,
  ip_publico TEXT,
  user_agent TEXT,
  navegador TEXT,
  sistema_operacional TEXT,
  geo_latitude NUMERIC(10, 7),
  geo_longitude NUMERIC(10, 7),
  geo_consentimento BOOLEAN NOT NULL DEFAULT false,
  data_visualizacao TIMESTAMPTZ,
  data_assinatura TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'visualizado', 'assinado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (folha_pagamento_id, employee_id)
);
CREATE INDEX idx_holerite_assinaturas_employee ON public.holerite_assinaturas(employee_id);
CREATE INDEX idx_holerite_assinaturas_folha ON public.holerite_assinaturas(folha_pagamento_id);
CREATE INDEX idx_holerite_assinaturas_protocolo ON public.holerite_assinaturas(protocolo);
CREATE INDEX idx_holerite_assinaturas_status ON public.holerite_assinaturas(status);

GRANT SELECT, INSERT, UPDATE ON public.holerite_assinaturas TO authenticated;
GRANT SELECT ON public.holerite_assinaturas TO anon;
GRANT ALL ON public.holerite_assinaturas TO service_role;

ALTER TABLE public.holerite_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver holerite assinaturas"
ON public.holerite_assinaturas FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = holerite_assinaturas.employee_id AND e.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'admin_parcial')
);

-- Validação pública por protocolo (apenas leitura de dados básicos via política anon)
CREATE POLICY "validacao publica por protocolo"
ON public.holerite_assinaturas FOR SELECT
TO anon
USING (status = 'assinado');

CREATE POLICY "inserir holerite assinatura"
ON public.holerite_assinaturas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = holerite_assinaturas.employee_id AND e.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'admin_parcial')
);

CREATE POLICY "atualizar holerite pendente"
ON public.holerite_assinaturas FOR UPDATE
TO authenticated
USING (
  status <> 'assinado' AND (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = holerite_assinaturas.employee_id AND e.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin_parcial')
  )
);

CREATE OR REPLACE FUNCTION public.bloquear_alteracao_assinatura()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'assinado' THEN
      RAISE EXCEPTION 'Assinatura ja concluida e imutavel (protocolo %)', OLD.protocolo;
    END IF;
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

CREATE TRIGGER trg_bloquear_alteracao_assinatura
BEFORE UPDATE OR DELETE ON public.holerite_assinaturas
FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_assinatura();

-- Eventos
CREATE TABLE public.holerite_eventos_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assinatura_id UUID NOT NULL REFERENCES public.holerite_assinaturas(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  geo_latitude NUMERIC(10, 7),
  geo_longitude NUMERIC(10, 7),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_holerite_eventos_assinatura ON public.holerite_eventos_auditoria(assinatura_id);

GRANT SELECT, INSERT ON public.holerite_eventos_auditoria TO authenticated;
GRANT ALL ON public.holerite_eventos_auditoria TO service_role;

ALTER TABLE public.holerite_eventos_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver eventos auditoria"
ON public.holerite_eventos_auditoria FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.holerite_assinaturas a
    JOIN public.employees e ON e.id = a.employee_id
    WHERE a.id = holerite_eventos_auditoria.assinatura_id AND e.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'admin_parcial')
);

CREATE POLICY "inserir evento auditoria"
ON public.holerite_eventos_auditoria FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.holerite_assinaturas a
    JOIN public.employees e ON e.id = a.employee_id
    WHERE a.id = holerite_eventos_auditoria.assinatura_id AND e.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'admin_parcial')
);

CREATE OR REPLACE FUNCTION public.bloquear_alteracao_eventos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de auditoria sao imutaveis';
END;
$$;

CREATE TRIGGER trg_bloquear_alteracao_eventos
BEFORE UPDATE OR DELETE ON public.holerite_eventos_auditoria
FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_eventos();

-- Storage policies
CREATE POLICY "ver arquivos holerite assinado"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'holerites-assinados' AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin_parcial')
  )
);

CREATE POLICY "inserir arquivos holerite assinado"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'holerites-assinados' AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin_parcial')
  )
);
