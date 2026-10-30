// Working days and UK time for order deadlines (spec 004, R-1).

// England and Wales bank holidays. Worked out from the standard rules
// (weekend holidays move to the next weekday) to match gov.uk's
// bank-holidays.json. Refresh from there each year: one-off holidays get added.
export const UK_BANK_HOLIDAYS: readonly string[] = [
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
  "2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26",
];

const holidays = new Set(UK_BANK_HOLIDAYS);

const londonDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The calendar date in the UK, as YYYY-MM-DD.
export function ukDate(at: Date): string {
  return londonDate.format(at);
}

// Steps a YYYY-MM-DD date by whole days, without time zones getting involved.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isWorkingDay(date: string): boolean {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(date);
}

// The UK date `n` working days after the day of `from`. The day itself doesn't
// count, so something paid on a Saturday has until the end of the following Friday.
export function addWorkingDays(from: Date, n: number): string {
  let date = ukDate(from);
  let left = n;
  while (left > 0) {
    date = addDays(date, 1);
    if (isWorkingDay(date)) left--;
  }
  return date;
}

// The last moment of a UK date (23:59:59.999 in London, GMT or BST).
export function endOfUkDay(date: string): Date {
  const next = addDays(date, 1);
  // Midnight UTC, corrected by the UK's offset that night (0 in winter, 1 hour in summer).
  const midnightUtc = new Date(`${next}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
    .formatToParts(midnightUtc)
    .find((p) => p.type === "timeZoneName")?.value;
  const hours = offset === "GMT" ? 0 : Number(offset?.replace("GMT", "") ?? 0);
  return new Date(midnightUtc.getTime() - hours * 3_600_000 - 1);
}
