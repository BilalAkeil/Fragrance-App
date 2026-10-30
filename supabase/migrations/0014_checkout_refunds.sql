-- 003/004 follow-up while building the server code.

-- A refund issued for an order (cancelled, a duplicate payment, or a dispute),
-- so the scheduled job can retry one that failed part-way.
alter table orders add column stripe_refund_id text;

-- Reservations last 31 minutes (RESERVATION_MINUTES in packages/core): a
-- Stripe Checkout Session can't expire sooner than 30 minutes, and it expires
-- with the reservation.
create or replace function reserve_listing(listing_id uuid, until timestamptz)
  returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if until <= now() or until > now() + interval '32 minutes' then
    raise exception 'A reservation lasts up to 31 minutes';
  end if;
  update listings set reserved_by = auth.uid(), reserved_until = until
    where id = listing_id
      and status = 'active'
      and seller_id <> auth.uid()
      and (reserved_by is null or reserved_by = auth.uid() or reserved_until < now());
  return found;
end;
$$;
