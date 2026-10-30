-- 005 Part B: reviews after a completed order (and, from 007, a swap).

-- AC-2.3: when an order was refunded after a dispute, so its review window can
-- be timed. Set only by transition_order, like the other step times.
alter table orders add column refunded_at timestamptz;

create or replace function transition_order(order_id uuid, event text, at timestamptz default now())
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
    cancelled_at = case when next_status = 'cancelled' then at else cancelled_at end,
    refunded_at = case when next_status = 'refunded' then at else refunded_at end
  where id = order_id;
  return next_status;
end;
$$;

-- Reviews: who wrote each one and who it's about, and an optional swap (the
-- foreign key comes with 007's swaps table). seller_id becomes reviewee_id.
alter table reviews rename column seller_id to reviewee_id;
alter table reviews alter column order_id drop not null;
alter table reviews
  add column swap_id uuid,
  -- Always the signed-in user: it isn't in the insert grant, so the default applies.
  add column reviewer_id uuid default auth.uid() references auth.users (id) on delete set null,
  add constraint reviews_order_or_swap check (num_nonnulls(order_id, swap_id) = 1),
  add constraint reviews_text_length check (char_length(text) <= 1000),
  -- R-5: one review per order (already unique), and one per side of a swap.
  add constraint reviews_one_per_swap_side unique (swap_id, reviewer_id);

create index reviews_reviewee on reviews (reviewee_id, created_at desc);

-- R-5, AC-2.2, AC-2.3: the buyer reviews the seller once, within 30 days of the
-- order completing, or of a refund after a dispute (REVIEW_WINDOW_DAYS in
-- packages/core). Delivered isn't enough any more. 007 adds the swap rule.
alter policy "buyer reviews a delivered order" on reviews rename to "buyer reviews a finished order";
alter policy "buyer reviews a finished order" on reviews
  with check (
    reviewer_id = (select auth.uid())
    and swap_id is null
    and exists (
      select 1 from orders o
      where o.id = reviews.order_id
        and o.buyer_id = (select auth.uid())
        and o.seller_id = reviews.reviewee_id
        and (
          (o.status = 'completed' and o.completed_at > now() - interval '30 days')
          or (o.status = 'refunded' and o.refunded_at > now() - interval '30 days')
        )
    )
  );

-- Ratings by whoever was reviewed, so swap reviews count too (plan Q-2). Runs
-- as the reader, now that reviews are public anyway (security advisor).
create or replace view seller_ratings with (security_invoker = true) as
select reviewee_id as seller_id, count(*) as review_count, avg(rating)::numeric(3, 2) as average_rating
from reviews
group by reviewee_id;
