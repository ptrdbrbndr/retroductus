# Plan — Fase 2 "Intern testen"

**Datum:** 2026-04-24
**Spec:** [specs/2026-04-24-fase-2-intern-testen-design.md](../specs/2026-04-24-fase-2-intern-testen-design.md)
**Audit:** [agent-log/2026-04-24-status-audit-explorator.md](../../agent-log/2026-04-24-status-audit-explorator.md)
**Status:** draft, afwachten go van Legatus

Dit plan volgt strict TDD en wordt task-voor-task uitgevoerd door Centurio Janus en legionairs. Elke task heeft een bestand-focus, een vibe-check en een verificatiestap.

---

## Ordines (task-volgorde)

### Ordo 1 — Engine op Beelink/Coolify draaibaar

**Doel:** health-check `/health` = 200 op `https://retroductus-engine.cyberductus.nl`.

**Besluit (2026-04-24, Legatus):** engine gaat **niet** naar Railway maar direct naar Beelink via Coolify + Cloudflare Tunnel. Rationale: kostenbesparing, consistentie met lopende Tier-2-migratie (iductus, deductus, eductus, aquaductus, superductus draaien al zo). Upgrade naar zwaardere hardware pas bij eerste betalende klanten. ADR `docs/adr/0003-engine-op-beelink-coolify.md` schrijven vóór deploy.

**Pre-flight bevestigd 2026-04-24:**

- `retroductus` is **public op GitHub** (`api.github.com/repos/ptrdbrbndr/retroductus` → `"private": false`). Coolify kan direct vanaf GitHub deployen — **géén Gitea-mirror nodig**.
- Coolify API bereikbaar via `http://192.168.68.69:8000/api/v1/` (LAN). Token werkt (zie `credentials.md` → Beelink → Coolify API token).
- `engine/Dockerfile` aanwezig (python:3.12-slim + graphviz + libpq-dev). Build-context `engine/`.

**Stappen:**

1. **Coolify Application aanmaken** via API in team "Root Team" / project "My first project > production":
   - `POST /api/v1/applications/public` met `git_repository=https://github.com/ptrdbrbndr/retroductus.git`, `git_branch=staging`, `build_pack=dockerfile`, `base_directory=/engine`, `dockerfile_location=/Dockerfile` (LET OP: relatief aan `base_directory`, niet `/engine/Dockerfile`), `ports_exposes=8000`, `name=retroductus-engine`.
   - Bewaar de toegewezen `application_uuid` voor `credentials.md`.
2. **Env-vars in Coolify** via `POST /api/v1/applications/{uuid}/envs` (alleen `key,value,is_preview,is_literal` — `is_build_time` geeft 422):
   - `MINING_ENGINE_SECRET` — nieuw genereren (`openssl rand -hex 32`), opslaan in `credentials.md`.
   - `SUPABASE_JWT_SECRET` — overnemen uit retroductus Supabase Cloud project (Janus haalt op via Supabase dashboard, doorgeven aan Legatus om in `credentials.md` te zetten).
   - `ANTHROPIC_API_KEY` — uit `c:\Projecten\.env`.
   - Geen waarden in code; alleen via Coolify env-API.
3. **FQDN setten** `retroductus-engine.cyberductus.nl` op de Coolify-applicatie (via API of, als service-child-app-trick nodig is, direct via Coolify Postgres — zie [MIGRATIE-RUNBOOK-MODUS-D.md §4](../../../../cyberductus.nl/docs/MIGRATIE-RUNBOOK-MODUS-D.md)).
4. **Cloudflare Tunnel-hostname** `retroductus-engine.cyberductus.nl` koppelen aan de Coolify-container-poort (zelfde patroon als `supabase-iductus.cyberductus.nl`). Cloudflare API-token in `credentials.md` → Cloudflare.
5. **Eerste deploy** triggeren via `POST /api/v1/applications/{uuid}/deploy`. Build-logs streamen tot complete (PM4Py + pandas + graphviz duurt 2-5 min).
6. **Verificatie:**
   - `curl http://192.168.68.69:8000/api/v1/applications/{uuid}` → `status: running`.
   - `curl https://retroductus-engine.cyberductus.nl/health` → `{"status":"ok"}` (200).
   - `curl -I https://retroductus-engine.cyberductus.nl/` zonder Cloudflare Access cookie → 302 naar `cloudflareaccess.com` (bewijs dat Access-gate aan staat).
