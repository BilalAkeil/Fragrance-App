export function NotConnected() {
  return (
    <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
      Accounts need the Supabase keys. Add them to <code>apps/web/.env.local</code> as described in
      the README.
    </p>
  );
}
