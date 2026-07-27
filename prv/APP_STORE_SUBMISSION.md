# App Store Submission Pack — PRV (`ro.prv.app`)

Everything App Store Connect asks for, derived from what the code actually does.
Each claim below cites the file that backs it, so this document can be re-verified
instead of trusted.

Two things this document is **not**: it is not a promise that the app is
submittable today (see [Blocking ops steps](#blocking-ops-steps--not-code)), and
it is not a legal privacy policy (that is a separate hosted document — the app
links to `https://prvrenovations.ro/privacy` from Account → Support).

---

## 1. What the app is

PRV is a two-audience app that ships as one binary:

| Audience | Entry | Requires login |
|---|---|---|
| **Public visitor** | launches straight into the public tabs | no |
| **Company staff** | Account → Sign In | yes, credentials issued by the company |

The launch route redirects to the public home screen (`app/index.tsx`), so a
reviewer never meets a login wall. Public tabs: Home, Shop, Search, Favorites,
Account (`app/(public)/_layout.tsx`).

**There is no self-service signup.** Staff accounts are provisioned by the
company, which is why the guest card's secondary button is "Request a quote"
rather than "Create Account" (`app/(public)/account.tsx`).

---

## 2. App Review notes

Paste this into App Store Connect → App Review Information → Notes.

> PRV serves two audiences from one binary.
>
> **No account is needed to review the app.** The app opens on the public
> storefront. From there you can browse the live product catalogue, search it,
> save favourites, add items to a cart, submit an order request, and submit a
> renovation quote request. None of this requires signing in.
>
> **No payment is taken in the app.** Checkout creates a *pending order
> request*. A member of staff contacts the customer to confirm scope, price and
> payment, which happens outside the app. The cart screen states this on the
> confirmation button. There is no digital content, subscription or unlockable
> feature, so no In-App Purchase is used.
>
> **The Sign In screen is for company staff only.** PRV's authenticated half is
> an internal business tool (schedules, timesheets, work orders, invoices) used
> by employees of the company that licenses it. Accounts are issued by the
> employer; there is no public registration, by design. A demo account is
> supplied below so you can review that half.
>
> **Account deletion** is available in-app to signed-in users at Account →
> Profile → Delete Account. It deletes the requester's own account only.
> Employment, payroll and audit records that Romanian law requires the employer
> to retain are anonymised rather than erased: personal identifiers are
> overwritten and the account is deactivated.
>
> **Face ID** is optional and off until the user enables it in Security
> Settings. It unlocks a session that was already established with a password —
> it is not an alternative way to obtain a session.
>
> Demo account: see the credentials field above.

### Demo account

Provide the credentials in App Store Connect's *Sign-In Information* fields —
not in this repository.

Create the account with:

```bash
pnpm --filter @prv/db db:provision:user <email> <password> --create-app-row
```

(`packages/db/src/provision-auth-user.ts` — creates the Supabase Auth account and
links it to a `users` row. Seeded users have no auth account and cannot log in,
so this step is required for the reviewer login to work.)

Give the demo account a **non-privileged role** scoped to demo data. Do not hand
the reviewer an owner/superadmin account: it would expose real employee payroll
and personal data.

---

## 3. Privacy nutrition labels

Answers for App Store Connect → App Privacy. Every "collected" entry below
corresponds to a request the app actually makes.

### Data used to track you

**None.** The app bundles no advertising, attribution or third-party analytics
SDK — the full dependency list is `apps/mobile/package.json` (Expo modules,
React Navigation, Zustand, TanStack Query). No data is shared with data brokers
and nothing is joined with third-party data for advertising. Answer *No* to App
Tracking Transparency; no `NSUserTrackingUsageDescription` is declared.

### Data collected — public (unauthenticated) use

| Data type | When | Linked to identity | Purpose | Source |
|---|---|---|---|---|
| Name | Quote request; order request | Yes | App Functionality | `app/(public)/quote.tsx`, `app/(public)/cart.tsx` |
| Email address | Quote request (email *or* phone required); order request (required) | Yes | App Functionality | same |
| Phone number | Quote request; order request (optional) | Yes | App Functionality | same |
| Physical address | Order request (optional delivery address) | Yes | App Functionality | `app/(public)/cart.tsx` |
| Other user content | Free-text message on a quote request | Yes | App Functionality | `app/(public)/quote.tsx` |
| Purchase history | Items and quantities on a submitted order request | Yes | App Functionality | `api/public/shop/checkout/route.ts` |

Cart contents and favourites are held **on the device only** (Keychain via
`expo-secure-store`) until the visitor submits an order — `src/store/cart.ts`,
`src/store/favorites.ts`. Device-only storage is not "collection" for label
purposes; it is listed here for completeness.

### Data collected — authenticated (staff) use

| Data type | When | Linked to identity | Purpose | Source |
|---|---|---|---|---|
| Email address | Sign-in credential; account record | Yes | App Functionality | `app/(auth)/login.tsx` → `api/auth/login` |
| Name | Employee profile | Yes | App Functionality | `app/(auth)/edit-profile.tsx` |
| Phone number | Employee profile (optional) | Yes | App Functionality | same |
| Sensitive info | Employment records: attendance, timesheets, payslips, safety incidents | Yes | App Functionality | `app/(auth)/*` |
| Payment info | Payslip and invoice **amounts** the employer already holds. The app never collects a card or bank number from the user. | Yes | App Functionality | `app/(auth)/invoice-detail.tsx` |
| User content | Messages, comments, knowledge articles, incident reports | Yes | App Functionality | `app/(auth)/communications.tsx` and others |
| Device ID | Random per-install id, generated on device and sent only when the user grants notification permission | Yes | App Functionality (push delivery) | `src/hooks/usePushNotifications.ts` |
| Product interaction / Other usage data | Immutable audit trail of security-relevant actions, as required for a business system of record | Yes | App Functionality, Analytics | `writeAuditLog` on every mutating route |
| Coarse location (IP-derived) | The server records the request IP and user-agent on audited actions | Yes | App Functionality (security/fraud) | `writeAuditLog(… ipAddress, userAgent)` |

Notes for the questionnaire:

- **Diagnostics:** answer *No* for the app. The mobile binary bundles no crash
  reporter; Sentry runs server-side only.
- **Precise/coarse Location:** the app requests **no** location permission —
  there is no `expo-location` dependency and no `NSLocationWhenInUseUsageDescription`.
  The IP address above is observed by the server, which Apple's own guidance
  treats as coarse location; declare it rather than argue it.
- **Photos or Videos:** answer *Yes — collected, linked to identity, app
  functionality only* (not tracking, not advertising). Site photos captured or
  picked by staff are uploaded to company storage and attached to renovation
  site reports (`POST /api/mobile/projects/[id]/site-reports/[reportId]/photos`);
  they may be shown to the project's client when the report is marked
  client-visible.
- **Contacts, Microphone, Health, Financial account numbers:** not accessed.
  No corresponding permission strings are declared (`app.json`).

### Permissions declared

| Permission | String | Why |
|---|---|---|
| Face ID | "PRV uses Face ID to authenticate your identity securely." | Optional biometric unlock and step-up re-auth |
| Notifications | requested at runtime, after sign-in | Shift changes, approvals, critical alerts |
| Camera | "PRV lets you photograph site progress and attach it to reports." | Field staff photograph site progress for site reports (requested only when tapping Add Photo) |
| Photo library | "PRV attaches photos from your library to site reports and documents." | Attach existing photos to site reports (requested only when tapping the library option) |

Android mirrors biometrics with `USE_BIOMETRIC` / `USE_FINGERPRINT`; camera and
media access are injected by the `expo-image-picker` config plugin. Permissions
removed as unused in task #124 were re-introduced deliberately for the site-photo
flow (2026-07), each gated behind an explicit user action.

---

## 4. Guideline mapping

| Guideline | Status | Evidence |
|---|---|---|
| **2.1 Completeness** — no placeholder UI | Every tap target on the five public tabs either performs a real action or is visibly inert. The public screens read the live catalogue, not fixtures. | `app/(public)/*` |
| **3.1.1 In-App Purchase** | Not applicable. Physical goods and renovation services only; payment is arranged off-app. | `api/public/shop/checkout/route.ts` creates a pending order and takes no payment |
| **4.2 Minimum Functionality** | The public half is a functioning storefront and quote channel; the private half is a full business tool. | — |
| **5.1.1(v) Account Deletion** | In-app, self-scoped, reachable in two taps from Account. | `app/(auth)/profile.tsx`, `api/mobile/account/route.ts` |
| **5.1.2 Data Minimisation** | The public flows ask only for what is needed to contact the customer back; email *or* phone satisfies the quote form. | `api/public/leads/route.ts` |
| **5.1.5 Location Services** | No location permission requested. | `app.json` |
| **2.5.13 Biometrics** | Face ID gates an existing session and always has a password fallback; it cannot mint a session on its own. | `app/(auth)/login.tsx` |

### Export compliance

The app uses HTTPS and the platform Keychain, and implements no proprietary
cryptography. That is the standard exemption — `ITSAppUsesNonExemptEncryption`
is set to `false` in `app.json`, so App Store Connect will not re-ask the
encryption question on every uploaded build. Confirm with counsel before the
first submission.

### Age rating

12+ or 4+ depending on how the questionnaire treats the unmoderated staff
messaging in the authenticated half. Staff messaging is not reachable without an
employer-issued account, so 4+ with "Infrequent/Mild" everywhere is defensible;
choose 12+ if you prefer not to argue it.

---

## 5. Blocking ops steps — not code

None of these can be done from the repository. They are the remaining distance
to a submittable build.

1. **Apple Developer Program membership** for the publishing entity.
2. **App icon and splash** — `assets/icon.png`, `assets/adaptive-icon.png`,
   `assets/splash.png`, `assets/notification-icon.png` are referenced by
   `app.json` and must exist at 1024×1024 (icon, no alpha).
3. **Replace the EAS placeholders** — `extra.eas.projectId` and `updates.url` in
   `app.json` still read `YOUR_EAS_PROJECT_ID`; `eas.json` → `submit.production.ios`
   still reads `YOUR_APPLE_ID` / `YOUR_APP_STORE_APP_ID` / `YOUR_APPLE_TEAM_ID`.
4. **Deploy `apps/web`** to `https://app.prvrenovations.ro`. The production build
   points there (`eas.json`); nothing in the app works against an undeployed API.
5. **Provision the backing services** — Postgres (see `packages/db/MIGRATIONS.md`
   — use `db:provision`, not the SQL migration set), Supabase Auth + Storage,
   Redis, Typesense, Inngest, Resend, Sentry.
6. **Publish the privacy policy** at `https://prvrenovations.ro/privacy`. The app
   already links to it; a dead link is a rejection.
7. **Create the demo account** (section 2) and enter it in App Store Connect.
8. **Screenshots** — 6.7" and 6.5" iPhone, plus 12.9" iPad since
   `supportsTablet: true`.
9. **TestFlight on a physical device** before submitting. Face ID, push
   registration and the Keychain-backed cart cannot be verified in a simulator.

---

## 6. Re-verifying this document

The claims above are checkable, and should be re-checked whenever the public
flows change:

```bash
# no tracking/analytics/crash SDK in the mobile bundle
cat apps/mobile/package.json

# no location, camera, contacts or photo access
grep -rn "expo-location\|ImagePicker\|expo-contacts\|MediaLibrary" apps/mobile/

# every permission string the binary declares
grep -n "UsageDescription\|permissions" apps/mobile/app.json

# what the public endpoints accept
sed -n '/bodySchema/,/^})/p' apps/web/src/app/api/public/leads/route.ts
sed -n '/bodySchema/,/^})/p' apps/web/src/app/api/public/shop/checkout/route.ts
```

---

## 7. TestFlight runbook (updated 2026-07-27 — Apple Developer account active)

Repo-side prerequisites are DONE as of this commit: `assets/` exists (icon,
splash, adaptive icon, notification icon, favicon — brand monochrome,
replaceable any time), permissions and privacy labels are current (sections
above), and `expo config` resolves cleanly.

Run these from `prv/apps/mobile` on a machine with your Apple account
(everything is interactive — no secrets go into the repo):

1. **One-time — link the EAS project** (fills `extra.eas.projectId` in
   app.json automatically):
   ```
   npm i -g eas-cli
   eas login
   eas init
   ```

2. **One-time — create the app record.** In App Store Connect → Apps → “+”:
   platform iOS, bundle ID `ro.prv.app` (register it when prompted), name
   “PRV”, SKU e.g. `prv-ios`. Note the numeric **Apple ID of the app**
   (ascAppId) from the App Information page.

3. **Build for TestFlight:**
   ```
   eas build --platform ios --profile production
   ```
   First run asks you to sign in with your Apple ID and generates/pushes the
   distribution certificate + provisioning profile to EAS servers. Wait for
   the build to finish (link is printed; also visible at expo.dev).

4. **Submit the build:**
   ```
   eas submit --platform ios --latest
   ```
   Either answer the interactive prompts (Apple ID / app-specific password)
   or, preferred, create an **App Store Connect API key** (Users and Access →
   Integrations → App Store Connect API, role App Manager), download the .p8
   once, and let `eas submit` use it — it will offer to store it with EAS.
   Optionally fill `submit.production.ios` in eas.json (appleId, ascAppId,
   appleTeamId) so future submits are non-interactive.

5. **In App Store Connect → TestFlight:** the build appears after Apple’s
   processing (~5–30 min). Answer the export-compliance question is NOT asked
   (ITSAppUsesNonExemptEncryption=false is already declared). Add yourself /
   internal testers; external testers require a short Beta App Review.

### Before testers can actually sign in
The production build points at `EXPO_PUBLIC_API_URL =
https://app.prvrenovations.ro`. **That backend is not deployed yet** — the
app will install and launch, but login/data will fail until the web app is
live at that URL (with env vars, `db:provision` incl. the RLS step, Supabase
buckets `documents` + public `images`, and Redis/Inngest/Resend keys).
Options, in order of preference:
- deploy the web app to production first (Vercel + Supabase), then build; or
- for an internal-only test round, build the `preview` profile instead
  (`eas build --platform ios --profile preview` — points at
  `https://staging.prvrenovations.ro`) once staging exists; or
- temporarily point the production env at whatever URL is actually live.

Demo credentials for testers/review are in section 5 (seeded demo account).
