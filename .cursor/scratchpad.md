Background and Motivation
Yabalitsa Management is a Next.js + Firebase (Auth/Firestore) app for venue owners to manage football pitches, bookings, customers and reports. Root hosts FSE (Football Search Engine) for public availability search. Management lives under `/management` (dashboard, bookings, pitches, customers, settings, reports). Recent additions: recurring bookings, blocked dates, route restructure, root search redesign, for-venues signup with plan choices and `daysRemaining` tracking, customers new page, guides.

Key Challenges and Analysis
- Subscriptions: We only track `daysRemaining`; billing and daily decrement automation are not in place. No payment provider.
- FSE conversion: “Κράτηση Τώρα” is disabled; no end-to-end public booking flow.
- Security: Need Firestore rules w/ RBAC; server-side validation to prevent booking overlaps; audit trail.
- Performance: Queries without indexes/pagination may degrade; heavy pages (charts) should be split; caching.
- Observability: No Sentry/monitoring; no CI gate; limited tests.
- Legal/GDPR: Terms/Privacy pages and consent; data export/delete.
- A11y/i18n: Improve contrast, focus states; consider EN localization.
- Docs: Guides exist but need tabbed structure/screenshots; developer docs.

High-level Task Breakdown
1) Payments & Plans
   - Stripe integration (subscription 30€/mo, premium 1€/booking). Checkout + webhooks to update Firestore (`plan`, `daysRemaining`, `status`).
2) Daily Decrement
   - Cloud Scheduler + Cloud Function to decrement `daysRemaining` daily; fallback check on app load.
3) FSE → Booking Flow
   - Enable CTA to a prefilled booking page; allow guest booking with phone; confirmation email/SMS.
4) Security & Roles
   - Firestore rules limiting access per venue; roles owner/manager/staff; audit logs via functions.
5) Performance
   - Add composite indexes, pagination, cursors; dynamic imports for charts; memoization.
6) Observability & Quality
   - Sentry (web/functions), error boundaries; Playwright e2e for booking flow; CI (lint/test/build).
7) UX & A11y
   - Sidebar/header polish; consistent spacing; keyboard nav; aria-live for toasts.
8) i18n & Legal
   - next-intl for EN; Terms/Privacy pages; consent banner.
9) Documentation
   - Tabbed guides with placeholders (screenshots to be added); developer README (env, deploy, indexes).

Project Status Board
- [x] Recurring bookings & blocked dates
- [x] Route restructure under /management
- [x] Root FSE search (UI + availability)
- [x] Reports (charts)
- [x] Signup (for-venues) + daysRemaining
- [x] Customers new page
- [x] Settings: plan section, remaining days
- [ ] Stripe payments + webhooks
- [ ] Daily decrement function (Scheduler)
- [ ] FSE booking CTA + guest booking
- [ ] Firestore rules v2 + RBAC + audit
- [ ] Indexes/pagination + perf pass
- [ ] Sentry + CI + tests (unit/e2e)
- [ ] A11y polish + design tokens
- [ ] i18n + legal pages
- [ ] Guides as tabs with screenshots

Current Status / Progress Tracking
- Core features in place; missing payments and public booking conversion.

Executor's Feedback or Assistance Requests
- Need decision: guest bookings vs player accounts.
- Provide Stripe keys and plan mapping for day credits.
- Approve enabling Cloud Scheduler (requires billing on Firebase project).

Lessons
- String-based HH:mm comparisons prevent TZ issues.
- Prefer public assets over inline-encoded SVG for consistent rendering.
