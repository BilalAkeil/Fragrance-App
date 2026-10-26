# 009: Admin review queue, plan

- **Migrations:** `supabase/migrations/0003_admin.sql`, then `0004_review_decisions.sql`
  - `admins` table, with RLS limited to reading your own row and no insert, update or delete grants.
  - `is_admin()`, security definer.
  - 0004 moves rejections out of the public tables into `review_decisions` (R-5) and drops 0003's rejection columns. A rejection is matched to the file path it was made on, so a new upload clears it without a trigger (R-3). A trigger still resets `receipt_verified` when the receipt changes.
  - `admin_review_bottle`, `admin_review_receipt` and `admin_set_id_verified`: security definer functions that check `is_admin()` (R-1) and require a reason to reject (R-2). The review functions take the path the admin saw and refuse if it no longer matches (R-4). Execute is granted to `authenticated` only.
  - Policies so admins can select all listings and the private `bottle-videos` and `receipts` objects.
- **Web:** `apps/web/src/app/admin/` with a layout that checks `is_admin` server-side, server components for the queue and the sellers list, and server actions that call the functions. Videos and receipts open through 10-minute signed URLs. Styling uses the theme tokens in `globals.css`.
- **No `packages/core` change:** the rules are access rules, so they live in the database.
- **Testing:** run the migrations on a local Postgres with stubbed Supabase `auth` and `storage` schemas. Check that a non-admin is refused, that a rejection without a reason fails, that a new video clears the rejection, that a swapped video can't be approved, and that other users and anon can't read reasons.
