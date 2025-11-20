-- Allow employees to update their own signature fields on EPIs
CREATE POLICY "Funcionarios can sign own EPIs"
ON public.epis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = epis.employee_id
    AND employees.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = epis.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Allow employees to update their own signature fields on Uniforms
CREATE POLICY "Funcionarios can sign own uniforms"
ON public.uniformes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = uniformes.employee_id
    AND employees.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = uniformes.employee_id
    AND employees.user_id = auth.uid()
  )
);