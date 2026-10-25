export const inputClass =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs opacity-70">{hint}</span>}
    </label>
  );
}
