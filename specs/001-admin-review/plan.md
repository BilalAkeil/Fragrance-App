# 001: Admin review queue, plan

- **Migration:** `supabase/migrations/0003_admin.sql`
  - `admins` table, with RLS limited to reading your own row and no insert, update or delete grants.
  - `is_admin()`, security definer.
  - Rejection columns on `source_bottles` and `listings`. These aren't in any column grant, so the apps can't set them.
  - Triggers that clear a rejection when `video_path` or `receipt_path` changes (R-3).
  - `admin_review_bottle`, `admin_review_receipt` and `admin_set_id_verified`: security definer functions that check `is_admin()` (R-1) and require a reason to reject (R-2). Execute is granted to `authenticated` only.
  - Policies so admins can select all listings and the private `bottle-videos` and `receipts` objects.
- **Web:** `apps/web/src/app/admin/` with a layout that checks `is_admin` server-side, server components for the queue and the sellers list, and server actions that call the functions. Videos and receipts open through 10-minute signed URLs. Styling uses the theme tokens in `globals.css`.
- **No `packages/core` change:** the rules are access rules, so they live in the database.
- **Testing:** run the migrations on a local Postgres with stubbed Supabase `auth` and `storage` schemas. Check that a non-admin is refused, that a rejection without a reason fails, and that a new video clears the rejection.
