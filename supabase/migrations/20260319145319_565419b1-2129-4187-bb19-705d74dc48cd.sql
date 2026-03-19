
-- Create tarefas table
CREATE TABLE public.tarefas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  prioridade text NOT NULL DEFAULT 'media',
  data_vencimento date,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own tasks
CREATE POLICY "Users can view own tasks"
ON public.tarefas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
ON public.tarefas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON public.tarefas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON public.tarefas FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
