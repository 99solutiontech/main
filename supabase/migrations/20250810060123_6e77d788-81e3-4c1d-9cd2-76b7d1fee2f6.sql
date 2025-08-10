-- Create table for economic events
CREATE TABLE IF NOT EXISTS public.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'forexfactory',
  title text NOT NULL,
  currency text NOT NULL,
  impact_level text NOT NULL,
  event_time timestamptz NOT NULL,
  forecast text,
  previous text,
  actual text,
  detail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT impact_level_check CHECK (impact_level IN ('high','medium','low'))
);

-- Enable RLS and policies
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'economic_events' AND policyname = 'Allow authenticated users to view economic events'
  ) THEN
    CREATE POLICY "Allow authenticated users to view economic events"
    ON public.economic_events
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Unique constraint to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_unique
ON public.economic_events (source, currency, title, event_time);

-- Trigger to auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_economic_events_updated_at'
  ) THEN
    CREATE TRIGGER update_economic_events_updated_at
    BEFORE UPDATE ON public.economic_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Realtime setup
ALTER TABLE public.economic_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.economic_events;
    EXCEPTION WHEN duplicate_object THEN
      -- already added
      NULL;
    END;
  END IF;
END $$;

-- Ensure required extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule periodic fetching every 15 minutes
DO $$ BEGIN
  PERFORM 1 FROM cron.job WHERE jobname = 'fetch-forex-events-15-min';
  IF NOT FOUND THEN
    PERFORM cron.schedule(
      'fetch-forex-events-15-min',
      '*/15 * * * *',
      $$
      select
        net.http_post(
          url:='https://yxrgknvprkvtdpzmpclh.supabase.co/functions/v1/forex-events-fetcher',
          headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4cmdrbnZwcmt2dGRwem1wY2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxOTczMjQsImV4cCI6MjA2OTc3MzMyNH0.CxqJVEg1z6GYJeWqzcU_Ab1uV0Kvbg-CzzkDLJSwOiE"}'::jsonb,
          body:='{"schedule":"cron"}'::jsonb
        );
      $$
    );
  END IF;
END $$;