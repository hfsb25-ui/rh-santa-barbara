CREATE POLICY "Gestors can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin_parcial'));