-- Create table for login history
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Gestors can view all login history
CREATE POLICY "Gestors can view all login history"
ON public.login_history
FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Create index for better performance
CREATE INDEX idx_login_history_employee_id ON public.login_history(employee_id);
CREATE INDEX idx_login_history_login_at ON public.login_history(login_at DESC);