7. **Cloudflare Access policy** koppelen aan deze hostname: zelfde e-mail-allowlist als andere `*.cyberductus.nl`-services. Voor Vercel→engine-call later: service-token toevoegen (`CF-Access-Client-Id` + `-Secret`), opslaan in `credentials.md`. Ordo 7 (AI-insights e2e) heeft die token nodig.
8. **`docs/adr/0003-engine-op-beelink-coolify.md`** schrijven: rationale (kostenbesparing, Tier-2-consistentie), gekozen patroon, exit-criteria voor latere hardware-upgrade.
9. **Credentials bijwerken**: nieuwe sectie "Beelink self-host applications" in `credentials.md` met `retroductus-engine`-entry: Coolify Application UUID, FQDN, secret-names (geen waarden), datum.

**Wat we NIET meer doen:** Railway-deploy, Gitea-mirror voor retroductus.

**Owner:** Janus (delegeert shell/curl-acties; alle schrijfacties binnen `retroductus/`-repo; rapport in `docs/agent-log/`).

**Wat we NIET meer doen:** Railway-deploy. Bestaand Railway-project `retroductus-engine` (1/3 services online, 22d oud) staat gepland voor cleanup in Ordo 11.

**Owner:** Janus (delegeert shell-acties aan legionarius; alle schrijfacties binnen `retroductus/`-repo + dispatch-rapport).

### Ordo 2 — Frontend op Beelink/Coolify + DNS retroductor.nl → Cloudflare + CF Access

**Doel:** `https://retroductor.nl` serveert de volledige Next.js-app, draaiend op Beelink/Coolify, achter Cloudflare Access met e-mail-allowlist. Vercel-project wordt na verificatie gepauzeerd (Ordo 10).

**Besluit (2026-04-24, Legatus):** Scenario 1 gekozen ná Ordo 2 v1 faalde op drie blokkers:

- Vercel Hobby ondersteunt geen Standard Protection voor production deploys ("not available on your plan").
- `retroductor.nl` NS staan op `ns*.vercel-dns.com` maar Vercel heeft `zone=false` → DNS-records via API onmogelijk.
- Engine staat al op Beelink; frontend meenemen is consistent, €0 extra én structurele kostenbesparing.

ADR's te schrijven:
- `docs/adr/0001-deploy-protection.md` — keuze tussen Vercel SSO / e-mail-allowlist / CF Access. Conclusie: CF Access (edge-gate, zelfde als engine).
- `docs/adr/0004-frontend-op-beelink-coolify.md` — rationale voor frontend-migratie naar Beelink.

Eerste deelresultaat uit Ordo 2 v1 blijft geldig (**niet opnieuw doen**):

- CF Access service-token `vercel-retroductus-engine` bestaat en is toegevoegd aan de engine-app. Token in `credentials.md`. Wel relevant: deze token is straks niet meer nodig als frontend op Beelink draait — dan gaat frontend→engine via Docker-intern netwerk. Token kan blijven staan als fallback.
- `CF_ACCESS_CLIENT_ID` + `_SECRET` staan al in de Vercel env-vars; worden overgenomen naar Coolify-app óf genegeerd bij intern verkeer.

**Stappen:**

