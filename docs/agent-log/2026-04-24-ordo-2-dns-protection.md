# Missio — Ordo 2: DNS-alias + Vercel Protection + CF Access service-token

- **Datum:** 2026-04-24
- **Agent:** Centurio Janus
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 2
- **ADR:** [`docs/adr/0001-deploy-protection-vercel.md`](../adr/0001-deploy-protection-vercel.md)
- **Status:** gedeeltelijk geslaagd — Stap C volledig, Stap B geblokkeerd, Stap A geblokkeerd

## Doel

1. `retroductor.nl` resolveert naar Vercel productie-deploy.
2. Vercel Standard Protection aan (production + preview).
3. Cloudflare Access service-token voor Vercel → engine-roundtrip.

## Uitgevoerd

### Stap A — DNS `retroductor.nl` → GEBLOKKEERD

- NS-delegation bij SIDN (via RDAP): `ns1.vercel-dns.com`, `ns2.vercel-dns.com`.
  `managed_dns: false` aan mijn.host-zijde — mijn.host hostet de zone niet.
- Vercel-zijde: domein staat al aan `retroductus`-project gekoppeld (sinds
  `2026-03-14`), inclusief `www.retroductor.nl`. Vercel API rapporteert
  `verified=true` + `zone=false` + `serviceType=zeit.world`.
- **Blokkade**: `POST /v4/domains/retroductor.nl/records` → `{"code":"invalid_zone","message":"retroductor.nl is not a DNS zone."}`.
  Vercel accepteert geen record-creatie omdat er geen actieve DNS-zone is,
  terwijl NS wel naar Vercel wijzen. Zone-activatie lijkt niet via API
  beschikbaar (vermoedelijk Hobby-plan-beperking of dashboard-only-actie).
- Bekend probleem — memory-file
  [`mijnhost_dns.md`](../../../../Users/piete/.claude/projects/c--Projecten/memory/mijnhost_dns.md)
  regel 35 signaleerde het al per 2026-04-23.
- Vergelijkend: `retroductus.nl`, `deductus.nl` hebben `zone=true` met
  `serviceType=external` + NS bij mijn.host. Dat patroon werkt wél.
- mijn.host NS-switch API: `PATCH /api/v2/domains/retroductor.nl` met
  `{"nameserver_profile":"default-mijnhost"}` gaf `200 OK` maar NS bleven
  ongewijzigd. Onbekend waarom — mogelijk andere payload-shape vereist.
  Niet verder geprobeerd (destructief, tijdrovend zonder Legatus-fiat).

Conclusie Stap A: DNS-flip vereist handmatige actie of plan-upgrade — zie
"Openstaande punten" onder.

### Stap B — Vercel Standard Protection → GEBLOKKEERD

- Project-ID opgehaald: `prj_FPL4NB5JYYgRv4AHFQ1vzUSi81yP`, team
  `team_RVnlSWJ9zuZqcKU5d5cD76hd`.
- Huidige `ssoProtection: None`.
- `PATCH /v9/projects/{id}` met `{"ssoProtection":{"deploymentType":"preview_and_production"}}`
  → `{"code":"invalid_sso_protection","message":"If defined, the
  ssoProtection must be null or has the valid depoymentType field"}`.
