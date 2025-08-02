-- Drop the old fund_transactions table
DROP TABLE IF EXISTS public.fund_transactions;

-- Create new transaction_history table with improved structure
CREATE TABLE public.transaction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  from_fund TEXT,
  to_fund TEXT,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT NOT NULL,
  sub_user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction_history
CREATE POLICY "Users can view their own transaction history" 
ON public.transaction_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction history" 
ON public.transaction_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all transaction history" 
ON public.transaction_history 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'super_admin'::text))));

-- Create index for better performance
CREATE INDEX idx_transaction_history_user_mode ON public.transaction_history(user_id, mode);
CREATE INDEX idx_transaction_history_sub_user ON public.transaction_history(user_id, mode, sub_user_name);
CREATE INDEX idx_transaction_history_created_at ON public.transaction_history(created_at DESC);