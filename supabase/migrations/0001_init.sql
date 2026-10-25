-- Core marketplace tables. Money is stored as integer pence (GBP).

create table sellers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  -- Set by the Stripe identity check webhook.
  id_verified boolean not null default false,
  stripe_account_id text,
  created_at timestamptz not null default now()
);

create table source_bottles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  house text not null,
  name text not null,
  size_ml integer not null check (size_ml > 0),
  batch_code text not null,
  video_path text not null,
  receipt_path text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create type listing_kind as enum ('full', 'partial', 'decant');
create type listing_condition as enum ('new_sealed', 'new_unsealed', 'used');
create type listing_status as enum ('draft', 'active', 'sold', 'removed');

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  house text not null,
  name text not null,
  kind listing_kind not null,
  size_ml integer not null check (size_ml > 0),
  fill_percent integer check (fill_percent between 1 and 100),
  condition listing_condition not null,
  batch_code text not null,
  price_pence integer not null check (price_pence > 0),
  postage_pence integer not null check (postage_pence >= 0),
  receipt_path text,
  receipt_verified boolean not null default false,
  source_bottle_id uuid references source_bottles (id),
  notes text[] not null default '{}',
  status listing_status not null default 'draft',
  created_at timestamptz not null default now(),
  constraint decant_rules check (
    kind <> 'decant' or (size_ml >= 5 and source_bottle_id is not null)
  )
);

create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  path text not null,
  position integer not null default 0
);

create type order_status as enum ('paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded');

create table orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id),
  buyer_id uuid not null references auth.users (id),
  seller_id uuid not null references sellers (id),
  item_pence integer not null,
  postage_pence integer not null,
  protection_fee_pence integer not null,
  carrier text,
  tracking_number text,
  stripe_payment_intent_id text,
  status order_status not null default 'paid',
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id),
  seller_id uuid not null references sellers (id),
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

create view seller_ratings as
select seller_id, count(*) as review_count, avg(rating)::numeric(3, 2) as average_rating
from reviews
group by seller_id;

create index listings_search on listings
  using gin (to_tsvector('english', house || ' ' || name || ' ' || array_to_string(notes, ' ')));
