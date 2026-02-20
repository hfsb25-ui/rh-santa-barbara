
-- Tabela de contatos salvos para envio de mensagens WhatsApp
CREATE TABLE public.whatsapp_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  numero TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_contatos ENABLE ROW LEVEL SECURITY;

-- Policies - apenas gestores
CREATE POLICY "Gestores podem gerenciar contatos WhatsApp"
ON public.whatsapp_contatos
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_contatos_updated_at
BEFORE UPDATE ON public.whatsapp_contatos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
