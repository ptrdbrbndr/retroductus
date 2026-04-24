# ADR 0004 — Frontend (Next.js) op Beelink/Coolify i.p.v. Vercel

- **Status:** geaccepteerd
- **Datum:** 2026-04-24
- **Cohort:** Retroductus — Fase 2 (intern testen)
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 2 (v2)
- **Zusters:** ADR 0001 (deploy-protection via CF Access), ADR 0003 (engine op Beelink).

## Context

De retroductus-frontend (Next.js 15) draaide sinds 2026-03-14 op Vercel
Hobby, met `retroductor.nl` als gekoppeld domein (NS bij Vercel,
`zone=false`). Ordo 2 v1 heeft bewezen dat drie blokkers tegelijk optreden:

1. Vercel Hobby levert geen Standard Protection voor production — vereiste
   voor de Fase 2-gate.
2. `retroductor.nl` DNS-records zijn niet beheersbaar via Vercel API
   (zone=false).
3. De engine staat al op Beelink/Coolify achter Cloudflare Access; een
   split-stack met Vercel-frontend + Beelink-engine vereist een permanente
   CF Access service-token-roundtrip (kostbaarder, complexer) dan een
   Docker-intern netwerk.

Tier-2-projecten (iductus, deductus, eductus, aquaductus, superductus) draaien
inmiddels op Beelink/Coolify met een uniform patroon (GitHub → Coolify build,
Cloudflare Tunnel + Access, Traefik-vhost). Retroductus meenemen in dat
patroon is consistent en kostenneutraal.

## Beslissing

Frontend draait als Coolify Application `retroductus-ui` op Beelink:

- **Source**: `https://github.com/ptrdbrbndr/retroductus` (public), branch
  `staging`. Geen Gitea-mirror — repo is public.
- **Build**: Nixpacks (Next.js auto-detect). Fallback: root-level
  `Dockerfile` als nixpacks op Next.js 15 struikelt — commit
  `chore: add root Dockerfile for Coolify nixpacks fallback`.
- **FQDN**: `https://retroductor.nl` via bestaande Cloudflare Tunnel
  `4931da40-8b72-4cc3-8f7e-6802b5e948a5` (remotely-managed — ingress
  bijwerken via CF API, géén lokale YAML-edits; les uit Ordo 1 addendum).
- **Deploy-protection**: Cloudflare Access, zie ADR 0001.
- **Port**: 3001 (uit `package.json` scripts).
- **Frontend → engine**: voorkeur Docker-intern
  (`http://<engine-container>:8000`), fallback CF Access service-token naar
  `https://retroductus-engine.cyberductus.nl`.

Vercel-project `retroductus` blijft initieel **bestaan en actief** — pas
pauzeren in Ordo 10 ná bewezen Beelink-deploy door Ordo 3 + 4 + 5 + 7.

## Alternatieven overwogen

1. **Op Vercel blijven + Pro-upgrade** ($20/mnd account-breed). Lost
   protection + DNS in één klap op, maar legt een permanente kost bij een
   intern tooling-keuze en verplaatst de problemen van `zone=false` niet
   op — zone-activatie blijft een handmatige Vercel-dashboard-actie met
   onduidelijke API-support.
2. **Vercel blijven + middleware-gate**. Verworpen, zie ADR 0001 alt. 2.
3. **mijn.host Ultimate (Node)**. Verworpen voor Fase 2: minder observability,
   geen Cloudflare Access-integratie, deploy-tooling onvolwassen. Blijft
   kandidaat voor een publieke Fase 3-landing ernaast.

## Gevolgen

**Positief**

- Eén patroon voor 7+ Tier-2 projecten op Beelink — onderhoudbaar.
- €0 extra infra-kosten t.o.v. Vercel Hobby; Vercel Pro bespaard.
- Frontend→engine via Docker-intern → geen CF Access service-token
  roundtrip, lagere latency, minder secrets in Vercel-env.
- ADR 0001 (Access) consolideert protection over álle Retroductus-endpoints.
- Publieke launch later: flexibel. Optie A = tweede Coolify-app zonder
  Access op `master`-branch. Optie B = aparte publieke host (mijn.host
  Ultimate) die coming-soon of landing serveert tot staging go-live.

**Negatief**

- Beelink single-node = single point of failure. Acceptabel voor Fase 2
  (intern); Fase 3 overweegt 2e Beelink warm-standby (staat al gepland in
  cyberductus migratie-plan).
- Build-resource: Next.js 15 build via Nixpacks kan 4-8 min kosten op
  Beelink (i13). Acceptabel.
- Vercel-project blijft tijdelijk draaien — Ordo 10 ruimt op.

## Exit-criteria

Herzien wanneer:

1. **Publieke launch Fase 3**: frontend-deploy splitsen in "intern staging"
   (Access aan) + "publieke production" (aparte Coolify-app of mijn.host
   Ultimate, geen Access). De Beelink-app blijft dan voor intern.
2. Beelink-capaciteit kritiek schaars wordt (bijv. door Cyberica-peaks).
   Dan overweegt Legatus verplaatsing naar 2e Beelink of terug naar Vercel
   Pro.

## Verificatie

```
curl -sI https://retroductor.nl
# Verwacht: HTTP/1.1 302 → dbrbndr.cloudflareaccess.com/cdn-cgi/access/login/…

curl -H "Host: retroductor.nl" http://192.168.68.69:80/
# Verwacht: 200 of 3xx (redirect naar login of /app)
```

Browser → SSO-login → landing + `/register` + volledige dashboard werkt.
Frontend → engine roundtrip (bijv. `/api/conformance`) geeft 200 of 401
(authenticatie-redirect), géén 502/504.
