# Product & Monetization Spec + Technical Architecture

> Στρατηγικό έγγραφο για το rebrand του Yabalitsa σε **multi-sport marketplace + management platform**.
> Status: draft v1 — προς συζήτηση/εξέλιξη.

---

## 1. Vision / Positioning

Από «λογισμικό διαχείρισης γηπέδων ποδοσφαίρου» (Yabalitsa) → σε **πολυαθλητική πλατφόρμα δύο πλευρών**:

- **Player-first marketplace** (mobile app): οι αθλητές κάνουν **matchmaking** (βρίσκουν αντιπάλους/συμπαίκτες στο επίπεδό τους) και **κλείνουν γηπεδάκι** απευθείας.
- **Venue/Academy management** (web dashboard): η επιχείρηση διαχειρίζεται κρατήσεις, γήπεδα, ακαδημίες, πληρωμές — όπως σήμερα, αλλά γενικευμένο για όλα τα αθλήματα.

**Αθλήματα (phased):** Padel & Tennis (αιχμή) → Football (5x5/7x7/11x11, υπάρχει ήδη) → Basketball.

**Το moat δεν είναι οι κρατήσεις — είναι το matchmaking.** Οι κρατήσεις είναι commodity· το «βρες αντίπαλο στο επίπεδό σου, κοντά σου, τώρα» είναι network effect που μεγαλώνει με κάθε νέο παίκτη.

**Unfair advantage:** το management software (ήδη χτισμένο) είναι το κανάλι απόκτησης **supply** — γεμίζει τον χάρτη με γήπεδα χωρίς να κυνηγάμε ένα-ένα.

---

## 2. Two-Sided Model

| Πλευρά | Ποιοι | Τι θέλουν | Πώς τους αποκτάμε |
|---|---|---|---|
| **Supply** | Γήπεδα, ακαδημίες, sports centers | Γεμάτα slots, λιγότερο τηλέφωνο/χαρτί, νέοι πελάτες | Δωρεάν/φθηνό management tool → εμφάνιση στον χάρτη |
| **Demand** | Αθλητές (padel/tennis/football/basket) | Να παίξουν: αντίπαλος + γήπεδο + ώρα | Matchmaking (το killer feature), discovery στον χάρτη |

**Cold-start rule:** όχι πανελλαδικό launch. Κυριαρχία **μία πόλη × ένα άθλημα** (προτεινόμενο: padel σε μία πόλη) μέχρι πυκνότητα, μετά επέκταση. Το matchmaking χωρίς liquidity = κακές εμπειρίες = churn.

---

## 3. Monetization (3 layers)

| Layer | Τι | Σκοπός | Σε ποιον |
|---|---|---|---|
| **Base subscription** | Μικρή ελάχιστη μηνιαία για το dashboard | Χαμηλό κατώφλι, σταθερό cash-flow, φιλτράρει σοβαρούς | Venue |
| **Usage-based** | Extra για academy/advanced management, **ανά άτομα/μέγεθος** | Scales με την αξία· μεγάλος πελάτης = περισσότερα | Venue |
| **Commission** | π.χ. X% από το ποσό κράτησης (π.χ. 4€ στα 40€) | Marketplace upside (long-term) | Από το ποσό της κράτησης — **όχι** surcharge στον παίκτη |

### Commission = attribution fee, όχι processing fee
Χρεώνουμε για την κράτηση **που δημιούργησε το app μας**, ανεξάρτητα από το πού πληρώθηκε:

- **App-originated booking** → commission (είτε in-app, είτε pay-at-venue).
- **QR/dashboard booking** (δικοί τους πελάτες, εκτός app) → δωρεάν, κανένα commission.

Η διάκριση είναι **origin**, όχι payment method.

### Είσπραξη commission
- **In-app payment = default & self-enforcing:** Stripe Connect κάνει αυτόματο split (application fee = το commission). Μηδέν διαμάχες.
- **Pay-at-venue = fallback:** καταγράφεται ως app-originated, τιμολογείται μηνιαία (τιμολόγιο παροχής υπηρεσιών). Reconciliation pipeline.
- ⚠️ Η επιβολή commission σε offline πληρωμές («αν σκάνε πιστόλι, βγαίνουν απ' το app») έχει δόντια **μόνο μετά την liquidity**. Early game: βασίσου στο in-app payment.

### Anti-leakage
Το γήπεδο «χάνει» commission στην in-app κράτηση → κίνητρο να σπρώχνει QR. Άμυνα: **το in-app booking πρέπει να φέρνει νέους παίκτες / να γεμίζει νεκρές ώρες.** Σε άδειο slot, 36€ ≈ καθαρό κέρδος → commission δεν πονάει. Πώληση ως **κανάλι απόκτησης πελατών**, όχι ως ταμείο.

---

## 4. Matchmaking (το core του consumer app)

- **Open matches:** παίκτης ανοίγει «ψάχνω 1 ακόμα για padel, Τετάρτη 19:00, [γήπεδο/περιοχή], επίπεδο ~3.5» → άλλοι κάνουν join.
- **Level/rating system — απαραίτητο από μέρα 1.** Χωρίς επίπεδο, ο αρχάριος παίζει με τον προχωρημένο, χάνει 6-0, φεύγει. (Μοντέλο τύπου Playtomic LEVEL: αρχικό self-assessment + προσαρμογή βάσει αποτελεσμάτων.)
- **Geo discovery:** «γήπεδα/ματς κοντά μου» — location-based queries.
- **Group sports:** padel 2v2 (4), football 5x5 (10). Το app διαχειρίζεται πλήρωση θέσεων.

---

## 5. Payments — Split Payments

- **Split payment supported:** σε ομαδικό άθλημα, το κόστος μοιράζεται στους παίκτες (ο καθένας πληρώνει το μερίδιό του στο app), αντί ένας να μαζεύει μετρητά.
- Τεχνικά με Stripe Connect: είτε ξεχωριστά PaymentIntents ανά παίκτη με destination charge προς το connected account του γηπέδου + application_fee, είτε ένας organizer charge με μετέπειτα settlement. (Design decision — βλ. §7.)
- **Default flow:** in-app, split, αυτόματο commission split. **Fallback:** pay-at-venue, καταγραφή + μηνιαία τιμολόγηση.

---

## 6. Current State (codebase)

- **Web:** Next.js 16 + React 19 + TS, Tailwind 4, Radix.
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions).
- **Payments:** Stripe (συνδρομές + εφάπαξ) — **όχι** Connect ακόμα.
- **Domain:** football-specific (`Pitch.type = 5x5..9x9`, collections `yabalitsa_*`). Academy module ώριμο (athletes, squads, training, payments, evaluations, medical). Tournaments module υπάρχει.

