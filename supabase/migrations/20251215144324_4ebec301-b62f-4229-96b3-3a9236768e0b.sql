-- Create table for custom badge templates
CREATE TABLE public.cracha_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  background_url TEXT,
  configuracao_json JSONB NOT NULL DEFAULT '{}',
  orientacao TEXT NOT NULL DEFAULT 'horizontal' CHECK (orientacao IN ('horizontal', 'vertical')),
  largura INTEGER NOT NULL DEFAULT 85,
  altura INTEGER NOT NULL DEFAULT 54,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cracha_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Gestors can manage all badge templates"
ON public.cracha_templates
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_cracha_templates_updated_at
BEFORE UPDATE ON public.cracha_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for badge template backgrounds
INSERT INTO storage.buckets (id, name, public) VALUES ('cracha-templates', 'cracha-templates', true);

-- Storage policies for badge templates
CREATE POLICY "Public can view badge template images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cracha-templates');

CREATE POLICY "Gestors can upload badge template images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cracha-templates' AND has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can update badge template images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cracha-templates' AND has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can delete badge template images"
ON storage.objects FOR DELETE
USING (bucket_id = 'cracha-templates' AND has_role(auth.uid(), 'gestor'::app_role));