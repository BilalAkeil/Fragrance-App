import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en-GB">
      <body className="antialiased">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold">
              Fragrance Marketplace
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/sell" className="hover:underline">
                Sell
              </Link>
              <Link href="/account" className="hover:underline">
                Account
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
