# Clerk setup (local, Vercel, webhooks)

This application uses Clerk webhooks to validate that only users with emails in
Sanity can sign up.

## Vercel production

### 1. Use live Clerk keys

In **Vercel → Project → Settings → Environment Variables**, set for the
**Production** environment only:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` from Clerk **Production** instance |
| `CLERK_SECRET_KEY` | `sk_live_…` from the same instance |

Use `pk_test_` / `sk_test_` only for **Preview** and local `.env.local`, not
Production.

`NEXT_PUBLIC_*` is inlined at **build** time. After adding or changing it,
**redeploy** Production.

Also set `AUTH_GATED`, Sanity vars, and `CLERK_WEBHOOK_SECRET` as needed for
Production.

### 2. Middleware matcher

`src/middleware.ts` must include Clerk’s frontend API in the matcher:

```ts
'/__clerk/(.*)',
```

and treat `/__clerk` as a public route so `AUTH_GATED` does not block the
session handshake. This is already configured in the repo.

### 3. Custom domain (branded auth & Account Portal)

1. **Vercel** → Project → **Domains** → add your production hostname (e.g.
   `app.example.com`).
2. **Clerk Dashboard** → **Configure** → **Domains** → add the same hostname
   under your **Production** application.
3. Optional: **Account Portal** and **Paths** in Clerk (sign-in URL `/sign-in`,
   aligned with `ClerkProvider` in `src/app/layout.tsx`).
4. Point `CLERK_WEBHOOK_SECRET` webhook URL to
   `https://your-domain.com/api/webhooks/clerk`.

Until a custom domain is added in both Vercel and Clerk, `*.vercel.app` must be
listed in Clerk **Domains** for the instance whose keys you use.

---

## Webhook setup

### 1. Get Your Webhook Secret

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Enter your webhook URL:
   - **Development**: `https://your-domain.ngrok.io/api/webhooks/clerk` (or your
     local tunnel URL)
   - **Production**: `https://your-production-domain.com/api/webhooks/clerk`
5. Select the event: **`user.created`**
6. Click **Create**
7. Copy the **Signing Secret** (starts with `whsec_`)

### 2. Add Environment Variable

Add the webhook secret to your `.env.local` file:

```bash
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

### 3. How It Works

1. User signs up with Clerk
2. Clerk sends a `user.created` webhook event to `/api/webhooks/clerk`
3. The webhook:
   - Verifies the webhook signature
   - Extracts the user's email address
   - Checks if the email exists in Sanity members collection
   - If email **NOT found**: Deletes the user from Clerk
   - If email **found**: User account is approved

### 4. Testing Locally

For local development, you'll need to expose your local server:

1. Use a tool like [ngrok](https://ngrok.com) or
   [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
2. Point the webhook URL to your tunnel
3. Update the webhook URL in Clerk Dashboard when your tunnel URL changes

Example with ngrok:

```bash
ngrok http 3000
# Use the https URL in Clerk webhook settings
```

### 5. Monitoring

Check your application logs to see webhook events:

- Successful validations:
  `Email {email} verified in Sanity members. User {id} approved.`
- Deletions: `Email {email} not found in Sanity members. Deleting user {id}`

### 6. Important Notes

- Users will briefly see a success message before being deleted if their email
  isn't in Sanity
- The webhook runs asynchronously, so there may be a small delay
- Make sure your Sanity members have valid email addresses
- The email comparison is case-sensitive - ensure emails in Sanity match exactly
