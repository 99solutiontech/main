-- Set default values for profit distribution when creating new fund data
-- Update fund_data table to set default profit distribution values
ALTER TABLE public.fund_data 
ALTER COLUMN profit_dist_active SET DEFAULT 0,
ALTER COLUMN profit_dist_reserve SET DEFAULT 30,
ALTER COLUMN profit_dist_profit SET DEFAULT 70;

-- Update existing fund_data records that have null values
UPDATE public.fund_data 
SET 
  profit_dist_active = COALESCE(profit_dist_active, 0),
  profit_dist_reserve = COALESCE(profit_dist_reserve, 30),
  profit_dist_profit = COALESCE(profit_dist_profit, 70)
WHERE profit_dist_active IS NULL OR profit_dist_reserve IS NULL OR profit_dist_profit IS NULL;

-- Set default risk percentage in user_settings when creating new entries
-- Add default lot size settings for new users
CREATE OR REPLACE FUNCTION public.set_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default lot size settings if not provided
  IF NEW.lot_size_settings IS NULL THEN
    NEW.lot_size_settings = jsonb_build_object(
      'risk_percent', 40
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default user settings
CREATE TRIGGER set_default_user_settings_trigger
  BEFORE INSERT ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_user_settings();