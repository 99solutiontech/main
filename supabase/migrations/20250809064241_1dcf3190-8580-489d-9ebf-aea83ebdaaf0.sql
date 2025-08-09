-- Add initial fund data for the super admin
INSERT INTO public.fund_data (
  user_id,
  mode,
  initial_capital,
  total_capital,
  active_fund,
  reserve_fund,
  profit_fund,
  target_reserve_fund
)
SELECT 
  id,
  'live',
  10000.00,
  10000.00,
  10000.00,
  0.00,
  0.00,
  5000.00
FROM auth.users 
WHERE email = 'ceoserd@gmail.com';