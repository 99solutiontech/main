-- Allow users to delete their own transaction history so resets work
CREATE POLICY IF NOT EXISTS "Users can delete their own transaction history"
ON public.transaction_history
FOR DELETE
USING (auth.uid() = user_id);