1. **ADR 0001 + 0004 schrijven**, vóór onomkeerbare infra-acties.
2. **DNS NS-flip voor `retroductor.nl`:**
   - Huidige NS: `ns*.vercel-dns.com`. Doel: NS overzetten naar Cloudflare van account `e63d255986bb0e37756904966d9417dd` (zelfde als cyberductus.nl, cyberica.nl, legioductus.nl).
   - Route: via mijn.host API als registrar mijn.host is (`PUT /api/v2/domains/retroductor.nl` met `nameserver_profile`). Indien registrar anders: melden bij Legatus (handmatige flip).
   - **Eerst check:** wie is registrar? `whois retroductor.nl | grep -i registrar` of via `mijn.host API`. Pattern uit [mijnhost_dns.md](../../../../Users/piete/.claude/projects/c--Projecten/memory/mijnhost_dns.md).
3. **Cloudflare zone aanmaken** voor `retroductor.nl` in het bestaande CF-account. Via API: `POST /zones` met `account.id=e63d25...`. Wacht op status `active` (kan 1-5 min zijn na NS-propagatie).
4. **Coolify Application aanmaken** voor de frontend:
   - `POST /api/v1/applications/public` met `git_repository=https://github.com/ptrdbrbndr/retroductus`, `git_branch=staging`, `build_pack=nixpacks` (Coolify detecteert Next.js automatisch), `base_directory=/`, `ports_exposes=3001` (zie [package.json](../../package.json) → `"dev": "next dev --port 3001"`), `name=retroductus-ui`.
   - Indien nixpacks ontbreekt of faalt op Next.js 15: val terug op een minimale root-level Dockerfile (apart commit).
5. **Env-vars in Coolify** (kopieer wat nu in Vercel staat + nieuwe engine-URL):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — uit huidige Vercel env-vars (`npx vercel env pull` op staging).
   - `SUPABASE_SERVICE_ROLE_KEY` — idem.
   - `MINING_ENGINE_URL` — voorkeur: **Docker-intern adres** (bijv. `http://retroductus-engine-oesusoqq...-container:8000`) zodat frontend→engine zonder CF Access gaat. Alternatief: `https://retroductus-engine.cyberductus.nl` met CF Access headers (token al gezet).
   - `MINING_ENGINE_SECRET` — zelfde waarde als engine (zie credentials.md).
   - `ANTHROPIC_API_KEY` — uit `c:\Projecten\.env` (of uit Vercel).
6. **FQDN `retroductor.nl`** op de Coolify-app zetten. Via API of via directe `applications.fqdn` UPDATE in coolify-db (patroon uit Ordo 1).
7. **Cloudflare Tunnel-hostname** `retroductor.nl` → Beelink Coolify-proxy. Zelfde cloudflared config (`/etc/cloudflared/config.yml`) uitbreiden met een ingress-regel. Let op YAML-indent-bug (Ordo 1 rapport §4).
8. **Cloudflare Access app voor `retroductor.nl`**: nieuwe Access-app aanmaken met **zelfde e-mail-allowlist** als engine-app (`pieter@debrabander.com` + `pieter.de.brabander@ductus.nl`). Sessie 8u. Geen service-token op deze app nodig — alleen intern (Pieter + testers).
9. **Deploy triggeren** + wachten op success.
10. **Verificatie:**
    - `curl -sI https://retroductor.nl` → 302 naar Cloudflare Access (gate werkt).
    - Na SSO-login in browser: volledige landing + `/register` bereikbaar.
    - `curl -H "Host: retroductor.nl" http://192.168.68.69:80/` (intern Traefik) → 200 HTML.
11. **Credentials-update-instructie** aan Legatus (Janus schrijft niet zelf in credentials.md): nieuwe Coolify app UUID, FQDN, CF Access app UUID, zone-ID retroductor.nl, secrets die Legatus moet overnemen.

**Wat we NIET doen in deze ordo:** Vercel-project verwijderen. Pas pauzeren in Ordo 10 ná bewijs dat Beelink-frontend end-to-end werkt (doorloopt Ordo 3 + 4 + 5 + 7 op Beelink).

**Owner:** Janus direct.

### Ordo 3 — DPA-acceptatie in register-flow

**Doel:** gebruiker kan zich niet registreren zonder DPA te accepteren; acceptatie landt in `dpa_acceptance`.

