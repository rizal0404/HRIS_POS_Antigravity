-- Run this on your Supabase project to enable notification preferences + email queue

-- 1) Preferences table (one row per user)
create table if not exists notification_preferences (
    profile_id uuid primary key references profiles(id) on delete cascade,
    new_request boolean not null default true,
    request_approved boolean not null default true,
    request_rejected boolean not null default true,
    telegram_chat_id text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table notification_preferences
    add column if not exists telegram_chat_id text;

create or replace function notification_preferences_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notification_preferences_set_updated_at on notification_preferences;
create trigger trg_notification_preferences_set_updated_at
before update on notification_preferences
for each row execute function notification_preferences_set_updated_at();

alter table notification_preferences enable row level security;

drop policy if exists "Users can manage their notification preferences" on notification_preferences;
create policy "Users can manage their notification preferences"
    on notification_preferences for all
    using (auth.uid() = profile_id)
    with check (auth.uid() = profile_id);

-- Optional seeding: insert defaults for all profiles missing a row
-- insert into notification_preferences (profile_id)
-- select id from profiles p
-- where not exists (select 1 from notification_preferences np where np.profile_id = p.id);

-- 2) Simple logs table for troubleshooting
create table if not exists notification_logs (
    id bigserial primary key,
    profile_id uuid not null references profiles(id) on delete cascade,
    request_id bigint null references requests(id) on delete set null,
    event text not null check (event in ('created','approved','rejected')),
    status text not null check (status in ('queued','sent','failed')),
    error_text text null,
    created_at timestamptz not null default now()
);

-- 3) RPC: get preferences for current user
create or replace function get_notification_preferences()
returns notification_preferences
language sql
security definer
set search_path = public
as $$
  insert into notification_preferences (profile_id)
  values (auth.uid())
  on conflict (profile_id) do nothing;

  select * from notification_preferences where profile_id = auth.uid();
$$;

-- 4) RPC: update preferences for current user
create or replace function update_notification_preferences(
    p_new_request boolean,
    p_request_approved boolean,
    p_request_rejected boolean
)
returns notification_preferences
language sql
security definer
set search_path = public
as $$
  insert into notification_preferences (profile_id, new_request, request_approved, request_rejected)
  values (auth.uid(), coalesce(p_new_request, true), coalesce(p_request_approved, true), coalesce(p_request_rejected, true))
  on conflict (profile_id) do update set
    new_request = excluded.new_request,
    request_approved = excluded.request_approved,
    request_rejected = excluded.request_rejected,
    updated_at = now();

  select * from notification_preferences where profile_id = auth.uid();
$$;

-- 4b) RPC: update telegram chat id
create or replace function update_telegram_chat_id(
    p_telegram_chat_id text
)
returns notification_preferences
language sql
security definer
set search_path = public
as $$
  insert into notification_preferences (profile_id, telegram_chat_id)
  values (auth.uid(), nullif(p_telegram_chat_id, ''))
  on conflict (profile_id) do update set
    telegram_chat_id = nullif(p_telegram_chat_id, ''),
    updated_at = now();

  select * from notification_preferences where profile_id = auth.uid();
$$;

-- 5) Event enqueuing (store-and-forward)
create table if not exists notification_jobs (
    id bigserial primary key,
    profile_id uuid not null references profiles(id) on delete cascade,
    request_id bigint not null references requests(id) on delete cascade,
    event text not null check (event in ('created','approved','rejected')),
    created_at timestamptz not null default now(),
    processed_at timestamptz null,
    attempts int not null default 0,
    last_error text null
);

alter table notification_jobs enable row level security;

drop policy if exists "Only service role can access notification jobs" on notification_jobs;
create policy "Only service role can access notification jobs"
    on notification_jobs for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- 6) Trigger to enqueue events from requests table
create or replace function enqueue_notification_from_request()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into notification_jobs (profile_id, request_id, event)
    values (new.profile_id, new.id, 'created');
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'approved' then
      insert into notification_jobs (profile_id, request_id, event)
      values (new.profile_id, new.id, 'approved');
    elsif new.status = 'rejected' then
      insert into notification_jobs (profile_id, request_id, event)
      values (new.profile_id, new.id, 'rejected');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enqueue_notification_from_request on requests;
create trigger trg_enqueue_notification_from_request
after insert or update on requests
for each row execute function enqueue_notification_from_request();

-- 7) Edge Function / worker should:
--    - poll notification_jobs where processed_at is null and attempts < 5
--    - check notification_preferences for the target profile_id to decide delivery
--    - send email via SMTP (Supabase env SMTP_* must be configured)
--    - insert into notification_logs with status 'sent' or 'failed'
--    - update notification_jobs.processed_at and attempts/last_error accordingly
