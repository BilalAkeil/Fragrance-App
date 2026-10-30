// The ID check before someone lists or swaps (spec 005, US-1).

// Q-6 (settled: copy Vinted): only adults, 18 or over, can sell or swap.
export const MIN_SELLER_AGE = 18;

// What the database records about a seller's check. Set only by server code.
export type IdCheckStatus = "not_started" | "pending" | "verified" | "needs_input";

// Our own reason code for a check that passed but showed someone under age.
export const UNDER_AGE_CODE = "under_age";

export interface DateOfBirth {
  day: number;
  month: number;
  year: number;
}

// Q-6: whether someone born on `dob` has had their 18th birthday by `now` (UK date).
export function isAdult(dob: DateOfBirth, now: Date, minAge = MIN_SELLER_AGE): boolean {
  const [year, month, day] = ukParts(now);
  const age = year - dob.year - (month < dob.month || (month === dob.month && day < dob.day) ? 1 : 0);
  return age >= minAge;
}

const ukDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function ukParts(at: Date): [number, number, number] {
  const [y, m, d] = ukDateParts.format(at).split("-").map(Number);
  return [y, m, d];
}

// The screen states on "Verify your ID" (spec, Screens and states).
export type IdCheckScreen = "not_started" | "in_progress" | "verified" | "needs_input" | "failed";

export interface IdCheckOutcome {
  screen: IdCheckScreen;
  // What went wrong and what to do next (AC-1.3). Only for needs_input and failed.
  message?: string;
  canRetry: boolean;
}

// Q-5 (settled: copy Vinted): the ID check is the one Stripe does when a seller
// sets up payouts, as Vinted's payments provider does. `payoutStatus` is how far
// that has got.
export function idCheckStatus(
  payoutStatus: "not_started" | "in_progress" | "needs_info" | "ready",
  dob: DateOfBirth | undefined,
  now: Date,
): { status: IdCheckStatus; errorCode: string | null } {
  if (payoutStatus === "not_started") return { status: "not_started", errorCode: null };
  if (payoutStatus === "in_progress") return { status: "pending", errorCode: null };
  if (payoutStatus === "needs_info") return { status: "needs_input", errorCode: null };
  if (!dob) return { status: "pending", errorCode: null };
  if (!isAdult(dob, now)) return { status: "needs_input", errorCode: UNDER_AGE_CODE };
  return { status: "verified", errorCode: null };
}

// What to show for a seller's check (AC-1.2, AC-1.3).
export function idCheckOutcome(status: IdCheckStatus, errorCode?: string | null): IdCheckOutcome {
  if (status === "verified") return { screen: "verified", canRetry: false };
  if (status === "pending") return { screen: "in_progress", canRetry: true };
  if (status === "needs_input") {
    if (errorCode === UNDER_AGE_CODE) {
      // Trying again can't change someone's age.
      return { screen: "failed", message: `You must be ${MIN_SELLER_AGE} or over to sell or swap.`, canRetry: false };
    }
    return {
      screen: "needs_input",
      message: "Stripe needs a bit more information to confirm who you are. Carry on where you left off.",
      canRetry: true,
    };
  }
  return { screen: "not_started", canRetry: true };
}
