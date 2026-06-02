
CREATE POLICY "Public read cracha templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'cracha-templates');

CREATE POLICY "Authenticated upload cracha templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cracha-templates');

CREATE POLICY "Authenticated update cracha templates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cracha-templates');

CREATE POLICY "Authenticated delete cracha templates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cracha-templates');
