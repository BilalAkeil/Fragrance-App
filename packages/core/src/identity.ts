// The ID check before someone lists or swaps (spec 005, US-1).

// Q-6 assumption (plan): only adults can sell or swap. Placeholder until Q-6 is settled.
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

// Stripe Identity's reasons a check couldn't be completed. The person can fix
// these themselves, so they need more information rather than failing.
const NEEDS_INPUT_MESSAGES: Record<string, string> = {
  abandoned: "You left the check before it finished. Start again when you're ready.",
  country_not_supported: "That document's country isn't supported. Try again with a passport.",
  consent_declined: "You didn't agree to the check. We need it before you can list.",
  device_not_supported: "Your device couldn't take the photos. Try again on a phone with a camera.",
  document_expired: "That document has expired. Try again with one that's in date.",
  document_type_not_supported: "That type of document isn't accepted. Use a passport, driving licence or national ID card.",
  selfie_document_missing_photo: "We couldn't find a photo on your document. Try again with a photo ID.",
};

// Reasons the check itself failed: the document or selfie didn't pass.
const FAILED_MESSAGES: Record<string, string> = {
  document_unverified_other: "We couldn't verify your document. Check the photos are clear and try again.",
  selfie_face_mismatch: "Your selfie didn't match the photo on your document. Try again in good light.",
  selfie_manipulated: "Your selfie couldn't be checked. Try again with a live photo of yourself.",
  selfie_unverified_other: "We couldn't verify your selfie. Try again in good light.",
  [UNDER_AGE_CODE]: `You must be ${MIN_SELLER_AGE} or over to sell or swap.`,
  // Stripe's own age floor, below ours.
  under_supported_age: `You must be ${MIN_SELLER_AGE} or over to sell or swap.`,
};

// Codes where trying again can't help.
const FINAL_CODES = new Set([UNDER_AGE_CODE, "under_supported_age"]);

const GENERIC_NEEDS_INPUT = "Stripe needs a bit more information to finish the check. Try again.";

// What to show for a seller's check (AC-1.2, AC-1.3).
export function idCheckOutcome(status: IdCheckStatus, errorCode?: string | null): IdCheckOutcome {
  if (status === "verified") return { screen: "verified", canRetry: false };
  if (status === "pending") return { screen: "in_progress", canRetry: false };
  if (status === "needs_input") {
    const code = errorCode ?? "";
    if (code in FAILED_MESSAGES) {
      // Trying again can't change someone's age.
      return { screen: "failed", message: FAILED_MESSAGES[code], canRetry: !FINAL_CODES.has(code) };
    }
    return { screen: "needs_input", message: NEEDS_INPUT_MESSAGES[code] ?? GENERIC_NEEDS_INPUT, canRetry: true };
  }
  return { screen: "not_started", canRetry: true };
}
