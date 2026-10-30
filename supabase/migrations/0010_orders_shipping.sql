-- 004 orders and shipping: deadlines, shipments and tracking, and order status
-- changes that only server code can make.

-- R-5: an unshipped order can end as cancelled.
alter type order_status add value if not exists 'cancelled';

-- Deadlines and when each step happened. Set only by server code: none of
-- these are in any grant.
alter table orders
  add column ship_by timestamptz,
  add column shipped_at timestamptz,
  add column delivered_at timestamptz,
  add column complete_after timestamptz,
  add column completed_at timestamptz,
  add column cancelled_at timestamptz;

-- Tracking is automatic now, so sellers no longer type it in.
drop policy "seller adds tracking" on orders;
revoke update (carrier, tracking_number) on orders from authenticated;

-- Admins can see every order (disputes, support).
create policy "admins see all orders" on orders for select to authenticated using ((select is_admin()));

-- Who can see an order's shipment and tracking: its buyer, its seller, and admins.
create function can_see_order(order_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from orders o
    where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)
  )
$$;

-- One shipment per order. Swaps reuse this table later (007).
create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id) on delete cascade,
  service text not null check (service in ('tracked24', 'tracked48')),
  provider text not null,
  provider_ref text,
  tracking_ref text,
  label_ref text,
  created_at timestamptz not null default now()
);

create table tracking_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references shipments (id) on delete cascade,
  at timestamptz not null,
  status text not null check (status in ('scanned', 'in_transit', 'delivered', 'exception')),
  description text not null default '',
  -- A resent webhook adds nothing.
  unique (shipment_id, at, status)
);

alter table shipments enable row level security;
alter table tracking_events enable row level security;
create policy "order parties see shipments" on shipments for select to authenticated
  using ((select can_see_order(order_id)));
create policy "order parties see tracking" on tracking_events for select to authenticated
  using (exists (select 1 from shipments s where s.id = shipment_id and (select can_see_order(s.order_id))));
revoke all on shipments, tracking_events from anon;
revoke insert, update, delete on shipments, tracking_events from authenticated;

-- Where a seller posts from, for delivery quotes. Only the seller can see it,
-- so it isn't on sellers, which everyone can read.
create table seller_settings (
  seller_id uuid primary key references sellers (id) on delete cascade,
  dispatch_postcode text check (dispatch_postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  updated_at timestamptz not null default now()
);
alter table seller_settings enable row level security;
create policy "sellers see own settings" on seller_settings for select to authenticated
  using (seller_id = (select auth.uid()));
create policy "sellers add own settings" on seller_settings for insert to authenticated
  with check (seller_id = (select auth.uid()));
create policy "sellers edit own settings" on seller_settings for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
revoke all on seller_settings from anon;
revoke delete on seller_settings from authenticated;

-- R-5: the only way an order's status changes, called by server code. Mirrors
-- nextOrderStatus in packages/core. Returns the new status, or raises if the
-- event doesn't apply.
create function transition_order(order_id uuid, event text, at timestamptz default now())
  returns order_status language plpgsql security definer set search_path = public as $$
declare
  current_status order_status;
  next_status order_status;
begin
  select status into current_status from orders where id = order_id for update;
  if current_status is null then raise exception 'Order not found'; end if;

  next_status := case current_status::text || ':' || event
    when 'paid:scanned' then 'shipped'
    when 'paid:delivered' then 'delivered'
    when 'paid:not_shipped_in_time' then 'cancelled'
    when 'shipped:delivered' then 'delivered'
    when 'delivered:everything_ok' then 'completed'
    when 'delivered:window_ended' then 'completed'
    when 'delivered:problem_reported' then 'disputed'
    when 'disputed:decided_for_seller' then 'completed'
    when 'disputed:decided_for_buyer' then 'refunded'
  end;
  if next_status is null then
    raise exception 'An order that is % can''t take "%"', current_status, event;
  end if;

  update orders set
    status = next_status,
    shipped_at = case when next_status = 'shipped' then at else shipped_at end,
    delivered_at = case when next_status = 'delivered' then at else delivered_at end,
    -- R-3: 48 hours from the delivered scan.
    complete_after = case when next_status = 'delivered' then at + interval '48 hours' else complete_after end,
    completed_at = case when next_status = 'completed' then at else completed_at end,
    cancelled_at = case when next_status = 'cancelled' then at else cancelled_at end
  where id = order_id;
  return next_status;
end;
$$;

revoke execute on function transition_order(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function transition_order(uuid, text, timestamptz) to service_role;

-- The scheduled job's lookups.
create index orders_ship_by on orders (ship_by) where status = 'paid';
create index orders_complete_after on orders (complete_after) where status = 'delivered';
create index orders_buyer on orders (buyer_id, created_at desc);
create index orders_seller on orders (seller_id, created_at desc);