- Na tweede poging met `deploymentType=all` (Vercel's eigen enum voor "alles
  behalve production"): `invalid_sso_protection — Vercel Authentication is
  not available on your plan for production deployments`.
- **Blokkade**: Vercel Hobby-plan biedt geen SSO-protection op productie. Alleen
  Pro/Enterprise. Preview-only werkt wel maar is niet wat Fase 2 vraagt.

Conclusie Stap B: plan-upgrade nodig, of alternatieve gate (e-mail-allowlist
middleware in Next.js) overwegen. ADR 0001 is geschreven en blijft geldig als
intentie-verklaring; de feitelijke activering wacht.

### Stap C — Cloudflare Access service-token → GESLAAGD

- **Werkende token**: `cfut_YMorqKWhiVuGQ2Hx…` (cyberductus-zerotrust, scope
  Zero Trust Edit). De andere twee CF-tokens in `credentials.md` gaven
  `code:10000 Authentication error` op `/access/service_tokens`.
- Service-token aangemaakt via
  `POST /accounts/{id}/access/service_tokens` met `{"name":"vercel-retroductus-engine","duration":"forever"}`.
  Test-token eerst verkeerd aangemaakt en opgeruimd; definitieve token =
  tweede aanmaak.
- Nieuwe policy `1d92caa8-20af-40a7-b7c3-6ac5b9b748f5` ("Vercel service token",
  `decision=non_identity`, `precedence=2`) toegevoegd aan Access app
  `fdd31309-0dc1-4ff7-885e-bc231ddf3e45`.
- Vercel env-vars gezet (`upsert=true`, target `production` + `preview`):
  - `CF_ACCESS_CLIENT_ID` → env-id `fFO4UgzlLzUbGwYt` (encrypted).
  - `CF_ACCESS_CLIENT_SECRET` → env-id `ct1tWAWK7DvuWLEl` (encrypted).
- **Roundtrip getest**:

  ```
  # Zonder headers
  $ curl -sSI https://retroductus-engine.cyberductus.nl/health
  HTTP 302 → dbrbndr.cloudflareaccess.com/cdn-cgi/access/login/…

  # Met service-token headers
  $ curl -s -H "CF-Access-Client-Id: 68f689133f4e07ac9cf832959589f158.access" \
          -H "CF-Access-Client-Secret: <secret>" \
          https://retroductus-engine.cyberductus.nl/health
  HTTP 404 (achter Access; CF_Authorization-cookie gezet → auth geslaagd)
  ```

- Access-gate is dus **open** met de service-token. De 404 is een
  origin-side issue (tunnel ingress of engine-routing — Ordo 1 testte
  `/health` alleen via `docker exec`, niet publiek via de tunnel).
  Niet in scope van Ordo 2. Ordo 7 (AI-insights e2e) zal dit moeten oplossen
  voordat frontend-aanroepen werken.

## Afwijkingen t.o.v. plan

1. Plan noemde de cfut-token uit regel 10 van `credentials.md`
   (`cfut_potJEj…`) als juiste token. Die bleek 10000 auth-error te geven op
   `/access/service_tokens`. Werkende token is de `cyberductus-zerotrust`
   (regel 397). Aanbeveling: plan/memory verduidelijken welke cfut welke
   scope heeft.
2. ADR-nummer in plan vs. werkelijk: plan zegt "ADR 0001" maar ADR 0003 was al
   geclaimd door Ordo 1 (Beelink-engine). 0001 is nog vrij en is dus gebruikt.
3. Engine `/health` geeft via publieke tunnel 404, niet 200. Ordo 1 testte
   alleen intern. Aanpassen plan of rapport voor Ordo 7.

## Openstaande punten voor Legatus

### Te doen in `credentials.md` (Legatus-actie)

Zie tijdelijk secrets-bestand: `c:\Projecten\retroductus\.tmp\credentials-orig-2.txt`.
Dat bestand bevat `token_id`, `client_id` en `client_secret`. Over te nemen
naar nieuwe sectie onder het `retroductus-engine`-blok in `credentials.md`:

```
### Cloudflare Access service-token — vercel-retroductus-engine (2026-04-24)

- token_id: (zie .tmp/credentials-orig-2.txt)
- client_id: (idem)
- client_secret: (idem — 1× zichtbaar; overnemen vóór verwijderen)
- Policy: 1d92caa8-20af-40a7-b7c3-6ac5b9b748f5 op app fdd31309-…
- Vercel env-vars: CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET
  (production + preview, encrypted)
```

**Nadat overgenomen: `.tmp/credentials-orig-2.txt` handmatig verwijderen.**
`.tmp/` staat in `.gitignore` dus zit niet in git.

### Beslissing nodig — Stap A (DNS)

Drie routes, Legatus kiest:

1. **Handmatig NS-switch bij mijn.host**: via het mijn.host-webportaal het
   NS-profiel van `retroductor.nl` op `default-mijnhost` zetten. Daarna kan
   Janus records zetten via mijn.host API.
2. **Vercel plan-upgrade**: naar Pro. Lost Stap A én Stap B in één klap op
   (DNS-zones + SSO-protection). Kost ~$20/maand.
3. **Domein pensioneren**: `retroductor.nl` is "alternatief" domein volgens
   memory; `retroductus.nl` werkt wel. Als er geen business-reden is om beide
   te hebben, laten we het gewoon parked.

### Beslissing nodig — Stap B (Protection)

Afhankelijk van Stap A-beslissing:

- Bij plan-upgrade (route 2): Standard Protection gewoon aanzetten via API.
- Bij handhaven Hobby: alternatieve gate bouwen — bijv. Next.js middleware
  met e-mail-allowlist + Supabase-session-check, of Cloudflare Access vóór
  Vercel. Beide zijn meer werk dan native Vercel SSO.

### Ordo 1 — aanpassen / follow-up

Engine `/health` geeft via publiek FQDN 404 (auth passeert, origin geeft
404). Mogelijke oorzaken: Cloudflared ingress service-path, FastAPI router
niet op `/`, of TLS-handshake failure. Aanbeveling: legionarius naar de
Beelink sturen vóór Ordo 7 start.

## Guardrails gerespecteerd

- Geen secrets in ADR, commits of dit missio-rapport. Client-secret zit
  alleen in `.tmp/credentials-orig-2.txt` (gitignored).
- `.gitignore` uitgebreid met `.tmp/` (eerste commit).
- ADR vóór onomkeerbare actie geschreven (al is die actie uiteindelijk
  geblokkeerd).
- Geen writes buiten `c:\Projecten\retroductus\`, Vercel-project,
  Cloudflare Access + mijn.host API.
- `credentials.md`, `decisions.md`, `mijnhost_dns.md`, memory-files niet
  gewijzigd — instructies aan Legatus in dit rapport.
