-- 005 Part A: the ID check before listing (R-1, R-2).

-- Where each seller's ID check stands, from Stripe Identity. Set only by server
-- code (the webhook and the start of a check), so there are no write policies
-- or grants. It's kept off sellers, which everyone can read.
create type id_check_status as enum ('not_started', 'pending', 'verified', 'needs_input');

create table id_checks (
  seller_id uuid primary key references sellers (id) on delete cascade,
  status id_check_status not null default 'not_started',
  -- The latest Identity VerificationSession.
  stripe_verification_session_id text unique,
  -- Why it needs input: Stripe's last_error code, or 'under_age' (Q-6).
  error_code text,
  updated_at timestamptz not null default now()
);

alter table id_checks enable row level security;
create policy "sellers see own id check" on id_checks for select to authenticated
  using (seller_id = (select auth.uid()));
create policy "admins see id checks" on id_checks for select to authenticated
  using ((select is_admin()));
revoke all on id_checks from anon;
revoke insert, update, delete on id_checks from authenticated;

-- R-2: only a seller with a verified ID can list or register a source bottle.
-- id_verified is set by server code from Stripe's result, or by an admin
-- (admin_set_id_verified), never by the apps (R-1).
alter policy "create own listing" on listings
  with check (
    seller_id = (select auth.uid())
    and status = 'active'
    and exists (select 1 from sellers s where s.id = (select auth.uid()) and s.id_verified)
  );

alter policy "register own source bottle" on source_bottles
  with check (
    seller_id = (select auth.uid())
    and exists (select 1 from sellers s where s.id = (select auth.uid()) and s.id_verified)
  );
