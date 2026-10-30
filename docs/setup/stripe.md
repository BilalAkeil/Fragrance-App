# Setting up Stripe (test mode)

What checkout (003), payouts and orders (004) need on your machine. Everything here is **test mode**: no real money moves, and no business details are needed yet.

## 1. Create the account (once, for both of us)

1. Go to https://dashboard.stripe.com/register and sign up with your email. Choose **United Kingdom** as the country.
2. You can skip "Activate payments" and every business-details prompt. They're only needed to take real payments.
3. Check the dashboard is in **test mode**: a "Test mode" or "Sandbox" label shows at the top. Stay in test mode for everything below.
4. Invite the other person under **Settings > Team and security > Team** (role: Developer or Administrator), so they can get their own keys and webhook secret.

## 2. Turn on Connect (sellers get paid out through it)

1. In the dashboard, open **Connect** (search "Connect" if it isn't in the sidebar) and choose **Get started**.
2. When asked what you're building, choose **Marketplace**. Sellers are paid out with **Express** accounts, and Stripe handles their onboarding.
3. Fill in the **platform profile** it asks for. In test mode, short answers are fine. Stripe won't create seller accounts until it's done.
4. Under **Settings > Connect > Branding**, set a business name ("Fragrance Marketplace"), a brand colour (`#1f5fa8`) and an icon. Express onboarding shows these to sellers, and Stripe asks for them before it will start onboarding.

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
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The first time, it prints a webhook signing secret starting `whsec_`. Add it to `apps/web/.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`. It stays the same for your machine, so you only do this once. Each of us has our own.

## 5. Test cards

| Card | What happens |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Asks for 3D Secure, then succeeds |

Any future expiry date, any CVC, and any UK postcode.

When you test a seller's payout setup, Stripe's test onboarding accepts fake details. Use sort code `108800` and account number `00012345`. For the identity steps, choose the "use test data" options Stripe offers.
