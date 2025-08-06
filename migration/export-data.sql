-- Data Export Script for Migration to VPS Supabase
-- Run this on your current Supabase.com instance to export data

-- Export profiles table
COPY (
  SELECT 
    id,
    user_id,
    full_name,
    trader_name,
    registration_status,
    is_active,
    role,
    created_at,
    updated_at
  FROM public.profiles
) TO STDOUT WITH CSV HEADER;

-- Note: Save this output as profiles.csv

-- Export fund_data table  
COPY (
  SELECT 
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
  FROM public.fund_data
) TO STDOUT WITH CSV HEADER;

-- Note: Save this output as fund_data.csv

-- Export trading_history table
COPY (
  SELECT 
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
  FROM public.trading_history
) TO STDOUT WITH CSV HEADER;

-- Note: Save this output as trading_history.csv

-- Export transaction_history table
COPY (
  SELECT 
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
  FROM public.transaction_history
) TO STDOUT WITH CSV HEADER;

-- Note: Save this output as transaction_history.csv

-- Export admin_notifications table
COPY (
  SELECT 
    id,
    user_id,
    type,
    title,
    message,
    trader_name,
    is_read,
    created_at
  FROM public.admin_notifications
) TO STDOUT WITH CSV HEADER;

-- Note: Save this output as admin_notifications.csv