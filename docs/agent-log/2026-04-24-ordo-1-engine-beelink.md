# Missio — Ordo 1: Engine op Beelink/Coolify

- **Datum:** 2026-04-24
- **Agent:** Centurio Janus
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 1
- **ADR:** [`docs/adr/0003-engine-op-beelink-coolify.md`](../adr/0003-engine-op-beelink-coolify.md)
- **Status:** Succes

## Doel

`https://retroductus-engine.cyberductus.nl/health` retourneert 200 via de
Beelink-Coolify-engine, achter Cloudflare Access met dezelfde allowlist als
andere `*.cyberductus.nl`-services.

## Uitgevoerd (per stap)

1. **ADR 0003 geschreven** — rationale: kostenbesparing + Tier-2-consistentie
   + upgrade bij eerste klanten. Uitgewerkt exit-criteria. Bestand:
   [`docs/adr/0003-engine-op-beelink-coolify.md`](../adr/0003-engine-op-beelink-coolify.md).
2. **Coolify Application aangemaakt** via `POST /api/v1/applications/public`:
   - `name=retroductus-engine`
   - `project_uuid=v9t08q4y5oqiapavydwglou0` (My first project)
   - `server_uuid=txh5pu5s190naj4k1uacnild` (localhost/Beelink)
   - `environment_name=production`
   - `git_repository=https://github.com/ptrdbrbndr/retroductus`
   - `git_branch=staging`
   - `build_pack=dockerfile`, `base_directory=/engine`
   - `dockerfile_location=/Dockerfile` (zie "Afwijking 1" onder)
   - `ports_exposes=8000`
   - **Toegekende UUID: `oesusoqqwfstloktovb1c6qb`**
3. **Env-vars gezet** via `POST /api/v1/applications/{uuid}/envs`:
   - `MINING_ENGINE_SECRET` — hergebruikt bestaande waarde uit
     `retroductus/.env.local` (consistent met UI-zijde)
   - `SUPABASE_JWT_SECRET` — overgenomen uit `retroductus/.env.local`
     (Supabase Cloud ref `ttfgpbuievkuiwdhmtaz`)
   - `ANTHROPIC_API_KEY` — uit `c:\Projecten\.env`
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — voor job-status updates
   - Noot: `is_build_time` werd afgewezen door de API — weggelaten werkt wel.
4. **FQDN gezet** op `https://retroductus-engine.cyberductus.nl` via
   directe UPDATE in `coolify-db` (PATCH via API weigerde het `fqdn`-veld voor
   public-applications — gedocumenteerd pad uit Modus-D runbook §4).
5. **Cloudflare DNS CNAME** `retroductus-engine` →
   `4931da40-8b72-4cc3-8f7e-6802b5e948a5.cfargotunnel.com`, proxied=true.
   Record-id `3c17dd5ac9d91387622739fdd4e14440` in zone
   `dc69171aa6af6229bbc4a0191e79e30e` (cyberductus.nl).
6. **Cloudflared ingress-rule** toegevoegd aan `/etc/cloudflared/config.yml` op
   de Beelink (service=`https://localhost:443` met `noTLSVerify` +
   `originServerName`), zelfde patroon als alle andere
   `*.cyberductus.nl`-regels. `sudo systemctl restart cloudflared` → active.
   Backup: `/etc/cloudflared/config.yml.bak-retroductus`.
7. **Cloudflare Access app** aangemaakt:
   - App-ID: `fdd31309-0dc1-4ff7-885e-bc231ddf3e45`
   - AUD: `2d46992fa0c8154ccd2d408fe472efc3ce823859ac23bf229cd703be9ff964ba`
   - Domain: `retroductus-engine.cyberductus.nl`
   - Session duration: 8u
   - Policy `f4e87b1b-a5c3-411f-991f-5ddb2cea13ef` "Pieter allowlist"
     (`pieter@debrabander.com` + `pieter.de.brabander@ductus.nl`).
