-- Add updated_at column to trading_history table
ALTER TABLE public.trading_history 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_trading_history_updated_at
    BEFORE UPDATE ON public.trading_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();