-- Add photo URL column to employees table
ALTER TABLE public.employees 
ADD COLUMN foto_url TEXT;

-- Create storage bucket for employee photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true);

-- Create policy to allow gestors to upload employee photos
CREATE POLICY "Gestors can upload employee photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Create policy to allow gestors to update employee photos
CREATE POLICY "Gestors can update employee photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Create policy to allow gestors to delete employee photos
CREATE POLICY "Gestors can delete employee photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Create policy to allow everyone to view employee photos (public bucket)
CREATE POLICY "Employee photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'employee-photos');