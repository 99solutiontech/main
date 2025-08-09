-- Allow users to delete their own transaction history so resets work
CREATE POLICY "Users can delete their own transaction history"
ON public.transaction_history
FOR DELETE
USING (auth.uid() = user_id);
