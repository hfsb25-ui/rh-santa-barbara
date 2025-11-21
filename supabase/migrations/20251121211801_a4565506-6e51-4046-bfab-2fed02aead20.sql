-- Criar bucket de storage para arquivos dos funcionários
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-files', 'employee-files', false)
ON CONFLICT (id) DO NOTHING;

-- Criar tabela para registrar os arquivos
CREATE TABLE IF NOT EXISTS public.employee_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_files ENABLE ROW LEVEL SECURITY;

-- Gestors can manage all files
CREATE POLICY "Gestors can manage all employee files"
ON public.employee_files
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Funcionarios can view own files
CREATE POLICY "Funcionarios can view own employee files"
ON public.employee_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_files.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- RLS policies for storage bucket
CREATE POLICY "Gestors can upload employee files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-files'
  AND has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Gestors can view all employee files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-files'
  AND has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Funcionarios can view own employee files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-files'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.employees
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Gestors can delete employee files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-files'
  AND has_role(auth.uid(), 'gestor'::app_role)
);