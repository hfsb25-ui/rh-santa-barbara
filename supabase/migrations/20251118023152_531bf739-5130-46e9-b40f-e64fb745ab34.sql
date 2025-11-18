-- Add INSERT policy for login_history table
-- Users need to be able to insert their own login records
CREATE POLICY "Users can insert own login history"
ON public.login_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);