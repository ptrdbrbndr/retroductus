# Spec — Fase 2 "Intern testen"

**Datum:** 2026-04-24
**Auteur:** Legatus (Pieter) + Claude
**Status:** draft, afwachten go van Legatus

---

## Probleem

Retroductus is feature-compleet genoeg om gebruikt te worden, maar nog niet bewezen-stabiel. Voordat we externe klanten toelaten willen we de app in een gesloten kring (Pieter + geselecteerde interne testers) intensief draaien, regressies aan het licht brengen, en tegelijk de Stripe/Conductus-haakjes zó voorbereiden dat de feitelijke launch straks alleen nog een "flip the switch" is.

## Doelen

1. `retroductor.nl` (Spoor A) live, achter **robuuste deploy-protection**, volledig functioneel tot en met AI-insights.
2. Conductus-add-on (Spoor B) technisch voorbereid: engine-koppeling + feature-flag + UI-haak, handmatig per tenant activeerbaar. Géén Stripe-gate.
3. Stripe prep-only: SDK geïnstalleerd, routes/stubs/env-placeholders aanwezig, `user_plans` default `free`, commits gemarkeerd "prep-only, not wired".
4. DPA-flow in register (forward, niet alleen backlink); retentie-cleanup-job gepland (niet per se draaien).
5. Vibe-coverage zichtbaar en groen voor elke toegevoegde flow.

## Non-goals

- Publieke launch (komt later, na Fase 2).
- Stripe-checkout of -webhook live (alleen voorbereid).
- Marketing-content, SEO, of publieke pricing-pagina.
- Performance-benchmarks op >100k events (later, bij echte klanten).
- BPMN-editor / process-simulation afmaken (Fase 3+).
- Onboarding-e-mails / life-cycle-campagnes.

## Design-beslissingen

### D1. Deploy-protection: **Vercel Deployment Protection (Standard Protection)**
Rationale: ingebouwd, centraal beheer via Vercel UI, geen app-code-aanpassing, werkt voor álle preview + productie-deploys. E-mail-allowlist in middleware lekt een bestaande URL zonder bescherming; deployment-protection is veilig by default. Uitzonderingen (bijv. webhook-endpoints) via Protection Bypass.
**ADR:** `docs/adr/0001-deploy-protection-vercel.md`.

### D2. DPA-flow in register: **acceptance-checkbox vóór submit**
Rationale: auditable (we hebben al `dpa_acceptance` tabel met `accepted_at` + `dpa_version` + `ip_address`), geen dubbele flow nodig.
- Register-form krijgt verplicht checkbox "Ik ga akkoord met de DPA" met link naar `/dpa` in nieuwe tab.
- Backend-route `POST /auth/register` schrijft één record naar `dpa_acceptance` met het actuele `dpa_version`-constant.
- `dpa_version` staat als constant in `src/lib/constants.ts` (geen magic string).

### D3. Stripe prep-only
- `stripe` + `@stripe/stripe-js` toevoegen aan `package.json`.
- `src/lib/stripe/plans.ts` met plan-definities (Free / Starter / Pro) — Price ID's als `null` placeholder.
- `src/app/api/stripe/checkout/route.ts` — returned `501 Not Implemented` met duidelijke body `{ error: "Stripe is nog niet geactiveerd" }`.
- `src/app/api/stripe/webhook/route.ts` — ontvangt, valideert signatuur (sha256 check overslaan als secret leeg is), logt, doet niets in DB.
- `.env.example` krijgt `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `STRIPE_PRICE_STARTER=`, `STRIPE_PRICE_PRO=` (alle leeg).
- Commitboodschap: `chore(stripe): prep-only scaffold, not wired`.

### D4. Conductus-koppeling: **contract-eerst, UI-later**
- Retroductus-engine biedt `POST /connectors/flowable/sync` + `/test` (bestaand). Uitbreiden met `X-Tenant-Id` header en tenant-gescopete RLS-schrijfacties op Conductus-zijde.
- Stripe-add-on uit `docs/integratie-conductus.md`: alléén Fase 1 (migratie `014_process_mining.sql`) + Fase 3 (features utility) + Fase 4 (sidebar) bouwen. Fase 2 (Stripe add-on), Fase 5 (billing add-on UI) en Fase 6 (admin-toggle = **wel** bouwen want handmatig activeren) aanpassen: geen Stripe, wel handmatige toggle per tenant door Legatus.
- Werk aan Conductus-zijde gaat via Centurio Concordius (Conductus-cohort). Janus levert contract + engine-aanpassing. **Geen kruis-codewijzigingen.**

### D5. Whitelist-seeding interne testers
- Test-users seeden via een SQL-script in `supabase/seed-testers.sql` (toegevoegd aan `.gitignore`? → Nee, leeg template in repo; echte lijst in `staging-users.md` niet-gitted).
- Inloggegevens + instructies in `docs/staging-users.md` (bestaat al; bijwerken met Fase 2-scenario's).

### D6. Retentie-cleanup
- Supabase `pg_cron` of Vercel Cron Job (eenvoudiger start): `DELETE FROM event_logs WHERE uploaded_at < NOW() - INTERVAL '30 days'`.
- Gepland voor Fase 2.5 — nu alleen script schrijven en **niet activeren**. ADR voor de keuze.

## Data-model-wijzigingen

Geen nieuwe tabellen voor Spoor A. Eén migratie voor Spoor B:

```
supabase/migrations/20260424000001_integration_ready.sql
```

- `user_plans` behoudt default `free`.
- Eventueel kolom `conductus_tenant_id` op `mining_jobs` om Conductus-gesourcede jobs te labelen (nullable).

## Deployment-strategie

**Besluit 2026-04-24 (Legatus):** Scenario 1 — **zowel frontend als engine draaien op Beelink/Coolify**. Consistent met Tier-2-migratie (iductus, deductus, eductus, aquaductus, superductus draaien al zo). Rationale:

- Vercel Hobby-plan ondersteunt geen Standard Protection op productie; `retroductor.nl` heeft `zone=false` op Vercel — DNS-records via API onmogelijk.
- Kostenbesparing: geen Vercel Pro ($20/mnd account-breed), geen Railway Hobby ($5/mnd + usage).
- Eén auth-systeem (Cloudflare Access) voor alle interne `*.cyberductus.nl` + `retroductor.nl` — zelfde e-mail-allowlist.
- Upgrade naar zwaardere hardware pas bij eerste betalende klanten.

**Frontend (Next.js 15):**

- Coolify Application `retroductus-ui` op Beelink, build via Nixpacks (fallback Dockerfile).
- FQDN: `https://retroductor.nl` via Cloudflare Tunnel + Cloudflare Access (e-mail allowlist).
- Source: direct GitHub `https://github.com/ptrdbrbndr/retroductus` (public), branch `staging`.
- DNS NS voor `retroductor.nl` flipt van Vercel → Cloudflare (account `e63d25...`).
- `master`-branch blijft `ComingSoon` in de repo — maar **geen publieke deploy** tijdens Fase 2 intern testen. Publieke coming-soon (bijv. via mijn.host Ultimate of aparte Coolify-app zonder Access) komt pas bij publieke launch in Fase 3+.
- Bestaand Vercel-project `retroductus` wordt uitgefaseerd in Ordo 10.

