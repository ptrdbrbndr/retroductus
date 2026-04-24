# Missio — Ordo 2 (v2): Frontend op Beelink + DNS retroductor.nl + CF Access

- **Datum:** 2026-04-24
- **Agent:** Centurio Janus
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 2 (v2, Scenario 1)
- **ADRs:** [`docs/adr/0001-deploy-protection.md`](../adr/0001-deploy-protection.md) (herschreven) + [`docs/adr/0004-frontend-op-beelink-coolify.md`](../adr/0004-frontend-op-beelink-coolify.md)
- **Status:** gedeeltelijk geslaagd — intern draait alles, publiek geblokkeerd door NS-flip-issue bij registrar

## Doel

`https://retroductor.nl` serveert de volledige Next.js-app op Beelink/Coolify,
achter Cloudflare Access (e-mail-allowlist). NS van Vercel naar Cloudflare.

## Resultaat per stap

### Stap 1 — ADR's — GESLAAGD

- Oude `0001-deploy-protection-vercel.md` verwijderd (Vercel SSO-route).
- Nieuwe `0001-deploy-protection.md` geschreven (CF Access, bewuste keuze op
  3 blokkers: Hobby-plan geen SSO / zone=false / consistentie engine).
- `0004-frontend-op-beelink-coolify.md` geschreven met rationale + exit-criteria
  inclusief publieke Fase 3-optie (aparte Coolify-app of mijn.host Ultimate).

### Stap 2 — CF zone + NS-flip — GEDEELTELIJK

- **CF zone aangemaakt**: `abd0b5fdda35c9d0ceeeffd9c7c60f00`,
  status `pending`. Toegewezen NS-pair `bradley.ns.cloudflare.com` +
  `ollie.ns.cloudflare.com` — matcht bestaand mijn.host-profiel
  `cloudflare-logi`. Geen nieuw profiel nodig.
- **NS-flip via mijn.host API — GEBLOKKEERD.** Meerdere pogingen met
  `PUT /api/v2/domains/retroductor.nl`:
  - `{"nameserver_profile":"cloudflare-logi"}` → `200 "successfully edited"`,
    maar `GET` toont nog steeds `ns1/ns2.vercel-dns.com`.
  - `{"nameservers":["bradley.ns.cloudflare.com","ollie.ns.cloudflare.com"]}`
    → idem 200 OK, geen effect.
  - Zowel PUT als PATCH proberen → idem.
  - Ook `default-mijnhost` werkt niet — API retourneert consistent 200 maar
    NS blijven op Vercel (ook na 5+ minuten SIDN-polling via 194.0.28.53).
- mijn.host zegt `"DNS records not managed by mijn.host"` op
  `/domains/retroductor.nl/dns`. Dat klopt — NS staan immers bij Vercel.
  Maar de NS-wijziging zelf (registrar-level, niet zone-level) zou los daarvan
  moeten werken zoals bij eerdere domeinen (cyberductus, iductus).
- Domein is niet locked (`is_locked=false`, `is_lockable=false`).
- Dit patroon is hetzelfde als in Ordo 2 v1 werd waargenomen. Hoogst
  waarschijnlijk is er bij dit specifieke domein een mijn.host-registrar-state
  die alleen via het klantpaneel resetbaar is. **Actie Legatus vereist** —
  zie onder.

### Stap 3 — CF Tunnel-ingress + DNS-CNAME — GESLAAGD

- **CF DNS-record** in nieuwe zone: CNAME `@` →
  `4931da40-...cfargotunnel.com`, proxied=true. Record-ID
  `791ddce06235cba7f64118c040ce279b`.
- **Tunnel-ingress** v30 geladen via `PUT /accounts/<acc>/cfd_tunnel/<tun>/configurations`.
  Ingress-regel `retroductor.nl` → `https://localhost:443` met
  `noTLSVerify=true` + `originServerName=retroductor.nl`, ingevoegd vóór de
  catchall. Geen lokale `cloudflared` YAML-edits (les Ordo 1 addendum).

### Stap 4 — Coolify Application — GESLAAGD

- **App-UUID**: `cd1xaylx877wr431p1xzcjaf` (nieuw).
- `POST /applications/public` met `build_pack=nixpacks`, `base_directory=/`,
  `ports_exposes=3001`, branch `staging`, repo public-GitHub. Nixpacks
  detecteerde Next.js 15 prima — geen Dockerfile-fallback nodig.

### Stap 5 — Env-vars — GESLAAGD

Alle 9 env-vars gezet via `POST /applications/{uuid}/envs` (zonder
`is_build_time`, conform Ordo 1 afwijking 2): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`MINING_ENGINE_URL`, `MINING_ENGINE_SECRET`, `ANTHROPIC_API_KEY`,
`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `NEXT_PUBLIC_COMING_SOON=false`.

`MINING_ENGINE_URL` = `https://retroductus-engine.cyberductus.nl` (public
FQDN met CF Access service-token als fallback). Docker-intern pad was niet
vaststelbaar — SSH naar Beelink faalt met "Permission denied (publickey,
password)" op `pieter@192.168.68.69`. Kan later omgezet worden naar
container-DNS-naam zonder code-wijziging.

### Stap 6 — FQDN + CF Access — GEDEELTELIJK

- **FQDN via API gezet** — `PATCH /applications/{uuid}` met veld `domains`
  (niet `fqdn`, die geeft 422). `fqdn` staat op `https://retroductor.nl` en
  Coolify heeft `custom_labels` automatisch geregenereerd met correcte
  Traefik Host-rule + poort 3001. **Geen directe DB-UPDATE nodig** — de
  Ordo 1 painpoint (labels ongewijzigd) is met deze aanpak opgelost.
