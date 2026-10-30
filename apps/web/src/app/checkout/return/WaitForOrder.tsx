"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// The payment went through but the order isn't saved yet (the webhook can
// arrive a moment later). Checks again a few times before giving up.
export function WaitForOrder() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= 10) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((t) => t + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [tries, router]);

  return tries < 10 ? (
    <p className="text-sm text-muted">Saving your order…</p>
  ) : (
    <p className="text-sm text-muted">
      Your order is being saved. It will show in{" "}
      <Link href="/orders" className="font-bold text-brand underline">
        your orders
      </Link>{" "}
      in a minute.
    </p>
  );
}
