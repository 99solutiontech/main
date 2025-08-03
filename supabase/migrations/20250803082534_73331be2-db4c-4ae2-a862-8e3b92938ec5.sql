-- Enable real-time updates for trading tables
ALTER TABLE public.fund_data REPLICA IDENTITY FULL;
ALTER TABLE public.trading_history REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_history REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fund_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_history;