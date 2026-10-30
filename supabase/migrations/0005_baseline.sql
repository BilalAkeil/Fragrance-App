-- 001 baseline: batch codes and decant source bottles become optional, sold
-- listings stay visible, and only server code can mark a listing sold.

-- Not every bottle has a batch code.
alter table listings alter column batch_code drop not null;
alter table source_bottles alter column batch_code drop not null;

-- Decants keep the 5ml minimum but no longer need a source bottle.
alter table listings drop constraint decant_rules;
alter table listings add constraint decant_min_size check (kind <> 'decant' or size_ml >= 5);

-- The capacity check only applies to decants linked to a bottle.
create or replace function check_decant_capacity() returns trigger language plpgsql
  set search_path = public as $$
declare
  bottle_ml integer;
  used_ml integer;
begin
  if new.kind <> 'decant' or new.status = 'removed' or new.source_bottle_id is null then
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
    raise exception 'Only %ml is left to decant from this %ml bottle.', bottle_ml - used_ml, bottle_ml;
  end if;
  return new;
end;
$$;

-- Sold listings stay public so their page can say so. Removed ones are only
-- visible to their seller (and admins, through 0003's policy).
drop policy "active listings are public" on listings;
create policy "active and sold listings are public" on listings for select
  using (status in ('active', 'sold') or seller_id = auth.uid());

-- Sellers list straight to active, and can only move a listing between active
-- and removed. Only server code (service role) can set sold.
drop policy "create own listing" on listings;
create policy "create own listing" on listings for insert to authenticated
  with check (seller_id = auth.uid() and status = 'active');
drop policy "edit own listing" on listings;
create policy "edit own listing" on listings for update to authenticated
  using (seller_id = auth.uid() and status in ('draft', 'active'))
  with check (seller_id = auth.uid() and status in ('active', 'removed'));

-- When a listing last changed.
alter table listings add column updated_at timestamptz not null default now();

create function set_updated_at() returns trigger language plpgsql
  set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger listings_set_updated_at before update on listings
  for each row execute function set_updated_at();
