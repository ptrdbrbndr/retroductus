# Ordo 10 — Railway + Vercel uitfaseren voor retroductus

**Datum:** 2026-04-26
**Centurio:** Janus
**Branch:** `staging` (laatste commit: `42889b9`)
**Plan:** `docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md` § Ordo 10

## Doel

Railway-project `retroductus-engine` pauzeren en Vercel-project `retroductus` ontkoppelen van git + retroductor.nl-domein verwijderen, zodat geen ongewilde deploys meer plaatsvinden en `retroductor.nl` niet meer naar Vercel kan resolveren. Backups vóór elke wijziging. Geen rollback nodig.

## Pre-flight verificatie

| Check | Status |
| --- | --- |
| DNS `retroductor.nl` → CF proxy IPs (`188.114.96.0`, `188.114.97.0`) | OK — geen Vercel A-records |
| NS `retroductor.nl` → `bradley.ns.cloudflare.com`, `ollie.ns.cloudflare.com` | OK |
| Live app `https://retroductor.nl/` → 302 naar `dbrbndr.cloudflareaccess.com` | OK — CF Access gate werkt, server `cloudflare` |
| Engine + UI op Coolify running, vibe-baseline 46/0/3 | OK (Legatus pre-flight) |
| Vercel CLI auth: `whoami` = `ptrdbrbndr` | OK |

Conclusie: publiek verkeer loopt al volledig via Beelink/Coolify; Vercel is feitelijk dood path.

## Stap 1 — Backup Vercel env-vars

```
npx vercel env pull .tmp/vercel-env-final-2026-04-26.env --environment=production --scope=ptrdbrbndrs-projects
npx vercel env pull .tmp/vercel-env-preview-2026-04-26.env --environment=preview  --scope=ptrdbrbndrs-projects
```

Resultaten:

- `c:\Projecten\retroductus\.tmp\vercel-env-final-2026-04-26.env` (2401 B)
- `c:\Projecten\retroductus\.tmp\vercel-env-preview-2026-04-26.env` (2364 B)

Functionele keys (8): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MINING_ENGINE_URL`, `MINING_ENGINE_SECRET`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `NEXT_PUBLIC_COMING_SOON`, plus build-meta. Alle 8 staan al in Coolify (`retroductus-ui`-app, decisions credentials.md regel 253).

`.tmp/` is gitignored. Backup blijft bewaard.

## Stap 2 — Railway `retroductus-engine` pauzeren

**Status: GEBLOKKEERD — handmatige actie Pieter nodig.**

GraphQL-call naar `https://backboard.railway.app/graphql/v2` met `RAILWAY_API_TOKEN=d3bcd6f7-...` (uit MEMORY.md):

- `Authorization: Bearer …` → `{"errors":[{"message":"Not Authorized"...}]}`
- `Project-Access-Token: …` → idem

Token is dood (zoals briefing voorzag). Geen alternatieve API-credential beschikbaar.

**Handmatige actie Pieter:** Railway dashboard → project `retroductus-engine` → Settings → **Pause** (niet deleten, 14d grace).

Risico van uitstel = nul: engine draait al op Beelink (`https://retroductus-engine.cyberductus.nl`), Frontend wijst daarheen via `MINING_ENGINE_URL`. Het Railway-project verbruikt enkel hobby-tier resources; het kan ook gewoon idle blijven tot pauze.

## Stap 3 — Vercel domein + git-integration ontkoppelen

### 3a — Domein `retroductor.nl` verwijderd

```
npx vercel domains rm retroductor.nl --scope=ptrdbrbndrs-projects --yes
> Success! Domain retroductor.nl removed [1s]
```

Ook 2 aliassen gevolgd (waarschuwing in CLI-output). Verificatie:

```
npx vercel domains inspect retroductor.nl --scope=ptrdbrbndrs-projects
> Error: Domain not found by "retroductor.nl" under ptrdbrbndrs-projects.
```