- `src/lib/constants.ts`: `export const DPA_VERSION = '2026-04-24'` (of huidige datum).
- `src/app/(auth)/register/page.tsx`: checkbox + link `/dpa` (target=_blank). Submit disabled tot gechecked.
- `src/app/auth/callback/route.ts` of register-server-action: na `signUp` → `supabase.from('dpa_acceptance').insert({ dpa_version: DPA_VERSION, ip_address: req.headers.get('x-forwarded-for') ?? '0.0.0.0' })`.
- **TDD:** `tests/vibe/fase2-01-register-dpa.test.ts`:
  - submit zonder vinkje → blijft op register-pagina met foutmelding.
  - submit mét vinkje → landt op dashboard; `dpa_acceptance`-row aanwezig (via test-helper).
- **Verificatie:** vibe-test groen; `SELECT * FROM dpa_acceptance` toont test-user.
- **Owner:** Janus delegeert aan scriba-legionarius.

### Ordo 4 — Interne tester-seeding

**Doel:** Pieter + 2–3 interne testers kunnen inloggen met bekende credentials; test-scenario's gedocumenteerd.

- `supabase/seed-testers.sql` (template zonder echte mails — voor in repo).
- Echte tester-lijst + wachtwoorden in `docs/staging-users.md` (Git-tracked maar géén productie-credentials).
- `docs/staging-users.md` bijwerken met Fase 2-scenario's: upload CSV → DFG → conformance → AI insight → DPA-akkoord.
- **Verificatie:** Legatus (Pieter) kan inloggen en één volledige happy-path doorlopen.
- **Owner:** Janus.

### Ordo 5 — Stripe prep-only scaffold

**Doel:** code-haakjes staan klaar, geen runtime-effect. Commits `prep-only, not wired`.

- `npm install stripe @stripe/stripe-js`.
- `src/lib/stripe/plans.ts`:
  ```ts
  export const PLANS = {
    free: { priceId: null, limits: { events: 10_000, projects: 1 } },
    starter: { priceId: process.env.STRIPE_PRICE_STARTER || null, limits: { events: 100_000, projects: 5 } },
    pro: { priceId: process.env.STRIPE_PRICE_PRO || null, limits: { events: Infinity, projects: Infinity } },
  } as const
  export type PlanId = keyof typeof PLANS
  ```
