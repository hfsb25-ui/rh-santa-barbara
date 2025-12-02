-- Add RLS policy for employees to view their own work hour configuration
CREATE POLICY "Employees can view own work hour config"
ON public.configuracao_horas_trabalho
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = configuracao_horas_trabalho.employee_id
    AND employees.user_id = auth.uid()
  )
);