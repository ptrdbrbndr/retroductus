# ADR 0003 — Engine op Beelink/Coolify i.p.v. Railway

- **Status:** Accepted
- **Datum:** 2026-04-24
- **Besluitvormer:** Legatus (Pieter de Brabander), uitgevoerd door Centurio Janus
- **Fase:** Fase 2 — intern testen

## Context

De Retroductus-mining-engine (Python/FastAPI + PM4Py) draait sinds de bootstrap
op Railway (`retroductus-engine`). Voor Fase 2 moet de engine op een publieke
FQDN bereikbaar zijn voor de Vercel-frontend en interne testers. Parallel loopt
sinds 2026-04-21 een bredere infra-migratie (Modus D): Supabase-stacks en
ondersteunende services voor de meeste Tier-2-projecten (iductus, deductus,
eductus, aquaductus, superductus, ons) zijn inmiddels zelf-gehost op Beelink via
Coolify, met publiek HTTPS via één gedeelde Cloudflare Tunnel naar
`*.cyberductus.nl`.

Tegelijk blijft Railway 5 USD/maand vaste kosten + usage opleveren voor een
service die we nog nauwelijks onder load zetten.

## Beslissing

De Retroductus-engine wordt **niet opnieuw op Railway gedeployed**; in plaats
daarvan gaat hij direct als Coolify-applicatie op de Beelink draaien.

- **Build-pack:** Dockerfile-mode, build-context `engine/`, bestaand
  `engine/Dockerfile` (python:3.12-slim + graphviz + libpq-dev).
- **Bron:** publieke GitHub-repo `https://github.com/ptrdbrbndr/retroductus`,
  branch `staging`. Geen Gitea-mirror nodig omdat de repo public is.
- **FQDN:** `https://retroductus-engine.cyberductus.nl`, achter dezelfde
  Cloudflare Tunnel en Access e-mail-allowlist als andere Tier-2-services.
- **Auth:** MINING_ENGINE_SECRET voor service-to-service (Vercel → engine) via
  Cloudflare Access service-token; Supabase-JWT voor eventuele directe
  gebruikersverzoeken (bestaande auth-module, geen wijziging).

Het bestaande Railway-project wordt pas uitgefaseerd (Ordo 10) nadat de
Beelink-engine bewezen stabiel is en de end-to-end AI-insights-flow groen is.

## Rationale

1. **Kostenbesparing** — Railway Hobby-plan verdwijnt, Beelink-hardware is al
   aangeschaft en draait 24/7 voor andere services.
2. **Consistentie** — hele Tier-2-stack staat nu in één Coolify-instance met één
   Cloudflare-tunnel. Monitoring, backups en deploys gaan via één pad.
3. **Capaciteit volstaat voor Fase 2** — intern testen met enkele gebruikers en
   event-logs ≤100k events past ruimschoots binnen de 64 GB RAM van de Beelink.
4. **Geen vendor lock-in** — Dockerfile-gebaseerde deploy is portabel naar elke
   Container-host (Railway, Fly, Render, een andere Coolify) zonder
   code-wijziging.
5. **PM4Py past beter bij persistent compute** dan bij Vercel Edge of andere
   serverless-targets — zie castrum-guardrail 4 ("PM4Py niet in serverless").

## Alternatieven overwogen

- **Railway behouden.** Werkt nu, maar betekent doorlopende kosten en een
  tweede infra-stack naast de Coolify-lijn. Geen toegevoegde waarde boven de
  Beelink zolang we Fase 2-load hebben.
- **Vercel serverless.** Valt af: PM4Py + graphviz + pandas is te zwaar voor
  cold-start en heeft native deps die serverless niet aankan.
- **Dedicated VPS (Hetzner, DigitalOcean).** Extra maandelijkse kosten voor
  één service terwijl de Beelink idle capaciteit heeft.
- **AWS Fargate / ECS.** Operationele complexiteit niet gerechtvaardigd in
  Fase 2 — reoverweegbaar bij Tier-3-upgrade.

## Gevolgen

- Positief: één maandelijkse rekening minder, één operations-pad, snellere
  iteratie omdat Coolify webhook + Cloudflare Tunnel al bestaan.
- Negatief: de Beelink wordt single-point-of-failure voor meer services. Dit
  is acceptabel in Fase 2 (intern testen); een warm-standby Beelink is
  gepland voor Tier-2-hardening.
- Vervolgactie: Ordo 10 (Railway `retroductus-engine` pauzeren) pas uitvoeren
  na verificatie dat alle flows op de Beelink-engine groen zijn.

## Exit-criteria — wanneer opnieuw overwegen

- Eerste betalende klant in productie: upgrade naar zwaardere hardware of
  terugvallen op managed container-platform met SLA (Fly.io / Railway Pro).
- Mining-jobs overschrijden 100k events consistent of latency >2s op DFG-render:
  hardware-upgrade (ADR volgt).
- Beelink down-tijd >1u per maand cumulatief: warm-standby Beelink activeren
  (reeds besteld).

## Referenties

- Spec: [`docs/superpowers/specs/2026-04-24-fase-2-intern-testen-design.md`](../superpowers/specs/2026-04-24-fase-2-intern-testen-design.md)
- Plan: [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 1
- Modus-D runbook: [`../../../cyberductus.nl/docs/MIGRATIE-RUNBOOK-MODUS-D.md`](../../../cyberductus.nl/docs/MIGRATIE-RUNBOOK-MODUS-D.md)
- Migratie-context: [`../../../cyberductus.nl/docs/MIGRATIE-STAPPENPLAN.md`](../../../cyberductus.nl/docs/MIGRATIE-STAPPENPLAN.md)
