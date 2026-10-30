-- 002: source bottles typed in by sellers go in the same unmatched queue as
-- listings (AC-3.2), so admins can match them too.
create function admin_match_bottle(bottle_id uuid, fragrance_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can match bottles'; end if;
  update source_bottles set fragrance_id = admin_match_bottle.fragrance_id where id = bottle_id;
  if not found then raise exception 'Bottle not found'; end if;
end;
$$;

revoke execute on function admin_match_bottle(uuid, uuid) from public, anon;
grant execute on function admin_match_bottle(uuid, uuid) to authenticated;

create index source_bottles_unmatched on source_bottles (created_at) where fragrance_id is null;
