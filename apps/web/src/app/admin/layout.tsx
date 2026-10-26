import Link from "next/link";
import { redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) return <NotConnected />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return <p className="opacity-70">This page is only for the marketplace team.</p>;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav aria-label="Admin" className="flex shrink-0 flex-row gap-1 rounded-2xl bg-[#17151C] p-3 md:w-56 md:flex-col">
        <span className="hidden px-3 pb-3 font-extrabold text-white md:block">Admin</span>
        <Link href="/admin" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#D6D2DC] hover:bg-[#2C2933] hover:text-white">
          Review queue
        </Link>
        <Link href="/admin/sellers" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#D6D2DC] hover:bg-[#2C2933] hover:text-white">
          Sellers
        </Link>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
