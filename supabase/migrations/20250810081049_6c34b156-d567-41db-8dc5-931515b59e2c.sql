-- Harden function by fixing search_path and qualifying extension schema
create or replace function public.run_forex_events_monitor()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform extensions.net.http_post(
    url := 'https://yxrgknvprkvtdpzmpclh.supabase.co/functions/v1/forex-events-fetcher',
    headers := jsonb_build_object(
      'content-type','application/json'
    ),
    body := '{"currencies":["USD","EUR","JPY","GBP","CAD"]}'
  );
end;
$$;