# Missio — Ordo 3: DPA-acceptatie in register-flow (GEBLOKKEERD)

- **Datum:** 2026-04-24
- **Agent:** Centurio Janus
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 3
- **Status:** Geblokkeerd vóór Stap 2 (vibe-test). Geen code-wijzigingen uitgevoerd.

## Doel (ongewijzigd)

Gebruiker kan zich niet registreren zonder DPA-checkbox te accepteren; bij
submit landt één record in `dpa_acceptance` met `dpa_version` + `ip_address`.

## Kritieke vondst

De briefing + plan verwijzen naar bestanden die **op `staging` niet bestaan**:

- `src/app/dpa/page.tsx` — alleen op `master` (commit `b3fe8ce — feat: stap 11 DPA`).
- `supabase/migrations/20260316000002_dpa_acceptance.sql` — alleen op `master`.
- Complete `supabase/migrations/`-map (6 migraties) — alleen op `master`.

### Git-verificatie (raw)

```
$ git branch --show-current
staging

$ git ls-tree -r --name-only staging | grep -iE "dpa|supabase/migrations"
src/lib/supabase/client.ts
src/lib/supabase/server.ts
(geen DPA-bestanden, geen migrations)

$ git ls-tree -r --name-only master | grep -iE "dpa|supabase/migrations"
docs/DPA.md
src/app/dpa/page.tsx
supabase/migrations/20260314000001_rls_tenant_isolation.sql
supabase/migrations/20260314000002_user_plans.sql
supabase/migrations/20260315000001_admin_flag.sql
supabase/migrations/20260315000002_issues.sql
supabase/migrations/20260316000001_add_filename_to_mining_jobs.sql
supabase/migrations/20260316000002_dpa_acceptance.sql

$ git log --oneline master..staging | wc -l
4

$ git log --oneline staging..master | wc -l
31
```

Staging heeft 4 commits na divergentie, master heeft 31. Vrijwel alle
Fase 1-feature-code (volledige UI, engine, AI-insights, conformance,
migraties, DPA) zit op `master` en is **nooit naar `staging` gemerged**.

## Conflict met harde guardrail

`c:\Projecten\CLAUDE.md` "ABSOLUTE RULE: Staging heeft NOOIT een coming soon
pagina" — de tegenzijde daarvan: **staging is altijd de volledige,
functionele applicatie**. Dat is op dit moment niet het geval voor
retroductus:

- `src/app/page.tsx` op staging = volledige landing (goed).
- Maar `/dpa`, `/app/...`, `/api/...`, DB-migraties zijn er niet of
  onvolledig (alle feature-commits zitten op master).
- Ordo 1 (engine) + Ordo 2 (frontend) kozen `staging` als deploy-branch voor
  Coolify. Staging wordt dus live gedeployed terwijl het incompleet is.

Dit had door Ordo 0 (of status-audit) opgemerkt moeten worden. De
Explorator-audit van 2026-04-24 beschrijft `/dpa/page.tsx` en de migraties
als "volledig uitgewerkt" — die audit is op `master` gedaan, niet op
`staging`. Hierdoor leest het plan alsof de prerequisites aanwezig zijn.

## Wat NIET gedaan (bewust)

- Geen code geschreven in `src/app/(auth)/register/page.tsx`.
- Geen vibe-test `tests/vibe/fase2-01-register-dpa.test.ts` aangemaakt.
- Geen `src/lib/constants.ts` aangemaakt.
- Geen merge, cherry-pick of rebase van `master` → `staging` uitgevoerd.
- Geen commit of push.

Rationale: een `master` → `staging` synchronisatie van 31 commits is
scope-creep buiten Ordo 3 en raakt de resultaten van Ordo 1 + 2 (die op
`staging` als basis zijn gebouwd). Zo'n beslissing hoort bij Legatus, met
bewuste volgorde: eerst sync, dan Ordo 3 opnieuw dispatchen.

## Aanvullende vondsten

- `supabase/.temp/project-ref` = `ttfgpbuievkuiwdhmtaz` (Supabase Cloud).
  Eén Supabase-project voor zowel master als staging. Migraties die ooit via
  `supabase db push` vanaf master zijn gedraaid, staan dus wél in de cloud-DB
  — inclusief `dpa_acceptance`. Niet geverifieerd; heeft Legatus-input nodig
  (geen service-role-key in scope van deze missio).
- `src/app/coming-soon.tsx` bestaat op staging als component. `page.tsx` op
  staging importeert de landing rechtstreeks, niet de coming-soon. Staging
  voldoet op dát punt aan de regel.
- Er zijn twee parallelle branches `main` + `main-clean` + `staging-clean` in
  de repo. Niet onderzocht of die relevant zijn voor de sync-beslissing.

## Openstaande punten — Legatus-beslissing vereist

### Route A — Sync master → staging vóór Ordo 3

Pro:

- Staging wordt de "volledige functionele app" zoals de harde regel vereist.
- Ordo 1 + 2 (Coolify-deploy op staging) krijgen daadwerkelijk een
  werkende Next.js-app + engine, niet alleen skelet.
- Ordo 3 + 4 + 5 + 6 + 7 kunnen zonder blokker uitgevoerd worden.

Con:

- Grote merge (31 commits); kans op conflicten in vercel/coolify-config en
  `.env.example`.
- Vergt een nieuwe missio (Ordo 2.5 — "Branch-sync") met eigen vibe-check.

### Route B — Cherry-pick alleen DPA-prerequisites

Alleen `b3fe8ce` (stap 11 DPA — verwerkersovereenkomst) + de 6 migraties
cherry-picken naar staging. Niet de volledige UI.

Con:

- Dekt het probleem niet op; na Ordo 3 komen de volgende ordo's die ook
  ontbrekende master-code nodig hebben.
- Risico op half-werkende app op Coolify.

### Route C — Doorschuiven van staging-deploys tot merge klaar is

Accepteer tijdelijk dat Coolify-staging pas "echt" live is als Route A
klaar is. Ordo 3 wacht dan.

### Aanbeveling van Janus

Route A. Laat een aparte legionarius-dispatch de master → staging sync
afhandelen: `git checkout staging && git merge master --no-ff` + conflicten
oplossen + vibe-check groen + push. Daarna Ordo 3 opnieuw dispatchen.

Tijdens die sync twee extra aandachtspunten:

1. Master-`src/app/page.tsx` MAG NIET per ongeluk mee-gemerged worden naar
   staging als dat een coming-soon bevat. Verifieer na merge dat
   `src/app/page.tsx` op staging de volledige landing blijft serveren.
2. Coolify-deploys van Ordo 1 + 2 gebruiken `staging`-branch. Na merge
   automatisch een redeploy; controleer dat niets breekt (build,
   env-vars, FQDN).

## Guardrails gerespecteerd

- Geen blind improviseren bij een blokker (castrum-guardrail 8).
- Rapport landt in `docs/agent-log/` conform globale regel.
- Geen secrets opgenomen.
- Geen writes buiten `c:\Projecten\retroductus\docs\agent-log\`.
- Memory / credentials / decisions niet aangepast.
