-- Add updated_at column to trading_history table  
ALTER TABLE public.trading_history 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();