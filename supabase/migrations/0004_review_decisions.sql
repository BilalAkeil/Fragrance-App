-- Rejection reasons were readable by anyone, because source_bottles and active
-- listings are public. Move every review decision into its own table that only
-- the seller and admins can read, and only approve the exact file the admin saw.

create table review_decisions (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('bottle', 'receipt')),
  -- source_bottles.id for a bottle, listings.id for a receipt.
  item_id uuid not null,
  seller_id uuid not null references sellers (id) on delete cascade,
  -- The video or receipt the admin looked at. A new upload has a new path, so
  -- an old rejection no longer applies to it.
  item_path text not null,
  approved boolean not null,
  reason text,
  decided_by uuid not null references auth.users (id),
  decided_at timestamptz not null default now(),
  constraint rejection_has_reason check (approved or coalesce(trim(reason), '') <> '')
);
create index review_decisions_item on review_decisions (item_type, item_id, decided_at desc);

alter table review_decisions enable row level security;
create policy "seller and admins see decisions" on review_decisions for select to authenticated
  using (seller_id = auth.uid() or is_admin());
revoke all on review_decisions from anon;
revoke insert, update, delete on review_decisions from authenticated;

-- Remove the public rejection columns from 0003 and the bottle trigger that
-- cleared them. A replaced receipt still loses its approval.
drop trigger source_bottles_reset_review on source_bottles;
drop function reset_bottle_review();
alter table source_bottles drop column rejected_at, drop column rejected_reason;
alter table listings drop column receipt_rejected_at, drop column receipt_rejected_reason;

create or replace function reset_receipt_review() returns trigger language plpgsql as $$
begin
  if new.receipt_path is distinct from old.receipt_path then
    new.receipt_verified := false;
  end if;
  return new;
end;
$$;

-- Replace the review functions with versions that take the path the admin saw.
drop function admin_review_bottle(uuid, boolean, text);
drop function admin_review_receipt(uuid, boolean, text);

create function admin_review_bottle(bottle_id uuid, approve boolean, seen_path text, reason text default null)
  returns void language plpgsql security definer set search_path = public as $$
declare
  b source_bottles%rowtype;
begin
  if not is_admin() then raise exception 'Only admins can review bottles'; end if;
  if not approve and coalesce(trim(reason), '') = '' then raise exception 'Give the seller a reason'; end if;
  select * into b from source_bottles where id = bottle_id for update;
  if not found then raise exception 'Bottle not found'; end if;
  if b.video_path is distinct from seen_path then
    raise exception 'The seller uploaded a new video. Reload and review it again';
  end if;
  insert into review_decisions (item_type, item_id, seller_id, item_path, approved, reason, decided_by)
    values ('bottle', b.id, b.seller_id, b.video_path, approve, case when approve then null else reason end, auth.uid());
  update source_bottles set verified_at = case when approve then now() else null end where id = b.id;
end;
$$;

create function admin_review_receipt(listing_id uuid, approve boolean, seen_path text, reason text default null)
  returns void language plpgsql security definer set search_path = public as $$
declare
  l listings%rowtype;
begin
  if not is_admin() then raise exception 'Only admins can review receipts'; end if;
  if not approve and coalesce(trim(reason), '') = '' then raise exception 'Give the seller a reason'; end if;
  select * into l from listings where id = listing_id for update;
  if not found or l.receipt_path is null then raise exception 'Receipt not found'; end if;
  if l.receipt_path is distinct from seen_path then
    raise exception 'The seller uploaded a new receipt. Reload and review it again';
  end if;
  insert into review_decisions (item_type, item_id, seller_id, item_path, approved, reason, decided_by)
    values ('receipt', l.id, l.seller_id, l.receipt_path, approve, case when approve then null else reason end, auth.uid());
  update listings set receipt_verified = approve where id = l.id;
end;
$$;

revoke execute on function admin_review_bottle(uuid, boolean, text, text) from public, anon;
revoke execute on function admin_review_receipt(uuid, boolean, text, text) from public, anon;
grant execute on function admin_review_bottle(uuid, boolean, text, text) to authenticated;
grant execute on function admin_review_receipt(uuid, boolean, text, text) to authenticated;
