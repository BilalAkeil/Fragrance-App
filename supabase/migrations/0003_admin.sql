-- Admin review: who the admins are, and the only ways to approve or reject
-- what sellers submit. Add yourself as an admin in the SQL Editor with:
--   insert into admins (user_id) select id from auth.users where email = 'you@example.com';

create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;
create policy "see own admin row" on admins for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on admins from anon, authenticated;

create function is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

-- Rejections, so sellers can see why and resubmit.
alter table source_bottles add column rejected_at timestamptz, add column rejected_reason text;
alter table listings add column receipt_rejected_at timestamptz, add column receipt_rejected_reason text;

-- A new video clears an earlier rejection and goes back into the queue.
create function reset_bottle_review() returns trigger language plpgsql as $$
begin
  if new.video_path is distinct from old.video_path then
    new.rejected_at := null;
    new.rejected_reason := null;
  end if;
  return new;
end;
$$;
create trigger source_bottles_reset_review before update on source_bottles
  for each row execute function reset_bottle_review();

-- Same for a new receipt on a listing.
create function reset_receipt_review() returns trigger language plpgsql as $$
begin
  if new.receipt_path is distinct from old.receipt_path then
    new.receipt_verified := false;
    new.receipt_rejected_at := null;
    new.receipt_rejected_reason := null;
  end if;
  return new;
end;
$$;
create trigger listings_reset_receipt_review before update on listings
  for each row execute function reset_receipt_review();

-- Admins can see everything that is waiting for review.
create policy "admins see all listings" on listings for select to authenticated using (is_admin());
create policy "admins read private files" on storage.objects for select to authenticated
  using (bucket_id in ('bottle-videos', 'receipts') and is_admin());

create function admin_review_bottle(bottle_id uuid, approve boolean, reason text default null)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can review bottles'; end if;
  if not approve and coalesce(trim(reason), '') = '' then
    raise exception 'Give the seller a reason';
  end if;
  update source_bottles set
    verified_at = case when approve then now() else null end,
    rejected_at = case when approve then null else now() end,
    rejected_reason = case when approve then null else reason end
  where id = bottle_id;
end;
$$;

create function admin_review_receipt(listing_id uuid, approve boolean, reason text default null)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can review receipts'; end if;
  if not approve and coalesce(trim(reason), '') = '' then
    raise exception 'Give the seller a reason';
  end if;
  update listings set
    receipt_verified = approve,
    receipt_rejected_at = case when approve then null else now() end,
    receipt_rejected_reason = case when approve then null else reason end
  where id = listing_id and receipt_path is not null;
end;
$$;

-- Temporary until the Stripe identity check is built.
create function admin_set_id_verified(target_seller uuid, verified boolean)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can verify sellers'; end if;
  update sellers set id_verified = verified where id = target_seller;
end;
$$;

revoke execute on function admin_review_bottle(uuid, boolean, text) from public, anon;
revoke execute on function admin_review_receipt(uuid, boolean, text) from public, anon;
revoke execute on function admin_set_id_verified(uuid, boolean) from public, anon;
grant execute on function admin_review_bottle(uuid, boolean, text) to authenticated;
grant execute on function admin_review_receipt(uuid, boolean, text) to authenticated;
grant execute on function admin_set_id_verified(uuid, boolean) to authenticated;