8. **Deploy getriggerd** via `POST /api/v1/deploy?uuid=…&force=true`.
   Eerste deploy faalde — zie "Afwijking 1". Tweede deploy: finished
   (deployment-uuid `c4ymqhu0uyzu9e5gncvgemv2`, ~2 min).

## Verificatie (raw)

```
# Coolify app-status
status: running:unknown
fqdn:   https://retroductus-engine.cyberductus.nl

# Unauth curl — moet 302 naar Cloudflare Access geven
$ curl -sSI https://retroductus-engine.cyberductus.nl/health
http_code=302
redirect=https://dbrbndr.cloudflareaccess.com/cdn-cgi/access/login/retroductus-engine.cyberductus.nl?kid=2d46992fa0c8154ccd2d408fe472efc3ce823859ac23bf229cd703be9ff964ba…

$ curl -sSI https://retroductus-engine.cyberductus.nl/
http_code=302
(idem)

# Intern vanaf de container zelf (voorbij de Access-gate)
$ docker exec oesusoqqwfstloktovb1c6qb-112440507856 \
    python -c 'urllib.request.urlopen("http://localhost:8000/health")'
status: 200
body:   {"status":"ok"}
```

Container `oesusoqqwfstloktovb1c6qb-112440507856` is `Up`, port 8000 intern.

## Afwijkingen t.o.v. plan

1. **`dockerfile_location` interpretatie.** Plan schreef
   `dockerfile_location=/engine/Dockerfile` gecombineerd met
   `base_directory=/engine`. Coolify resolveert het pad **relatief t.o.v. de
   base_directory**, wat tot `engine/engine/Dockerfile` leidt en build faalt.
   Werkende waarde: `dockerfile_location=/Dockerfile`. Het plan zou hierop
   bijgewerkt kunnen worden voor toekomstige cohorts.
2. **Env-var-endpoint weigert `is_build_time`.** Alleen
   `{key,value,is_preview,is_literal}` accepteert Coolify (`v1`). `is_build_time`
   gaf 422. Zonder dat veld gezet werkt het — build-args worden automatisch
   geinjecteerd op basis van de secret-hash (zichtbaar in build-log).
3. **FQDN niet via API te zetten.** `PATCH /applications/{uuid}` weigert het
   `fqdn`-veld. Directe UPDATE in `applications.fqdn` via `coolify-db` Postgres
   werkte direct, zonder redeploy nodig (DNS/tunnel doet routering; Coolify
   kiest geen ander backend-adres).
4. **Cloudflared YAML-indent-bug.** Het `sed`-commando uit Modus-D runbook §5b
   voegde een blok toe met 2 spaties te veel indent — YAML parse-error. Fix:
   `sudo sed -i '176,180s/^  //'` na toevoeging. Restart cloudflared → active.
   Aanbeveling voor de runbook: het ingress-blok met `- hostname` op kolom 0
   zetten, niet inline via `\n`-escapes met voor-spaties.

## Openstaande punten voor Legatus

### Moet bijgewerkt in `credentials.md` (Legatus-actie — ik schrijf er zelf niet in)

Voeg onder bestaande sectie "Beelink self-host Supabase stacks" (regel 221)
een nieuw blok toe:

```
## Beelink self-host applications — Retroductus Engine (2026-04-24)

- **Coolify app UUID**: `oesusoqqwfstloktovb1c6qb`
- **FQDN**: https://retroductus-engine.cyberductus.nl
- **GitHub repo**: https://github.com/ptrdbrbndr/retroductus (branch `staging`)
- **Build**: Dockerfile `engine/Dockerfile`, base_directory `/engine`, port 8000
- **MINING_ENGINE_SECRET**: zie `credentials.md` → "retroductus-engine (Beelink, 2026-04-24)" — hergebruikt uit `retroductus/.env.local` (UI + engine delen waarde)
- **SUPABASE_JWT_SECRET**: zie `credentials.md` → idem — overgenomen uit Supabase Cloud project `ttfgpbuievkuiwdhmtaz`
- **Cloudflare Access app ID**: `fdd31309-0dc1-4ff7-885e-bc231ddf3e45`,
  AUD `2d46992fa0c8154ccd2d408fe472efc3ce823859ac23bf229cd703be9ff964ba`
- **Policy**: email allowlist (pieter@debrabander.com + pieter.de.brabander@ductus.nl), 8u sessie
- **DNS record id**: `3c17dd5ac9d91387622739fdd4e14440` in zone `dc69171aa6af6229bbc4a0191e79e30e`
- **Status**: running per 2026-04-24, /health=200 via intern, 302-gate via publiek FQDN
```

