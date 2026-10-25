-- Row level security. The anon key ships inside the apps, so every table must be
-- locked down here. Fields only the platform may set (id_verified, verified_at,
-- receipt_verified, order status) are left out of the column grants, so only the
-- service role (server code and admin tools) can change them.

alter table sellers enable row level security;
alter table source_bottles enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table orders enable row level security;
alter table reviews enable row level security;

-- Sellers
create policy "sellers are public" on sellers for select using (true);
create policy "create own seller profile" on sellers for insert to authenticated
  with check (id = auth.uid());
create policy "edit own seller profile" on sellers for update to authenticated
  using (id = auth.uid());
revoke insert, update on sellers from anon, authenticated;
grant insert (id, display_name) on sellers to authenticated;
grant update (display_name) on sellers to authenticated;

-- Source bottles (for decants)
create policy "source bottles are public" on source_bottles for select using (true);
create policy "register own source bottle" on source_bottles for insert to authenticated
  with check (seller_id = auth.uid());
create policy "edit own source bottle" on source_bottles for update to authenticated
  using (seller_id = auth.uid() and verified_at is null);
revoke insert, update on source_bottles from anon, authenticated;
grant insert (seller_id, house, name, size_ml, batch_code, video_path, receipt_path)
  on source_bottles to authenticated;
grant update (house, name, size_ml, batch_code, video_path, receipt_path)
  on source_bottles to authenticated;

-- Listings
create policy "active listings are public" on listings for select
  using (status = 'active' or seller_id = auth.uid());
create policy "create own listing" on listings for insert to authenticated
  with check (seller_id = auth.uid());
create policy "edit own listing" on listings for update to authenticated
  using (seller_id = auth.uid() and status in ('draft', 'active'));
revoke insert, update on listings from anon, authenticated;
grant insert (seller_id, house, name, kind, size_ml, fill_percent, condition, batch_code,
  price_pence, postage_pence, receipt_path, source_bottle_id, notes, status)
  on listings to authenticated;
grant update (house, name, size_ml, fill_percent, condition, batch_code, price_pence,
  postage_pence, receipt_path, source_bottle_id, notes, status)
  on listings to authenticated;

-- Listing photos
create policy "listing photos are public" on listing_photos for select using (true);
create policy "manage photos on own listings" on listing_photos for all to authenticated
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Orders: created by server code after payment, never directly by the apps.
create policy "buyer and seller see their orders" on orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "seller adds tracking" on orders for update to authenticated
  using (seller_id = auth.uid() and status in ('paid', 'shipped'));
revoke insert, update on orders from anon, authenticated;
grant update (carrier, tracking_number) on orders to authenticated;

-- Reviews: one per order, by the buyer, once the item has arrived.
create policy "reviews are public" on reviews for select using (true);
create policy "buyer reviews a delivered order" on reviews for insert to authenticated
  with check (exists (
    select 1 from orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
      and o.seller_id = reviews.seller_id
      and o.status in ('delivered', 'completed')
  ));
revoke insert, update on reviews from anon, authenticated;
grant insert (order_id, seller_id, rating, text) on reviews to authenticated;

-- Decants can never add up to more than their source bottle.
create function check_decant_capacity() returns trigger language plpgsql as $$
declare
  bottle_ml integer;
  used_ml integer;
begin
  if new.kind <> 'decant' or new.status = 'removed' then
    return new;
  end if;
  select size_ml into bottle_ml from source_bottles
    where id = new.source_bottle_id and seller_id = new.seller_id;
  if bottle_ml is null then
    raise exception 'Decants must link to one of your own source bottles';
  end if;
  select coalesce(sum(size_ml), 0) into used_ml from listings
    where source_bottle_id = new.source_bottle_id and status <> 'removed' and id <> new.id;
  if used_ml + new.size_ml > bottle_ml then
    raise exception 'Only %ml is left to decant from this %ml bottle', bottle_ml - used_ml, bottle_ml;
  end if;
  return new;
end;
$$;

create trigger listings_decant_capacity before insert or update on listings
  for each row execute function check_decant_capacity();

-- Storage: photos are public; bottle videos and receipts are private to the
-- seller and admins. Files go in a folder named after the user's id.
insert into storage.buckets (id, name, public) values
  ('listing-photos', 'listing-photos', true),
  ('bottle-videos', 'bottle-videos', false),
  ('receipts', 'receipts', false);

create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('listing-photos', 'bottle-videos', 'receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "read own private files" on storage.objects for select to authenticated
  using (
    bucket_id in ('bottle-videos', 'receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own files" on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
