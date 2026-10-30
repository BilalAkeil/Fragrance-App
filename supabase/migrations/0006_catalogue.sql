-- 002 catalogue: houses, fragrances and bottle sizes with guide prices.
-- Everyone can read it, only admins can change it. Listings and source
-- bottles can link to a fragrance; unmatched ones keep the text the seller typed.

create extension if not exists pg_trgm;

create type concentration as enum ('edc', 'edt', 'edp', 'parfum', 'extrait', 'other');

-- Lowercase, common accents dropped, punctuation turned into spaces, with a
-- leading space so a search can match the start of any word ('% sauv%').
-- Matches normaliseName in packages/core closely enough for search.
create function catalogue_search_text(name text, aliases text[]) returns text
  language sql immutable set search_path = public as $$
  select ' ' || trim(regexp_replace(
    translate(lower(name || ' ' || array_to_string(aliases, ' ')),
      'àáâäãåèéêëìíîïòóôöõùúûüñç', 'aaaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create table houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (trim(name) <> ''),
  aliases text[] not null default '{}',
  search_text text generated always as (catalogue_search_text(name, aliases)) stored,
  created_at timestamptz not null default now()
);
create unique index houses_name_unique on houses (lower(name));
create index houses_search on houses using gin (search_text gin_trgm_ops);

-- R-1: unique by house, name and concentration.
create table fragrances (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses (id) on delete restrict,
  name text not null check (trim(name) <> ''),
  concentration concentration not null,
  launch_year integer check (launch_year between 1700 and 2100),
  aliases text[] not null default '{}',
  search_text text generated always as (catalogue_search_text(name, aliases)) stored,
  created_at timestamptz not null default now()
);
create unique index fragrances_unique on fragrances (house_id, lower(name), concentration);
create index fragrances_search on fragrances using gin (search_text gin_trgm_ops);

-- R-2: guide prices are integer pence above 0.
create table fragrance_sizes (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references fragrances (id) on delete cascade,
  size_ml integer not null check (size_ml > 0),
  guide_price_pence integer not null check (guide_price_pence > 0),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (fragrance_id, size_ml)
);

-- AC-3.4: every guide price change, and who made it.
create table guide_price_changes (
  id bigint generated always as identity primary key,
  size_id uuid not null references fragrance_sizes (id) on delete cascade,
  old_pence integer,
  new_pence integer not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index guide_price_changes_size on guide_price_changes (size_id, changed_at desc);

create function stamp_guide_price() returns trigger language plpgsql
  set search_path = public as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
-- Runs on every change, so updated_by and updated_at can't be set by hand.
create trigger fragrance_sizes_stamp before insert or update on fragrance_sizes
  for each row execute function stamp_guide_price();

-- Security definer so the history can be written without a grant on it.
create function record_guide_price_change() returns trigger language plpgsql
  security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.guide_price_pence is distinct from old.guide_price_pence then
    insert into guide_price_changes (size_id, old_pence, new_pence, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.guide_price_pence end, new.guide_price_pence, auth.uid());
  end if;
  return new;
end;
$$;
create trigger fragrance_sizes_history after insert or update of guide_price_pence on fragrance_sizes
  for each row execute function record_guide_price_change();

-- Who can see and change the catalogue.
alter table houses enable row level security;
alter table fragrances enable row level security;
alter table fragrance_sizes enable row level security;
alter table guide_price_changes enable row level security;

create policy "catalogue houses are public" on houses for select using (true);
create policy "admins add houses" on houses for insert to authenticated with check ((select is_admin()));
create policy "admins edit houses" on houses for update to authenticated
  using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete houses" on houses for delete to authenticated using ((select is_admin()));

create policy "catalogue fragrances are public" on fragrances for select using (true);
create policy "admins add fragrances" on fragrances for insert to authenticated with check ((select is_admin()));
create policy "admins edit fragrances" on fragrances for update to authenticated
  using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete fragrances" on fragrances for delete to authenticated using ((select is_admin()));

create policy "catalogue sizes are public" on fragrance_sizes for select using (true);
create policy "admins add sizes" on fragrance_sizes for insert to authenticated with check ((select is_admin()));
create policy "admins edit sizes" on fragrance_sizes for update to authenticated
  using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete sizes" on fragrance_sizes for delete to authenticated using ((select is_admin()));

create policy "admins see guide price history" on guide_price_changes for select to authenticated
  using ((select is_admin()));

revoke insert, update, delete on houses, fragrances, fragrance_sizes from anon;
revoke all on guide_price_changes from anon;
revoke insert, update, delete on guide_price_changes from authenticated;

-- Listings and source bottles can link to a fragrance.
alter table listings add column fragrance_id uuid references fragrances (id) on delete set null;
alter table source_bottles add column fragrance_id uuid references fragrances (id) on delete set null;
create index listings_fragrance on listings (fragrance_id);
create index source_bottles_fragrance on source_bottles (fragrance_id);
-- The admin queue of active listings nobody has matched yet (AC-3.2).
create index listings_unmatched on listings (created_at) where fragrance_id is null and status = 'active';

grant insert (fragrance_id), update (fragrance_id) on listings to authenticated;
grant insert (fragrance_id), update (fragrance_id) on source_bottles to authenticated;

-- The name shown for a matched fragrance. Matches fragranceDisplayName in packages/core.
create function fragrance_display_name(name text, c concentration) returns text
  language sql immutable set search_path = public as $$
  select case c
    when 'edc' then name || ' Eau de Cologne'
    when 'edt' then name || ' Eau de Toilette'
    when 'edp' then name || ' Eau de Parfum'
    when 'parfum' then name || ' Parfum'
    when 'extrait' then name || ' Extrait de Parfum'
    else name
  end
$$;

-- AC-1.3: a matched listing or bottle always shows the catalogue's spelling,
-- whatever the seller sent.
create function copy_catalogue_names() returns trigger language plpgsql
  set search_path = public as $$
begin
  if new.fragrance_id is not null then
    select h.name, fragrance_display_name(f.name, f.concentration)
      into new.house, new.name
      from fragrances f join houses h on h.id = f.house_id
      where f.id = new.fragrance_id;
  end if;
  return new;
end;
$$;
create trigger listings_catalogue_names before insert or update on listings
  for each row execute function copy_catalogue_names();
create trigger source_bottles_catalogue_names before insert or update on source_bottles
  for each row execute function copy_catalogue_names();

-- AC-3.2: an admin matches an unmatched listing to a fragrance.
create function admin_match_listing(listing_id uuid, fragrance_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can match listings'; end if;
  update listings set fragrance_id = admin_match_listing.fragrance_id where id = listing_id;
  if not found then raise exception 'Listing not found'; end if;
end;
$$;

-- AC-3.3: merge two entries for the same fragrance. Listings and bottles move to
-- the kept one, sizes it doesn't have move too, and the old name becomes an alias.
create function admin_merge_fragrance(from_id uuid, to_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare
  merged fragrances;
begin
  if not is_admin() then raise exception 'Only admins can merge fragrances'; end if;
  if from_id = to_id then raise exception 'Pick two different fragrances'; end if;
  select * into merged from fragrances where id = from_id;
  if merged.id is null or not exists (select 1 from fragrances where id = to_id) then
    raise exception 'Fragrance not found';
  end if;

  update listings set fragrance_id = to_id where fragrance_id = from_id;
  update source_bottles set fragrance_id = to_id where fragrance_id = from_id;
  update fragrance_sizes set fragrance_id = to_id
    where fragrance_id = from_id
      and size_ml not in (select size_ml from fragrance_sizes where fragrance_id = to_id);
  update fragrances set aliases = (
      select coalesce(array_agg(distinct a), '{}') from unnest(aliases || merged.name || merged.aliases) a
      where lower(a) <> lower(fragrances.name))
    where id = to_id;
  delete from fragrances where id = from_id;
end;
$$;

revoke execute on function admin_match_listing(uuid, uuid) from public, anon;
revoke execute on function admin_merge_fragrance(uuid, uuid) from public, anon;
grant execute on function admin_match_listing(uuid, uuid) to authenticated;
grant execute on function admin_merge_fragrance(uuid, uuid) to authenticated;