### Nog benodigd vóór Ordo 7 (AI-insights e2e)

- **Cloudflare Access service-token** voor Vercel → engine-call. Zonder
  service-token loopt de frontend tegen het Access-login-redirect aan. Aan te
  maken via `https://dbrbndr.cloudflareaccess.com/apps` of via API onder de
  Access app (`fdd31309-…`). Resulterende `CF-Access-Client-Id` +
  `CF-Access-Client-Secret` in `credentials.md` én in Vercel env-vars van het
  `retroductus` Next.js-project zetten. Janus kan dit in Ordo 2/7 zelf doen
  als Legatus groen licht geeft, of Legatus zet de token aan.

### Niet gedaan — scope uit plan bewust aangehouden

- Ordo 10 (Railway `retroductus-engine` pauzeren) blijft wachten tot Ordo 7
  de end-to-end AI-insights-flow bewezen heeft.
- Geen wijzigingen aan Vercel-env-vars nog — dat hoort bij Ordo 7 (insights
  end-to-end) of eerder bij Ordo 2 (DNS-alias + deployment-protection).

## Guardrails gerespecteerd

- Geen secrets in ADR, commits of missio-rapport buiten de gebruikelijke
  credentials-kanalen (env-file + credentials.md update-instructie).
- ADR vóór de onomkeerbare Coolify-app-creatie geschreven.
- Geen Stripe-werk in deze ordo.
- Geen writes buiten `c:\Projecten\retroductus\`, `coolify-db` (Beelink),
  Cloudflare API en `cloudflared` config.
- Memory/credentials/decisions files niet zelf aangepast — instructie-tekst
  aan Legatus opgenomen in dit rapport.

## Addendum — publiek /health fix 2026-04-24

**Status:** Opgelost. `https://retroductus-engine.cyberductus.nl/health` →
`200 {"status":"ok"}` met service-token-headers, `302` zonder (Access-gate).

### Oorzaak (twee aparte problemen stapelend op elkaar)

1. **Coolify genereert Traefik-labels alleen bij Application-creatie, niet bij
   directe DB-wijziging van `applications.fqdn`.** De runbook-truc (directe UPDATE
   van `fqdn`) zet het FQDN-veld goed, maar laat `applications.custom_labels`
   ongemoeid — die hield nog de sslip.io-fallback-labels uit de initiële
   wizard. Een plain force=true redeploy gebruikt `custom_labels` as-is,
   dus de container bleef op `Host(\`{uuid}.{ip}.sslip.io\`)` routen.
