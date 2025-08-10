-- Enable required extensions
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Function to call the edge function to keep economic_events fresh
create or replace function public.run_forex_events_monitor()
returns void
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://yxrgknvprkvtdpzmpclh.supabase.co/functions/v1/forex-events-fetcher',
    headers := jsonb_build_object(
      'content-type','application/json'
    ),
    body := '{"currencies":["USD","EUR","JPY","GBP","CAD"]}'
  );
end;
$$;

-- Schedule it to run every minute (near real-time)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'forex_events_monitor_every_min') then
    perform cron.schedule('forex_events_monitor_every_min', '* * * * *', 'select public.run_forex_events_monitor()');
  end if;
end $$;