---

## 7. Technical Architecture Plan

### 7.1 Multi-sport data model refactor
- Γενίκευση `Pitch` → `Court`/`Resource` με `sport: 'padel'|'tennis'|'football'|'basketball'` και sport-specific config (π.χ. `format`, `surface`, `indoor`).
- Football-specific πεδία → προαιρετικά/ανά sport. Διατήρηση backward-compat για τα υπάρχοντα δεδομένα (migration ή `sport: 'football'` default).
- Generic `BookingPolicy` ανά court (slot duration, pricing, opening hours) — ήδη υπάρχει η βάση.

### 7.2 Mobile app (consumer)
- **Προτεινόμενο:** React Native (Expo) — μοιράζεται TS types & Firebase SDK με το web, ένα team, ταχύτερο iteration. (Flutter εναλλακτική αν προτιμηθεί.)
- Web dashboard παραμένει για τη supply πλευρά (venues/academies).
- Shared layer: types (`src/types`), Firebase services — εξαγωγή σε κοινό package ή monorepo.

### 7.3 Matchmaking system
- Collections: `matches` (open/full/completed), `match_participants`, `player_profiles` (με `level` ανά sport).
- Level/rating: αρχικό self-assessment → ενημέρωση βάσει match results (Elo-style ανά sport).
- Geo: location-based discovery — Firestore geohashing (geofirestore) ή, αν μεγαλώσει το query load, αξιολόγηση Postgres/PostGIS. (Decision point.)

### 7.4 Stripe Connect
- Κάθε venue = **connected account** (Express/Standard) με onboarding + KYC.
- Booking payment = PaymentIntent με `application_fee_amount` (commission) + `transfer_data.destination` (venue).
- Split payments: design — per-player PaymentIntents vs organizer-collects. Refunds/cancellations/no-show policy.
- Payouts schedule, dispute handling, Greek invoicing για offline (pay-at-venue) commission.

### 7.5 Booking attribution & reconciliation
- Κάθε booking: `origin: 'app' | 'qr' | 'dashboard'`, `paymentChannel: 'in_app' | 'at_venue'`.
- Commission εφαρμόζεται όταν `origin === 'app'`.
- Reconciliation job (Cloud Function): μηνιαία άθροιση offline app-originated bookings ανά venue → invoice.

### 7.6 Discovery / map
- Public map: γήπεδα ανά sport + διαθεσιμότητα + open matches κοντά στον χρήστη.
- Filters: sport, level, ώρα, απόσταση, τιμή.

---

## 8. Roadmap (προτεινόμενο phasing)

1. **Phase 0 — Foundations:** multi-sport data model refactor, attribution fields, διατήρηση υπάρχοντος dashboard.
2. **Phase 1 — Supply density (1 πόλη, padel):** onboard γηπέδων με δωρεάν/φθηνό tool, χάρτης διαθεσιμότητας.
3. **Phase 2 — Consumer app (matchmaking + level):** mobile app, open matches, level system, geo discovery.
4. **Phase 3 — Payments:** Stripe Connect, in-app booking + split payments, commission.
5. **Phase 4 — Επέκταση:** νέες πόλεις, νέα αθλήματα· academy ως premium B2B module.

---

## 9. Open Decisions

- [ ] Commission rate (% ή tiered;) και ποιος το «απορροφά» λογιστικά.
- [ ] Base subscription τιμή + usage-based μονάδα (ανά active athlete; ανά coach seat;).
- [ ] Split payment mechanics (per-player vs organizer-collects).
- [ ] Mobile stack (React Native/Expo vs Flutter).
- [ ] Geo backend (Firestore geohashing vs Postgres/PostGIS).
- [ ] Rebrand: νέο όνομα/brand; εξέλιξη Yabalitsa ή νέο app + migration;
- [ ] Cancellation / no-show / refund policy (επηρεάζει Connect flow).
