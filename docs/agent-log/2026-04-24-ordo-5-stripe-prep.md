# Ordo 5 — Stripe prep-only scaffold

**Datum:** 2026-04-24
**Centurio:** Janus
**Plan-ref:** [docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 5
**Status:** code geland + gepusht; deploy-trigger geblokkeerd op Coolify-API onbereikbaar vanuit sessie

---

## Doel

Stripe SDK + plans-definitie + 501-stubs + env-placeholders aanwezig zodat aansluiting later "flip the switch" is. Geen runtime-effect: alle endpoints retourneren 501 NL, geen webhook flipt tenant-state, geen live Price IDs.

## Bestanden

| Wijziging | Pad | Toelichting |
| --- | --- | --- |
| nieuw | [src/lib/stripe/plans.ts](../../src/lib/stripe/plans.ts) | `PLANS` (free/starter/pro) + `PlanId`. `Number.POSITIVE_INFINITY` i.p.v. `Infinity` voor TS-strict-mode. Geen Stripe-SDK-import — pure metadata. |
| nieuw | [src/app/api/stripe/checkout/route.ts](../../src/app/api/stripe/checkout/route.ts) | `POST` retourneert 501 + NL errormsg. Geen body-parsing, geen SDK-init. |
| nieuw | [src/app/api/stripe/webhook/route.ts](../../src/app/api/stripe/webhook/route.ts) | `POST` retourneert 501. Geen signature-verificatie (webhook-secret leeg). |
| gewijzigd | [.env.example](../../.env.example) | Sectie "Stripe (prep-only, niet aangesloten — Ordo 5 Fase 2)" toegevoegd met 4 lege keys. |
| nieuw | [tests/vibe/fase2-03-stripe-stub.test.ts](../../tests/vibe/fase2-03-stripe-stub.test.ts) | 3 tests: checkout 501+NL, webhook 501+NL, GET 405/501 (Next.js default). |
| gewijzigd | package.json + package-lock.json | `stripe@^22.1.0` + `@stripe/stripe-js@^9.3.1` toegevoegd via `npm install`. |

## Strict TDD — vibe-test evolution

1. Test geschreven vóór implementatie (3 cases met `request.post()` via vibe-fixture; geen browser-page nodig).
2. Implementatie toegevoegd zonder test aan te passen.
3. Lokale run met `--no-deps` (auth-setup faalt op Supabase-Cloud-DNS, irrelevant voor stripe-stub):

```text
Running 3 tests using 1 worker
ok 1 [chromium] › fase2-03-stripe-stub.test.ts › POST /api/stripe/checkout retourneert 501 met NL errormsg (2.0s)
ok 2 [chromium] › fase2-03-stripe-stub.test.ts › POST /api/stripe/webhook retourneert 501 op willekeurige body (1.2s)
ok 3 [chromium] › fase2-03-stripe-stub.test.ts › GET /api/stripe/checkout geeft 405 (Next.js default) (83ms)
3 passed (11.1s)
```

Screenshots: `testing/vibe-core/screenshots/stripe-checkout-stub.png`, `stripe-webhook-stub.png` (untracked, niet gecommit — vibe-artifacts).

## GET-gedrag besluit

Next.js 15 App Router retourneert default 405 Method Not Allowed voor methodes die niet als handler zijn geëxporteerd. We exporteren alleen `POST`, dus `GET /api/stripe/checkout` valt terug op 405. Bewust geen extra GET-handler om de stub minimaal te houden. Test accepteert 405 of 501 voor robuustheid tegen Next.js-versie-drift.

## Commit + push

- Commit: `14070ec chore(stripe): prep-only scaffold, not wired`
- Trailer: "prep-only, not wired" aanwezig in body.
- Co-author: Claude Opus 4.7 (1M context).
- Push naar `origin staging`: succesvol (`12978c8..14070ec`).
- Staging's `src/app/page.tsx` ongemoeid — geverifieerd met `git show staging:src/app/page.tsx | head -3` (full app, geen ComingSoon).

## Deploy-status

**Blokker:** Coolify API op `http://192.168.68.69:8000` is wisselvallig vanuit de sandbox.

- Eerste deploy-trigger gaf na 60s alsnog `502 Bad Gateway` (nginx upstream).
- Vervolg-pogingen (deploy + status) hangen of geven `Exit code 7 / connection refused` na 2-4s.
- App-status-call kwam één keer wel terug (HTTP 200): `git_branch=staging`, `last_online_at=2026-04-25 05:03:44`, `status=running:unknown`, `fqdn=https://retroductor.nl`. GitHub-webhook secret is gezet (`manual_webhook_secret_github`) — auto-deploy bij push zou moeten werken.

**Gevolg:** geen geverifieerde force-deploy + geen `curl https://retroductor.nl/api/stripe/checkout` met 501-NL respons vanuit deze sessie.

**Wat wél werkte:**

- `curl -sI https://retroductor.nl` → 302 naar Cloudflare Access (gate werkt; bestaande deploy live).
- `git push origin staging` → succesvol, GitHub `manual_webhook_secret_github` zou Coolify auto-deploy moeten triggeren.

**Wat Legatus moet doen om te ontblokken:**

1. Coolify dashboard openen (`http://192.168.68.69:8000`) en handmatig "Deploy" klikken op `retroductus-ui` (uuid `cd1xaylx877wr431p1xzcjaf`), of:
2. Via `curl` vanaf Beelink zelf (lokaal): `curl -X POST -H "Authorization: Bearer <token>" "http://localhost:8000/api/v1/deploy?uuid=cd1xaylx877wr431p1xzcjaf&force=true"`.
3. Daarna verificatie via service-token (frontend-Access-app heeft geen token; CF Access SSO via browser, of nieuwe service-token toevoegen aan retroductor.nl-app voor curl-verificatie).

## Productie-verificatie (uitgesteld)

Te draaien zodra deploy compleet is, in browser na CF Access SSO of via curl met service-token:

```bash
curl -sk -X POST https://retroductor.nl/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "CF-Access-Client-Id: <id>" \
  -H "CF-Access-Client-Secret: <secret>" \
  -d '{}' | head -3
```

Verwacht: HTTP 501 + `{"error":"Stripe is nog niet geactiveerd voor dit account."}`. Idem `/api/stripe/webhook` met `{"error":"Stripe webhook is nog niet geactiveerd."}`.

## Afwijkingen

- `vibe-check.sh` volledig draaien is geblokkeerd door `01-auth.setup.ts` die op Supabase-Cloud-DNS faalt (bekende blokker uit Ordo 3 v2). Stripe-test heeft geen auth nodig — volledig groen met `--no-deps`.
- Coolify auto-deploy via GitHub-webhook is niet geverifieerd; force-deploy via API onbereikbaar.
- Geen ADR nodig — geen onomkeerbare keuze in deze ordo.

## Guardrails-check

- Commit-message bevat "prep-only, not wired" (regel 1).
- `data-testid` n.v.t. (geen UI).
- Foutmeldingen Nederlands, geen secrets/stack-traces gelekt.
- Alleen `staging`-branch aangeraakt.
- `src/app/page.tsx` ongemoeid (full app op staging blijft).
- Geen `STRIPE_SECRET_KEY` met live key — env-vars leeg in `.env.example`.
- Webhook stub neemt geen signed payload aan — retourneert direct 501 zonder body te lezen.