Domein definitief weg uit Vercel-account. `retroductor.nl` kan niet meer per ongeluk naar Vercel resolveren.

### 3b — Git-integration ontkoppeld

```
npx vercel git disconnect --yes --scope=ptrdbrbndrs-projects
> Disconnected ptrdbrbndr/retroductus.
```

`vercel git disconnect` (native CLI-commando, géén REST API nodig) — geen API-token-zoektocht in `auth.json` nodig gebleken. Project blijft in dashboard zichtbaar maar reageert niet meer op `git push`.

### 3c — Project-status

`npx vercel project ls` toont `retroductus` nog (zonder git, zonder domein). Bewust niet gedeletet — 14d grace voor rollback. Project-ID: `prj_FPL4NB5JYYgRv4AHFQ1vzUSi81yP`.

## Stap 4 — DNS sanity-check (post-actie)

```
Resolve-DnsName retroductor.nl @1.1.1.1
> A 188.114.97.0
> A 188.114.96.0  (Cloudflare proxy)

curl -I https://retroductor.nl/
> 302 → https://dbrbndr.cloudflareaccess.com/...
> Server: cloudflare
```

Geen Vercel A-record (`76.76.21.21`) of nameserver. CF Access gate intact.

## Stap 5 — Wat Legatus nog moet doen

### 5a — Memory-updates

Append in `c:\Projecten\memory\decisions.md`:

```
### retroductus.nl
- Engine + Frontend op Beelink/Coolify per 2026-04-25/26 (Fase 2 intern testen).
- Railway `retroductus-engine` project gepauzeerd 2026-04-26 (14d grace) — handmatig
  via dashboard, want API-token dood.
- Vercel `retroductus` project ontkoppeld van git + retroductor.nl-domein verwijderd
  2026-04-26 (14d grace, project nog niet gedeletet).
- DNS NS via Cloudflare (zone abd0b5fd...), Tunnel v33+, CF Access e-mail-allowlist.
- Supabase self-host op Beelink (zie credentials.md retroductus-engine + retroductus-ui).
```

In `c:\Users\piete\.claude\projects\c--Projecten\memory\credentials.md`:

- Sectie `retroductus-engine (Beelink, 2026-04-24)` — toevoegen na Status-regel:
  `- **Railway**: status "uitgefaseerd 2026-04-26 (handmatig pauzeren door Pieter, 14d grace)"`
- Sectie `retroductus-ui (Beelink, 2026-04-24)` — toevoegen na Status-regel:
  `- **Vercel**: project `prj_FPL4NB5JYYgRv4AHFQ1vzUSi81yP` git-disconnected + domein verwijderd 2026-04-26 (14d grace, niet gedeletet).`

### 5b — Handmatig Pieter

Railway dashboard → `retroductus-engine` → Pause. Geen haast, draait niet meer in productie-pad.

## Risico-analyse

- **Engine draait nog steeds**: ja — onafhankelijk op Beelink. Railway-instance is shadow.
- **Frontend bereikbaar**: ja — CF Tunnel → Beelink Coolify-app, geverifieerd 302 → CF Access.
- **Rollback mogelijk**: ja — 14d grace; Vercel-project bestaat nog. Domein opnieuw toevoegen via `vercel domains add` zou kunnen, mits NS terug naar Vercel.
- **`src/app/page.tsx` aangeraakt**: nee.
- **Vibe-tests**: niet relevant — geen code-wijziging.

## Bestanden gewijzigd

- `c:\Projecten\retroductus\.tmp\vercel-env-final-2026-04-26.env` (nieuw, gitignored)
- `c:\Projecten\retroductus\.tmp\vercel-env-preview-2026-04-26.env` (nieuw, gitignored)
- `c:\Projecten\retroductus\docs\agent-log\2026-04-26-ordo-10-railway-vercel-uitfaseren.md` (dit rapport)

Geen code-wijzigingen. Geen secrets in dit rapport (token-fragmenten geredacteerd; functionele key-namen wel benoemd zonder waardes).
