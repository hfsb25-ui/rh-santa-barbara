DROP POLICY IF EXISTS "Payslip document files are private" ON storage.objects;

CREATE POLICY "Managers read imported payslip document files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'holerites-importados'
  AND (
    public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin_parcial')
  )
);