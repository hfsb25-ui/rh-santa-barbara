CREATE TABLE public.holerite_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  tipo_folha text NOT NULL DEFAULT 'salario',
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','assinado')),
  protocolo text UNIQUE,
  hash_documento text,
  hash_assinatura text,
  pdf_assinado_path text,
  selfie_path text,
  assinatura_imagem_path text,
  ip_publico text,
  user_agent text,
  navegador text,
  sistema_operacional text,
  geo_latitude numeric,
  geo_longitude numeric,
  geo_consentimento boolean NOT NULL DEFAULT false,
  data_visualizacao timestamptz,
  data_assinatura timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, mes, ano, tipo_folha)
);
GRANT SELECT ON public.holerite_documentos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.holerite_documentos TO authenticated;
GRANT ALL ON public.holerite_documentos TO service_role;
ALTER TABLE public.holerite_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own payslip documents"
ON public.holerite_documentos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'));
CREATE POLICY "Managers insert payslip documents"
ON public.holerite_documentos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'));
CREATE POLICY "Managers update payslip documents"
ON public.holerite_documentos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'))
WITH CHECK (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'));
CREATE POLICY "Managers delete payslip documents"
ON public.holerite_documentos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'));
CREATE TRIGGER update_holerite_documentos_updated_at BEFORE UPDATE ON public.holerite_documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Payslip document files are private"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'holerites-importados' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial') OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid() AND (storage.foldername(name))[1] = e.id::text)));
CREATE POLICY "Managers upload payslip document files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'holerites-importados' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));
CREATE POLICY "Managers replace payslip document files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'holerites-importados' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')))
WITH CHECK (bucket_id = 'holerites-importados' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));
CREATE POLICY "Managers delete payslip document files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'holerites-importados' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));