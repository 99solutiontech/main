-- Re-run migration fixing pg_policies column name
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.run_forex_events_monitor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://yxrgknvprkvtdpzmpclh.supabase.co/functions/v1/forex-events-fetcher',
    headers := jsonb_build_object(
      'content-type','application/json'
    ),
    body := '{"currencies":["USD","EUR","JPY","GBP","CAD"]}'::jsonb
  );
END;
$function$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fund_data_updated_at') THEN
    CREATE TRIGGER update_fund_data_updated_at
    BEFORE UPDATE ON public.fund_data
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trading_history_updated_at') THEN
    CREATE TRIGGER update_trading_history_updated_at
    BEFORE UPDATE ON public.trading_history
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transaction_history_updated_at') THEN
    CREATE TRIGGER update_transaction_history_updated_at
    BEFORE UPDATE ON public.transaction_history
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_notifications_updated_at') THEN
    CREATE TRIGGER update_admin_notifications_updated_at
    BEFORE UPDATE ON public.admin_notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_economic_events_updated_at') THEN
    CREATE TRIGGER update_economic_events_updated_at
    BEFORE UPDATE ON public.economic_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at') THEN
    CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('99solutiontech', '99solutiontech', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read 99solutiontech'
  ) THEN
    CREATE POLICY "Public can read 99solutiontech"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = '99solutiontech');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload to 99solutiontech in own folder'
  ) THEN
    CREATE POLICY "Users can upload to 99solutiontech in own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = '99solutiontech' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own 99solutiontech objects'
  ) THEN
    CREATE POLICY "Users can update own 99solutiontech objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = '99solutiontech' AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = '99solutiontech' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;