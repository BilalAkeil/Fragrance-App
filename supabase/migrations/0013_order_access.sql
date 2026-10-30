-- 004 follow-up from the security advisor: can_see_order is only needed by
-- signed-in users (it backs the shipment and tracking policies).
revoke execute on function can_see_order(uuid) from public, anon;
grant execute on function can_see_order(uuid) to authenticated;
