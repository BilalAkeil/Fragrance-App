-- 003 checkout and payments: saved addresses, checkout reservations, seller
-- payouts and what an order records about its payment. Orders are only ever
-- written by server code after Stripe confirms the payment (R-5).

-- Each buyer's saved delivery addresses, private to them.
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (trim(name) <> ''),
  line1 text not null check (trim(line1) <> ''),
  line2 text,
  town text not null check (trim(town) <> ''),
  -- R-8: UK only, stored as normalisePostcode in packages/core writes it.
  postcode text not null check (postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  created_at timestamptz not null default now()
);
create index addresses_user on addresses (user_id, created_at desc);
alter table addresses enable row level security;
create policy "own addresses" on addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on addresses from anon;

-- AC-2.1: who is checking out a listing, and until when. Set only through
-- reserve_listing and server code: not in any grant.
alter table listings
  add column reserved_by uuid references auth.users (id) on delete set null,
  add column reserved_until timestamptz;

-- AC-3.1: set by server code from Stripe's account.updated webhook only.
alter table sellers add column payouts_ready boolean not null default false;

-- What an order records about its payment and delivery. Server code only.
alter table orders
  add column delivery_service text check (delivery_service in ('tracked24', 'tracked48')),
  -- A copy of the address at the time of payment. The buyer, the seller and
  -- admins can read it through the existing order policies.
  add column ship_to jsonb,
  add column stripe_checkout_session_id text unique,
  add column stripe_charge_id text,
  add column stripe_transfer_id text,
  add column paid_at timestamptz;

-- AC-2.2: a listing can only have one live order. A second payment that
-- collides with this is refunded.
create unique index orders_one_per_listing on orders (listing_id) where status not in ('cancelled', 'refunded');

-- Stripe event ids already handled, so a resent webhook does nothing.
create table webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table webhook_events enable row level security;
revoke all on webhook_events from anon, authenticated;

-- AC-2.1: holds a listing for the signed-in buyer until `until`, if it's
-- active, isn't theirs, and nobody else holds it. Returns false otherwise.
-- `until` comes from reservationEndsAt in packages/core; it can't be more than
-- 31 minutes away, so a buyer can't hold a listing for long.
create function reserve_listing(listing_id uuid, until timestamptz)
  returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if until <= now() or until > now() + interval '31 minutes' then
    raise exception 'A reservation lasts up to 30 minutes';
  end if;
  update listings set reserved_by = auth.uid(), reserved_until = until
    where id = listing_id
      and status = 'active'
      and seller_id <> auth.uid()
      and (reserved_by is null or reserved_by = auth.uid() or reserved_until < now());
  return found;
end;
$$;
revoke execute on function reserve_listing(uuid, timestamptz) from public, anon;
grant execute on function reserve_listing(uuid, timestamptz) to authenticated;
