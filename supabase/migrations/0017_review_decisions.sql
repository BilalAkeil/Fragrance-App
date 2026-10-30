-- 005 open questions settled by copying Vinted (Q-3): reviews can be left for
-- 4 days after an order ends (was 30), and the person reviewed can reply once.

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
          (o.status = 'completed' and o.completed_at > now() - interval '4 days')
          or (o.status = 'refunded' and o.refunded_at > now() - interval '4 days')
        )
    )
  );

alter table reviews
  add column reply text check (char_length(reply) between 1 and 1000),
  add column replied_at timestamptz;

-- When the reply was written. Set here, so nobody can backdate it.
create function set_review_replied_at() returns trigger language plpgsql
  set search_path = public as $$
begin
  new.replied_at := now();
  return new;
end;
$$;
create trigger reviews_set_replied_at before update of reply on reviews
  for each row execute function set_review_replied_at();

-- Only the reply, only by the person reviewed, and only once.
create policy "reviewee replies once" on reviews for update to authenticated
  using (reviewee_id = (select auth.uid()) and reply is null)
  with check (reviewee_id = (select auth.uid()));
grant update (reply) on reviews to authenticated;
