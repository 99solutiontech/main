-- Enable reliable realtime by ensuring WAL captures full rows and tables are in publication

-- 1) Set REPLICA IDENTITY FULL so updates send full row data
ALTER TABLE public.fund_data REPLICA IDENTITY FULL;
ALTER TABLE public.trading_history REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_history REPLICA IDENTITY FULL;
ALTER TABLE public.user_settings REPLICA IDENTITY FULL;
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

-- 2) Ensure the supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 3) Add tables to the publication only if not already present
DO $$
DECLARE
  tbl regclass;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'public.fund_data'::regclass,
    'public.trading_history'::regclass,
    'public.transaction_history'::regclass,
    'public.user_settings'::regclass,
    'public.admin_notifications'::regclass
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = split_part(tbl::text,'.',1)
        AND tablename = split_part(tbl::text,'.',2)
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', tbl);
    END IF;
  END LOOP;
END $$;