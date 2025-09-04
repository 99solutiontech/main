-- Create table to store original fund states before edits
CREATE TABLE IF NOT EXISTS public.trading_record_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trading_record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  sub_user_name TEXT,
  original_fund_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_record_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own snapshots" 
ON public.trading_record_snapshots 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all snapshots" 
ON public.trading_record_snapshots 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));