**Engine (Python/FastAPI + PM4Py):**

- Coolify Application `retroductus-engine` op Beelink (live per 2026-04-24, Ordo 1).
- FQDN: `https://retroductus-engine.cyberductus.nl` via Cloudflare Tunnel + Cloudflare Access.
- Frontend→engine bij voorkeur via Docker-intern netwerk (geen CF Access roundtrip), fallback via CF Access service-token (al aangemaakt in Ordo 2 deel-C).
- Bestaand Railway-project `retroductus-engine` wordt uitgefaseerd in Ordo 10.

**ADR's vastleggen vóór onomkeerbare stappen:**

- `docs/adr/0001-deploy-protection.md` — keuze CF Access ipv Vercel SSO / e-mail-allowlist.
- `docs/adr/0003-engine-op-beelink-coolify.md` — ✅ geschreven in Ordo 1.
- `docs/adr/0004-frontend-op-beelink-coolify.md` — te schrijven vóór Ordo 2.

## Test-strategie

- Vibe-tests uitbreiden in `tests/vibe/`:
  - `fase2-01-register-dpa.test.ts` — DPA-checkbox blokkeert submit, acceptatie landt in DB.
  - `fase2-02-whitelist-redirect.test.ts` — ongauth'd user krijgt Vercel-protection-scherm (stubbed).
  - `fase2-03-stripe-stub.test.ts` — `POST /api/stripe/checkout` returnt 501.
  - `fase2-04-flowable-tenant.test.ts` — Flowable-sync met `X-Tenant-Id` schrijft correct label.
  - `fase2-05-insights-sse.test.ts` — AI-insights SSE-stream levert eerste chunk binnen 3s.
- `./vibe-check.sh` moet groen zijn vóór iedere merge naar staging.

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| Engine draait niet op Beelink | Ordo 1 = Coolify Application aanmaken + health-check; fallback = kort op Railway blijven als Beelink-build faalt |
| PM4Py dep-build faalt op Coolify | Dockerfile bestaat al (python:3.12-slim + graphviz + libpq-dev); fallback nixpacks.toml blijft beschikbaar |
| Cloudflare Tunnel blokkeert Vercel → engine call | Vercel env `MINING_ENGINE_URL` via CF Access service-token (niet via user-login) — zie runbook Modus D |
| Beelink-engine valt om bij zware mining-job | Acceptabel voor Fase 2 intern; upgrade naar zwaardere hardware bij eerste betalende klanten (separate Fase 3-ordo) |
| Vercel deployment-protection blokkeert Stripe/Flowable webhook | Protection Bypass voor `/api/stripe/webhook` + `/api/flowable-sync` |
| Interne tester vergeet DPA-versie-bump | `dpa_version`-constant in `src/lib/constants.ts` + vibe-test die `dpa_version !== ''` asserteert |
| Rate-limit in-memory reset bij pod-restart | Geaccepteerd voor Fase 2 (intern, kleine set users); oplossen in Fase 3 |

## Openstaand

- **ADR 0001** nog te schrijven (deployment-protection-keuze — Vercel Standard Protection voor frontend).
- **ADR 0002** nog te schrijven (retentie-cleanup-timing — Vercel Cron vs `pg_cron`).
- **ADR 0003** nog te schrijven (engine op Beelink/Coolify i.p.v. Railway).
- `.env.example` volledigheid-check na elke ordo.
- `dpa_version`-constant-waarde vastleggen (huidige DPA-pagina bevat geen versie-tag — moet eerst).
