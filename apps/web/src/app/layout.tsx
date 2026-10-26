import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { buttonPrimary } from "@/components/ui";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Fragrance Marketplace",
  description: "Buy and sell fragrances from certified sellers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={manrope.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <header className="border-b border-mist-line bg-mist">
          <div className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-ink">
              Fragrance Marketplace
            </Link>
            <form action="/" role="search" className="min-w-64 flex-1">
              <label htmlFor="site-search" className="sr-only">
                Search fragrances
              </label>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Search brand, fragrance or note"
                className="h-11 w-full rounded-full border border-field bg-white px-5 text-[15px] focus:border-brand focus:outline-2 focus:outline-brand/30"
              />
            </form>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-[15px] font-semibold">
              <Link href="/#listings" className="inline-flex min-h-11 items-center rounded-full px-3.5 hover:bg-white">
                Browse
              </Link>
              <Link href="/account" className="inline-flex min-h-11 items-center rounded-full px-3.5 hover:bg-white">
                Account
              </Link>
              <Link href="/sell" className={buttonPrimary}>
                Sell a fragrance
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-line py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted">
            <span className="font-extrabold text-ink">Fragrance Marketplace</span>
            <span>Certified sellers · Buyer Protection on every order · Free to sell</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
