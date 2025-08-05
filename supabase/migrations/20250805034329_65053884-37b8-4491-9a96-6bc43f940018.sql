-- Add risk_percent column to fund_data table for risk calculation feature
ALTER TABLE public.fund_data 
ADD COLUMN risk_percent NUMERIC DEFAULT 40;