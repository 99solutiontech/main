-- Data Import Script for VPS Supabase
-- Run this on your new VPS Supabase instance after setting up the schema

-- Import profiles table
COPY public.profiles (
  id,
  user_id,
  full_name,
  trader_name,
  registration_status,
  is_active,
  role,
  created_at,
  updated_at
) FROM '/path/to/profiles.csv' WITH CSV HEADER;

-- Import fund_data table
COPY public.fund_data (
  id,
  user_id,
  initial_capital,
  total_capital,
  active_fund,
  reserve_fund,
  profit_fund,
  target_reserve_fund,
  mode,
  sub_user_name,
  profit_dist_profit,
  profit_dist_reserve,
  profit_dist_active,
  risk_percent,
  lot_base_capital,
  lot_base_lot,
  created_at,
  updated_at
) FROM '/path/to/fund_data.csv' WITH CSV HEADER;

-- Import trading_history table
COPY public.trading_history (
  id,
  user_id,
  mode,
  type,
  details,
  amount,
  end_balance,
  sub_user_name,
  trade_date,
  created_at
) FROM '/path/to/trading_history.csv' WITH CSV HEADER;

-- Import transaction_history table
COPY public.transaction_history (
  id,
  user_id,
  mode,
  transaction_type,
  description,
  amount,
  balance_before,
  balance_after,
  from_fund,
  to_fund,
  sub_user_name,
  created_at
) FROM '/path/to/transaction_history.csv' WITH CSV HEADER;

-- Import admin_notifications table
COPY public.admin_notifications (
  id,
  user_id,
  type,
  title,
  message,
  trader_name,
  is_read,
  created_at
) FROM '/path/to/admin_notifications.csv' WITH CSV HEADER;