-- Create app_settings table to store portable configuration like functions base URL
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Enable RLS and restrict to admins
alter table public.app_settings enable row level security;

-- Drop existing policies if any to avoid duplicates
do $$ begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_settings' and policyname='Admins can manage app settings'
  ) then
    execute 'drop policy "Admins can manage app settings" on public.app_settings';
  end if;
end $$;

create policy "Admins can manage app settings"
  on public.app_settings
  for all
  using (get_current_user_role() = any (array['admin','super_admin']))
  with check (get_current_user_role() = any (array['admin','super_admin']));

-- Seed default base URL if not present (current project URL)
insert into public.app_settings (key, value)
values ('functions_base_url', 'https://yxrgknvprkvtdpzmpclh.supabase.co')
on conflict (key) do nothing;

-- Ensure unique index for economic events to prevent duplicates on upsert
create unique index if not exists uq_economic_events_src_cur_title_time
  on public.economic_events (source, currency, title, event_time);

-- Update the monitor function to use the configurable base URL
create or replace function public.run_forex_events_monitor()
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  base_url text;
  endpoint text;
begin
  select value into base_url from public.app_settings where key = 'functions_base_url' limit 1;
  if base_url is null or base_url = '' then
    base_url := 'https://yxrgknvprkvtdpzmpclh.supabase.co';
  end if;
  endpoint := base_url || '/functions/v1/forex-events-fetcher';

  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object('content-type','application/json'),
    body := jsonb_build_object('currencies', array['USD','EUR','JPY','GBP','CAD'])
  );
end;
$$;

-- Create/refresh a cron job to invoke the monitor every 10 minutes
select cron.unschedule('invoke-forex-events-fetcher-every-10min')
where exists (select 1 from cron.job where jobname = 'invoke-forex-events-fetcher-every-10min');

select cron.schedule(
  'invoke-forex-events-fetcher-every-10min',
  '*/10 * * * *',
  $$ select public.run_forex_events_monitor(); $$
);
