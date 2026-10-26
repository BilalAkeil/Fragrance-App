import type { ListingKind } from "@fragrance/core";

const TINTS: Record<ListingKind, string> = {
  full: "bg-sky",
  partial: "bg-[#e8f0f7]",
  decant: "bg-decant-tint",
};

// Shows the first photo, or a bottle outline when a listing has none.
export function BottleTile({ kind, photo, alt, large }: { kind: ListingKind; photo?: string; alt: string; large?: boolean }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={alt} className="h-full w-full object-cover" />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center text-tile-icon ${TINTS[kind]}`}>
      <svg
        width={large ? 96 : 52}
        height={large ? 144 : 78}
        viewBox="0 0 60 90"
        fill="none"
        stroke="currentColor"
        strokeWidth={large ? 1.6 : 2}
        aria-hidden="true"
      >
        <rect x="24" y="4" width="12" height="10" rx="2" />
        <rect x="27" y="14" width="6" height="6" />
        <rect x="8" y="20" width="44" height="64" rx="8" />
      </svg>
    </div>
  );
}
