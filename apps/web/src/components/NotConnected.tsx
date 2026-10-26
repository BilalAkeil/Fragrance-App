export function NotConnected() {
  return (
    <p className="rounded-xl bg-[#fdf1e1] px-4 py-3 text-sm text-[#7a4200]">
      Accounts need the Supabase keys. Add them to <code>apps/web/.env.local</code> as described in
      the README.
    </p>
  );
}