- **CF Access app NIET aangemaakt** — `POST /access/apps` → 12130
  `domain does not belong to zone`. Zone is pending tot NS-flip. Aanmaak
  blokkeert hier tot Stap 2 rondkomt.

### Stap 7 — Deploy + verifiëren — INTERN GESLAAGD

- Deploy-UUID `f9d3yy190isj2cbb8pztf96k` — status `finished`. Container
  `cd1xaylx877wr431p1xzcjaf-133411840447` up.
- **Intern via Beelink-IP werkt:**
  ```
  $ curl -sI -H "Host: retroductor.nl" http://192.168.68.69:80/
  HTTP/1.1 307 Temporary Redirect → https://retroductor.nl/

  $ curl -skI --resolve retroductor.nl:443:192.168.68.69 https://retroductor.nl/
  HTTP/1.1 200 OK
  Content-Type: text/html; charset=utf-8
  X-Nextjs-Prerender: 1
  ```
  Let's-Encrypt-cert automatisch uitgegeven. Landing-page wordt geserveerd.
- **Publiek via `https://retroductor.nl`** — nog niet testbaar; NS staat bij
  Vercel, CF Access nog niet actief.
- Frontend → engine roundtrip niet getest (front zelf bereikt, maar engine-
  call vereist Pieter-login in browser; vibe-test hoort bij Ordo 7).

## Openstaande acties

### Blokker 1 — NS-flip retroductor.nl (actie Legatus / Pieter)

**Handmatig via mijn.host-klantportaal**: log in op
`https://mijn.host/klantenpaneel/`, open `retroductor.nl` → Nameserver-
profiel → selecteer `cloudflare-logi` (of kies "aangepast" met hostnames
`bradley.ns.cloudflare.com` + `ollie.ns.cloudflare.com`). Sla op.

Daarna kan Janus (of agent-follow-up) onmiddellijk doen:

1. Wachten tot CF zone `status=active` (max 10 min na NS-flip).
2. `POST /access/apps` opnieuw uitvoeren voor `retroductor.nl` (zelfde
   allowlist-policy als engine-app).
3. `curl -sI https://retroductor.nl` verifiëren → 302 naar
   `dbrbndr.cloudflareaccess.com`.

### Credentials-instructie — Legatus-actie op `credentials.md`

Toevoegen **onder** het bestaande `retroductus-engine` blok (regel 244,
Beelink-sectie):

```
### retroductus-ui (Beelink, 2026-04-24)

- **Coolify app UUID**: `cd1xaylx877wr431p1xzcjaf`
- **Coolify project**: `v9t08q4y5oqiapavydwglou0` (My first project) · server
  `txh5pu5s190naj4k1uacnild` (localhost) · environment `production`
- **FQDN**: https://retroductor.nl
- **GitHub repo**: https://github.com/ptrdbrbndr/retroductus (branch `staging`, public)
- **Build**: Nixpacks, base_directory `/`, port 3001
- **Env-vars**: alle 9 keys gezet (Supabase x3, Mining x2, Anthropic,
  CF-Access x2, ComingSoon=false) — waarden hergebruikt uit `.env.local`
  + bestaande engine-entry; geen nieuwe secrets gegenereerd.
- **CF zone retroductor.nl**: `abd0b5fdda35c9d0ceeeffd9c7c60f00` (status
  `pending`, wacht op NS-flip bij mijn.host)
- **CF DNS record-id**: `791ddce06235cba7f64118c040ce279b` (CNAME apex →
  `4931da40-...cfargotunnel.com`, proxied)
- **CF Access app**: NIET aangemaakt — wacht op zone-activering
- **Tunnel-ingress**: v30 met hostname `retroductor.nl` → `https://localhost:443`
- **Status per 2026-04-24**: intern 200 via Beelink-IP + Host-header; publiek
  302 → Access nog niet aan (NS-flip openstaand)
```

Geen secrets in deze agent-log. Geen nieuwe `credentials-orig-*.txt` nodig:
alle secrets zijn **hergebruikt** uit bestaande entries (engine,
`.env.local`, root `.env`).

## Afwijkingen t.o.v. plan

1. **`domains` i.p.v. `fqdn` in PATCH** — het plan/Ordo 1 noemde directe
   `applications.fqdn` UPDATE in coolify-db als enige route. In deze ordo
   bleek `PATCH /applications/{uuid}` met `{"domains":"https://retroductor.nl"}`
   gewoon te werken **én** `custom_labels` automatisch te regenereren.
   Aanbeveling: Modus-D runbook §4 bijwerken — DB-hack is optie B,
   API-PATCH met `domains` is optie A.
2. **Docker-intern MINING_ENGINE_URL niet gezet** — SSH naar Beelink faalde,
   geen container-naam vastgesteld. Fallback CF Access service-token werkt
   (al aanwezig in env). Optimalisatie voor later.
3. **CF Access service-token op engine blijft nuttig** (niet "niet meer
   nodig" zoals plan suggereerde) zolang frontend via publiek FQDN naar
   engine praat.

## Guardrails gerespecteerd

- Vercel-project niet aangeraakt (alleen env-vars gelezen via
  `npx vercel env pull` — read-only).
- Geen secrets in commits/agent-log — alleen UUIDs + non-secret record-IDs.
- ADR's vóór onomkeerbare acties (zone-creation, Coolify-app-creation).
- Scope: writes alleen in `c:\Projecten\retroductus\`, Coolify API,
  Cloudflare API, mijn.host API.
- Conventional commits voor repo-wijziging (docs-only commit op staging).
- `credentials.md` zelf niet aangepast — Legatus-instructie in dit rapport.
- `.tmp/vercel-env-backup.env` + `tunnel-config-*.json` gitignored via `.tmp/`.