- `src/app/api/stripe/checkout/route.ts`: POST → 501 met `{ error: 'Stripe is nog niet geactiveerd' }`.
- `src/app/api/stripe/webhook/route.ts`: POST → 501.
- `.env.example` uitbreiden: `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `STRIPE_PRICE_STARTER=`, `STRIPE_PRICE_PRO=`.
- **TDD:** `tests/vibe/fase2-03-stripe-stub.test.ts` — POST `/api/stripe/checkout` → 501 + errormsg NL.
- **Verificatie:** vibe-test groen; `grep -r "stripe.Stripe" src/` toont geen actief gebruik.
- **Owner:** Janus delegeert aan scriba-legionarius; commit-boodschap verplicht `chore(stripe): prep-only scaffold, not wired`.

### Ordo 6 — Conductus-integratie (engine-zijde + contract)

**Doel:** engine accepteert `X-Tenant-Id` header op Flowable-connector, scoped per tenant. Contract-documentatie leesbaar voor Centurio Concordius.

- `engine/routers/connectors.py`: add `X-Tenant-Id` header-parsing + doorgeven naar `mining_jobs`-insert.
- `src/app/api/flowable-sync/route.ts`: `X-Tenant-Id` doorgeven uit request naar engine.
- Migratie `supabase/migrations/20260424000001_integration_ready.sql`:
  ```sql
  ALTER TABLE mining_jobs
    ADD COLUMN conductus_tenant_id text NULL;
  CREATE INDEX idx_mining_jobs_conductus_tenant ON mining_jobs(conductus_tenant_id)
    WHERE conductus_tenant_id IS NOT NULL;
  -- RLS blijft op user_id; conductus_tenant_id is label, geen toegangscontrole
  ```
- `docs/integratie-conductus.md` bijwerken: alleen Fase 1 (migratie) + Fase 3 (features utility) + Fase 4 (sidebar) + Fase 6 (admin-toggle) van toepassing; Fase 2 + 5 geschrapt voor Fase 2-intern.
- **TDD:** `tests/vibe/fase2-04-flowable-tenant.test.ts` — sync met header `X-Tenant-Id: tnt-test` → `mining_jobs.conductus_tenant_id = 'tnt-test'`.
- **Verificatie:** vibe-test groen; integratie-contract staat in `docs/integratie-conductus.md` (versie 2).
- **Owner:** Janus; levert contract schriftelijk aan Legatus voor doorgave aan Concordius.

### Ordo 7 — AI-insights end-to-end verifiëren

**Doel:** SSE-stream werkt op staging met geldige `ANTHROPIC_API_KEY`.

- `ANTHROPIC_API_KEY` check in Vercel + Railway env-vars.
- `tests/vibe/fase2-05-insights-sse.test.ts` — stream levert eerste chunk binnen 3s; geen 500.
- **Verificatie:** vibe-test groen op staging-deploy.
- **Owner:** Janus.

### Ordo 8 — Vibe-coverage baseline

**Doel:** `tests/`-dir bevat alle Fase 2-tests, `./vibe-check.sh` groen, rapport in `docs/agent-log/`.

- Alle fase2-*.test.ts bestanden aanwezig en groen.
- Nieuwe ordo-agent-log: `docs/agent-log/2026-04-24-vibe-baseline.md` met `vibeCheck` screenshots.
- **Verificatie:** `./vibe-check.sh` → 0 fouten.
- **Owner:** Janus.

### Ordo 9 — Retentie-cleanup (script, niet activeren)

**Doel:** cleanup-SQL klaar, gepland voor activatie in Fase 2.5.

- `supabase/migrations/20260424000002_retention_cleanup_function.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION cleanup_old_event_logs() RETURNS void
    LANGUAGE sql AS $$
    DELETE FROM event_logs WHERE uploaded_at < NOW() - INTERVAL '30 days';
  $$;
  ```
- ADR `docs/adr/0002-retention-cleanup-strategy.md`: Vercel Cron vs `pg_cron` — beslissing + activatie-moment.
- **Verificatie:** functie bestaat in Supabase staging. Niet in cron-schema nog.
- **Owner:** Janus.

### Ordo 10 — Cleanup: Railway + Vercel uitfaseren

**Doel:** geen dubbele infrastructuur en geen maandelijkse kosten voor resources die niet meer gebruikt worden.

**Voorwaarde:** Ordo 1 (Beelink-engine live + publiek /health=200) + Ordo 2 (Beelink-frontend live op `retroductor.nl`) + Ordo 7 (AI-insights end-to-end groen) zijn alle drie ✅. Plus minstens één volledige happy-path test (upload → DFG → conformance → AI-insight) doorlopen door Legatus op Beelink-deploy.

**Stappen:**

1. **Railway `retroductus-engine` project pauzeren:**
   - Verifieer dat `MINING_ENGINE_URL` in de Beelink-frontend env-vars wijst naar de Beelink-engine (niet meer Railway).
   - **Backup eerst:** `railway run "pg_dump $DATABASE_URL" > engine-railway-backup-2026-04-24.sql` als er een Postgres-service in het Railway-project zit met data. Indien geen data: skip.
   - Railway dashboard → project `retroductus-engine` → **Pause** (niet direct deleten — 14 dagen grace-period).
   - Na 14 dagen zonder issues: project verwijderen.
2. **Vercel `retroductus` project pauzeren:**
   - Verifieer dat `retroductor.nl` DNS nu naar Cloudflare → Beelink-tunnel resolveert, niet meer naar Vercel.
   - `npx vercel env pull` alle env-vars lokaal wegschrijven als back-up in `c:\Projecten\retroductus\.tmp\vercel-env-backup-2026-04-24.env` (gitignored).
   - `npx vercel domains rm retroductor.nl --scope=ptrdbrbndrs-projects` — domein verwijderen uit Vercel-project.
   - Vercel dashboard → project `retroductus` → **Pause deployments** (via Settings → General → Pause). Niet deleten — 14d grace.
   - Na 14 dagen zonder issues: project verwijderen via `npx vercel remove retroductus --yes`.
3. **Credentials + decisions + superductus update-instructies aan Legatus** in agent-log:
   - `credentials.md` → Railway-sectie afvinken; Vercel-sectie voor retroductus afvinken of verwijderen.
   - `decisions.md` → retroductus.nl-sectie: "Engine + Frontend op Beelink/Coolify per 2026-04-24; Railway + Vercel uitgefaseerd".
   - `superductus/src/lib/projects-data.ts` → Retroductus `fase: 'Fase 2'`, `voortgang: 70-80` (afhankelijk van overige ordines).

**Verificatie:**

- Railway dashboard: `retroductus-engine` = paused.
- Vercel dashboard: `retroductus` project = paused, `retroductor.nl` domein niet meer gekoppeld.
- `dig retroductor.nl +short` → Cloudflare (`cfargotunnel.com`), niet Vercel.
- Interne testers merken niets — `retroductor.nl` blijft laden (via Beelink).

**Owner:** Janus.

### Ordo 11 — Oplevering: STAPPENPLAN, BUSINESSPLAN, superductus

**Doel:** administratie bijgewerkt, Fase 2 afgevinkt op alle relevante plekken.

- `docs/STAPPENPLAN.md` (of opvolger) krijgt Fase 2-sectie met checkboxes.
- `docs/BUSINESSPLAN.md` status: "Fase 2 — intern testen actief".
- `c:\Projecten\superductus.nl\src\lib\projects-data.ts`: `retroductus` → `fase: 'Fase 2'`, `voortgang: 50-60` (afhankelijk van Ordo 1-9 voltooidheid).
- Agent-log-dispatch: `docs/agent-log/2026-04-24-fase-2-oplevering.md`.
- **Verificatie:** superductus-dashboard toont Retroductus op Fase 2.
- **Owner:** Janus.

---

## Definition of Done (Slag Fase 2)

- [ ] `retroductor.nl` live, Vercel-protection aan, SSO werkt voor Pieter + interne testers.
- [ ] Engine `/health` op Railway → 200.
- [ ] DPA-acceptatie verplicht in register, `dpa_acceptance`-row per gebruiker.
- [ ] Stripe SDK + stubs aanwezig, alle stub-routes returnen 501, geen Price ID live.
- [ ] `X-Tenant-Id` contract werkt; `conductus_tenant_id` in `mining_jobs`.
- [ ] AI-insights SSE-stream groen in vibe-test op staging.
- [ ] `./vibe-check.sh` — 0 fouten, 0 console errors, 0 failed tests.
- [ ] ADR 0001 + 0002 vastgelegd.
- [ ] `docs/staging-users.md` bijgewerkt met Fase 2-scenario's.
- [ ] `projects-data.ts` in superductus toont Fase 2.
- [ ] `STAPPENPLAN.md` / `BUSINESSPLAN.md` bijgewerkt.
- [ ] Railway `retroductus-engine` project gepauzeerd, `decisions.md` bijgewerkt.

## Afhankelijkheden

- `mijn.host` API-key nodig voor DNS (staat in `c:\Projecten\.env`).
- Railway-project bestaat; token in credentials.md (verifiëren).
- Vercel CLI geauthenticeerd (`npx vercel whoami`).
- Supabase staging-project met service-role-key.

## Escalatie naar Legatus

- Wanneer tester-lijst definitief is (Ordo 4).
- Wanneer het Conductus-contract klaar is om door te geven aan Concordius (Ordo 6).
- Bij ADR-beslissingen (Ordo 2 en 9) — go van Legatus verplicht.
- Bij scope-creep of onverwachte dep-hel (bv. PM4Py-build faalt).
