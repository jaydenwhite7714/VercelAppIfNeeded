-- Stripe test-mode subscription records and the Pro-only cloud reply-playbook feature.
-- Billing writes are accepted only through apply_stripe_subscription_event (service role).

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key check (stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  status text not null check (status in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
  plan_code text not null check (plan_code in ('pro','other')),
  price_id text not null check (price_id ~ '^price_[A-Za-z0-9]+$'),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_created bigint not null default 0 check (last_stripe_event_created >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists billing_subscriptions_user_id_idx on public.billing_subscriptions(user_id);

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key check (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null,
  event_created bigint not null check (event_created >= 0),
  received_at timestamptz not null default now()
);

create table if not exists public.pro_reply_playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  subject text not null default '' check (char_length(subject) <= 160),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pro_reply_playbooks_user_created_idx on public.pro_reply_playbooks(user_id, created_at desc);

alter table public.billing_customers enable row level security;
alter table public.billing_customers force row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_subscriptions force row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
alter table public.pro_reply_playbooks enable row level security;
alter table public.pro_reply_playbooks force row level security;

revoke all on public.billing_customers, public.billing_subscriptions, public.billing_webhook_events from anon, authenticated;
grant select on public.billing_customers, public.billing_subscriptions to authenticated;
grant all on public.billing_customers, public.billing_subscriptions, public.billing_webhook_events to service_role;
grant select, insert, update, delete on public.pro_reply_playbooks to authenticated;
grant all on public.pro_reply_playbooks to service_role;
create policy billing_customers_read_own on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()));
create policy billing_subscriptions_read_own on public.billing_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.has_active_pro_subscription(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) and exists (
    select 1 from public.billing_subscriptions s
    where s.user_id = p_user_id
      and s.status = 'active'
      and s.plan_code = 'pro'
      and s.current_period_end > now()
  );
$$;
revoke all on function public.has_active_pro_subscription(uuid) from public, anon;
grant execute on function public.has_active_pro_subscription(uuid) to authenticated, service_role;

create policy pro_reply_playbooks_select_own_pro on public.pro_reply_playbooks
  for select to authenticated using (
    user_id = (select auth.uid()) and (select public.has_active_pro_subscription((select auth.uid())))
  );
create policy pro_reply_playbooks_insert_own_pro on public.pro_reply_playbooks
  for insert to authenticated with check (
    user_id = (select auth.uid()) and (select public.has_active_pro_subscription((select auth.uid())))
  );
create policy pro_reply_playbooks_update_own_pro on public.pro_reply_playbooks
  for update to authenticated using (
    user_id = (select auth.uid()) and (select public.has_active_pro_subscription((select auth.uid())))
  ) with check (
    user_id = (select auth.uid()) and (select public.has_active_pro_subscription((select auth.uid())))
  );
create policy pro_reply_playbooks_delete_own_pro on public.pro_reply_playbooks
  for delete to authenticated using (
    user_id = (select auth.uid()) and (select public.has_active_pro_subscription((select auth.uid())))
  );

create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_plan_code text,
  p_price_id text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  inserted_event integer;
begin
  if p_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
    or p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
    or p_plan_code not in ('pro','other')
    or p_price_id !~ '^price_[A-Za-z0-9]+$'
    or p_event_created < 0
  then raise exception 'Invalid billing event'; end if;

  insert into public.billing_webhook_events(stripe_event_id, event_type, event_created)
  values (p_event_id, p_event_type, p_event_created)
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_event = row_count;
  if inserted_event = 0 then return false; end if;

  insert into public.billing_customers(user_id, stripe_customer_id)
  values (p_user_id, p_customer_id)
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    updated_at = now()
  where public.billing_customers.stripe_customer_id = excluded.stripe_customer_id;
  if not found then raise exception 'Stripe customer ownership conflict'; end if;

  insert into public.billing_subscriptions(
    stripe_subscription_id, user_id, stripe_customer_id, status, plan_code, price_id,
    current_period_end, cancel_at_period_end, last_stripe_event_created, updated_at
  ) values (
    p_subscription_id, p_user_id, p_customer_id, p_status, p_plan_code, p_price_id,
    p_current_period_end, p_cancel_at_period_end, p_event_created, now()
  )
  on conflict (stripe_subscription_id) do update set
    user_id = excluded.user_id,
    stripe_customer_id = excluded.stripe_customer_id,
    status = excluded.status,
    plan_code = excluded.plan_code,
    price_id = excluded.price_id,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_stripe_event_created = excluded.last_stripe_event_created,
    updated_at = now()
  where public.billing_subscriptions.user_id = excluded.user_id
    and public.billing_subscriptions.stripe_customer_id = excluded.stripe_customer_id
    and excluded.last_stripe_event_created >= public.billing_subscriptions.last_stripe_event_created;
  if not found and exists (
    select 1 from public.billing_subscriptions existing
    where existing.stripe_subscription_id = p_subscription_id
      and (existing.user_id <> p_user_id or existing.stripe_customer_id <> p_customer_id)
  ) then raise exception 'Stripe subscription ownership conflict'; end if;
  return true;
end;
$$;
revoke all on function public.apply_stripe_subscription_event(text,text,bigint,uuid,text,text,text,text,text,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(text,text,bigint,uuid,text,text,text,text,text,timestamptz,boolean) to service_role;