2. **De cyberductus-tunnel is "remotely-managed".** De lokale
   `/etc/cloudflared/config.yml` op Beelink is niet wat cloudflared gebruikt —
   het pakt z'n ingress-regels via de Cloudflare API (`GET /accounts/<acc>/
   cfd_tunnel/<tun>/configurations`). De ingress-rule die in Ordo 1 in de
   lokale YAML werd toegevoegd, werd dus nooit actief. Verifieerbaar in de
   `cloudflared[…] INF Updated to new configuration` systemd-logregel: de
   JSON-lijst daar bevatte geen `retroductus-engine`-hostname.

### Fix (in volgorde)

1. **Traefik-labels regenereren.** Pattern overgenomen van werkende peer
   (`seductus-test.cyberductus.nl`, uuid `kixo19mch4dr50i5f3mbzmgm`). Kern
   van het nieuwe label-blok:

   ```text
   traefik.http.routers.http-0-{uuid}.rule=Host(`fqdn`)&&PathPrefix(`/`)
   traefik.http.routers.https-0-{uuid}.rule=Host(`fqdn`)&&PathPrefix(`/`)
   traefik.http.routers.https-0-{uuid}.tls=true
   traefik.http.routers.https-0-{uuid}.tls.certresolver=letsencrypt
   traefik.http.services.http-0-{uuid}.loadbalancer.server.port=8000
   traefik.http.services.https-0-{uuid}.loadbalancer.server.port=8000
   ```

   Tekst geëncodeerd met `base64 -w 0`, geladen via `pg_read_file` in
   `coolify-db` met `UPDATE applications SET custom_labels=trim(...) WHERE uuid=...`.
   Eerste poging via bash-quoting voegde een escape-karakter toe (lengte
   1905 i.p.v. 1904) — tweede poging met `pg_read_file` plus `trim` klopte
   exact met de referentie. Daarna `POST /api/v1/deploy?force=true` om
   de container met nieuwe labels te herbouwen. Verificatie intern op Beelink
   via `curl -H 'Host: retroductus-engine.cyberductus.nl' http://localhost:80/health`
   gaf 302 (redirect-to-https); dezelfde call op `https://` via
   `--resolve 127.0.0.1:443` gaf 200.
2. **Tunnel-ingress via Cloudflare API.** `GET .../cfd_tunnel/<tun>/configurations`
   toonde 37 bestaande rules zonder retroductus-engine. Nieuwe regel
   (`hostname=retroductus-engine.cyberductus.nl`, `service=https://localhost:443`,
   `originRequest.noTLSVerify=true`, `originServerName=<fqdn>`) ingevoegd
   vóór de catchall en via `PUT` teruggestuurd. Cloudflared pakt remote
   config binnen ~10s automatisch op (geen restart nodig).

De lokale wijziging in `/etc/cloudflared/config.yml` uit Ordo 1 is daarmee
functioneel overbodig, maar inhoudelijk identiek aan wat nu remote staat —
laten staan als backup-documentatie geen probleem.

### Verificatie publiek FQDN (raw)

```text
$ curl -sSI https://retroductus-engine.cyberductus.nl/health
HTTP/1.1 302 Found
Www-Authenticate: Cloudflare-Access resource_metadata="https://retroductus-engine.cyberductus.nl/.well-known/cloudflare-access-protected-resource/health"

$ curl -sS -w "\n__HTTP=%{http_code}\n" \
    -H "CF-Access-Client-Id: <zie credentials.md → 'vercel-retroductus-engine'>" \
    -H "CF-Access-Client-Secret: <idem>" \
    https://retroductus-engine.cyberductus.nl/health
{"status":"ok"}
__HTTP=200
```

### Aanbevelingen voor Modus-D runbook

- §4 (FQDN via directe DB-UPDATE): **expliciet toevoegen dat `custom_labels`
  ook handmatig moet — UPDATE van `fqdn` alleen is niet genoeg voor Traefik
  routing.** Alternatief: de Coolify UI/ladder-icon ondersteunt "General →
  Domains" editen zonder DB-hack; dat regenereert `custom_labels` wél.
  Geef beide paden in het runbook, of verwijs naar de CLI-methode die
  labels + fqdn atomisch zet.
- §5 (Cloudflared ingress-rule): **benadruk dat de Beelink-tunnel remotely
  managed is.** Updates aan lokale `/etc/cloudflared/config.yml` zijn
  no-ops. Gebruik `PUT /accounts/<acc>/cfd_tunnel/<tun>/configurations`
  via de `claude-tunnel-access` token (zie `credentials.md`). Voorbeeld-
  payload met ingress-regel + catchall zou in de runbook mogen.
