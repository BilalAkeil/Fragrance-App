-- 010's plumbing, built with 003 and 004 so they can raise events: the in-app
-- notifications list. Rows are written by server code (notify() in the web
-- app); emails are sent from it later (010).

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null,
  entity_id uuid not null,
  data jsonb not null default '{}',
  link text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  emailed_at timestamptz,
  -- R-1: each event fires once per person and thing.
  unique (user_id, event, entity_id)
);
create index notifications_user on notifications (user_id, created_at desc);
create index notifications_unemailed on notifications (created_at) where emailed_at is null;

alter table notifications enable row level security;
create policy "own notifications" on notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark own notifications read" on notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on notifications from anon;
revoke insert, update, delete on notifications from authenticated;
grant update (read_at) on notifications to authenticated;
