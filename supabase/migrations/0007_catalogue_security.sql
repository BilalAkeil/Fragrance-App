-- 002 follow-up from the security advisor, after 0006 was applied.

-- Keep pg_trgm out of the exposed public schema. Existing indexes keep working.
alter extension pg_trgm set schema extensions;

-- A trigger function, never meant to be called directly.
revoke execute on function record_guide_price_change() from public, anon, authenticated;
