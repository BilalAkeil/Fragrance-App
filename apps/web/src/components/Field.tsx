export const inputClass =
  "min-h-11 rounded-xl border border-field bg-white px-3 py-2 font-normal text-ink focus:border-brand focus:outline-2 focus:outline-brand/30";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}
