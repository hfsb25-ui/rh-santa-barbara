DROP POLICY IF EXISTS "Gestors can upload employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Gestors can update employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Gestors can delete employee photos" ON storage.objects;

CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-photos' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));

CREATE POLICY "Admins can update employee photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employee-photos' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')))
WITH CHECK (bucket_id = 'employee-photos' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));

CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employee-photos' AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial')));