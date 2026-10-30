# Setting up Stripe (test mode)

What checkout (003), payouts and orders (004) need on your machine. Everything here is **test mode**: no real money moves, and no business details are needed yet.

## 1. Create the account (once, for both of us)

1. Go to https://dashboard.stripe.com/register and sign up with your email. Choose **United Kingdom** as the country.
2. You can skip "Activate payments" and every business-details prompt. They're only needed to take real payments.
3. Check the dashboard is in **test mode**: a "Test mode" or "Sandbox" label shows at the top. Stay in test mode for everything below.
4. Invite the other person under **Settings > Team and security > Team** (role: Developer or Administrator), so they can get their own keys and webhook secret.

## 2. Turn on Connect (sellers get paid out through it)

1. **Switch Connect on.** In a sandbox, the Stripe plugin or CLI can do it (`EnableConnect`), or use **Connect > Get started** in the dashboard.
2. **Accept loss liability** under **Settings > Connect > Platform profile** (https://dashboard.stripe.com/settings/connect/platform-profile). We hold the buyer's money and pay sellers later (separate charges and transfers), so Stripe requires the platform, not Stripe, to cover any negative balance on a seller's account. Until this is done, Stripe refuses to create seller accounts with "account_creation_losses_collector_unavailable".
3. **Set the branding** under **Settings > Connect > Branding**: a business name ("Fragrance Marketplace"), a brand colour (`#1f5fa8`) and an icon. Stripe's onboarding shows these to sellers.

Sellers are Accounts v2 "recipient" accounts with the Express Dashboard (`lib/payouts.ts`). Stripe no longer lets new platforms create the older Express account type.

## 3. Copy the API keys into `apps/web/.env.local`

**Developers > API keys** (test mode) shows two keys:

| Key | Starts with | Line to add to `apps/web/.env.local` |
| --- | --- | --- |
| Publishable key | `pk_test_` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` |
| Secret key (click Reveal) | `sk_test_` | `STRIPE_SECRET_KEY=sk_test_...` |

The secret key must **never** be committed, pasted into chat, or put in a `NEXT_PUBLIC_` variable. `.env.local` is git-ignored.

## 4. The Stripe CLI (sends Stripe's webhooks to localhost)

```bash
brew install stripe/stripe-cli/stripe
```

```bash
stripe login
```

Then, whenever you're testing checkout, run this in its own terminal while `npm run dev:web` is running:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,identity.verification_session.processing,identity.verification_session.verified,identity.verification_session.requires_input,identity.verification_session.canceled
```

Seller account changes arrive as v2 events, which need their own forwarding. Run this too, in another terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe/accounts --events 'v2.core.account[configuration.recipient].capability_status_updated,v2.core.account[requirements].updated'
```

The first time, it prints a webhook signing secret starting `whsec_`. Add it to `apps/web/.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`. It stays the same for your machine, so you only do this once. Each of us has our own.

## 5. The ID check (005)

Sellers verify their ID with Stripe Identity before they list. The date of birth, which the 18+ check needs, is sensitive, so Stripe only gives it to a restricted key:

1. In the Dashboard (test mode), go to Developers > API keys > **Create restricted key**.
2. Name it "Identity results", and set **Identity Verification Results** and **Recent Detailed Verification Results** to **Read**. Nothing else.
3. Add it to `apps/web/.env.local` as `STRIPE_IDENTITY_RESULTS_KEY=rk_test_...`. Server only, never committed.

Without it, development verifies people without checking their age and logs a warning. Production refuses to verify anyone until it's set.

Stripe's test page for the check lets you pick the outcome: success, failure, or the async versions (which show "Checking…" first). A restricted key without IP restrictions can only read results from the last 48 hours, which is fine: we read them as the webhook arrives.

## 6. Test cards

| Card | What happens |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Asks for 3D Secure, then succeeds |

Any future expiry date, any CVC, and any UK postcode.

When you test a seller's payout setup, Stripe's test onboarding accepts fake details. Use sort code `108800` and account number `00012345`. For the identity steps, choose the "use test data" options Stripe offers.
