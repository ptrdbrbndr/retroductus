# ADR 0001 — Deploy-protection voor `retroductor.nl`

- **Status:** geaccepteerd (herzien 2026-04-24)
- **Datum:** 2026-04-24
- **Cohort:** Retroductus — Fase 2 (intern testen)
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 2 (v2)
- **Vervangt:** eerdere draft `0001-deploy-protection-vercel.md` (Vercel SSO-optie). Die route werd geblokkeerd door drie factoren — zie "Context".

## Context

Tijdens Fase 2 moet `retroductor.nl` bereikbaar zijn voor Pieter + interne
testers, maar **niet** voor publiek internet. Totdat Stripe aangesloten is en
de DPA-flow in productie bewezen, mag niemand buiten de whitelist de app
bereiken.

Ordo 2 v1 probeerde Vercel Standard Protection — dat liep vast op drie
onafhankelijke blokkers:

1. **Vercel Hobby-plan ondersteunt geen SSO-protection op productie**
   (`Vercel Authentication is not available on your plan for production
   deployments`).
2. **`retroductor.nl` heeft `zone=false` op Vercel** — NS staan wel op
   `ns*.vercel-dns.com`, maar zone-activatie is niet beschikbaar via API;
   `POST /domains/.../records` → `invalid_zone`.
3. **Consistentie-argument:** de engine (`retroductus-engine.cyberductus.nl`)
   draait al op Beelink achter Cloudflare Access met dezelfde e-mail
   allowlist. Twee verschillende protection-mechanismen voor één product is
   onnodige complexiteit.

## Beslissing

Deploy-protection voor `retroductor.nl` gebeurt via **Cloudflare Access**
(edge-gate) aan de Beelink-zijde. De frontend zelf draait op Beelink/Coolify
(zie ADR 0004). Authenticatie via e-mail-allowlist, sessieduur 8u, identiek
aan `retroductus-engine.cyberductus.nl`.

- Allowlist: `pieter@debrabander.com`, `pieter.de.brabander@ductus.nl` (+
  interne testers via dezelfde policy).
- Geen service-token op deze app — alleen browser-SSO. Service-tokens blijven
  voorbehouden aan machine-to-machine (bijv. Vercel → engine in oud pad).

## Alternatieven overwogen

1. **Vercel Standard Protection** — verworpen, zie blokker 1–2 hierboven.
2. **E-mail-allowlist middleware in Next.js** — meer code, grotere
   foutmarge, route-specifieke bypasses lastig, en de app is al publiek-
   reachable vóór de middleware afvuurt (Access-gate zit op de edge, vóór
   de container).
3. **Wachtwoord-pagina (Vercel)** — geen audit-trail per gebruiker,
   wachtwoord lekt snel; bovendien vereist het nog steeds een werkende
   Vercel-deploy, wat vervalt zodra frontend naar Beelink migreert.

## Gevolgen

**Positief**

- Eén auth-systeem (CF Access, e-mail-allowlist, 8u sessie) voor álle interne
  Ductus-endpoints — `retroductor.nl` + `*.cyberductus.nl`.
- Zero-code: geen middleware, geen Next.js-side-effect. Protection zit op de
  Cloudflare-edge vóór het verkeer Traefik bereikt.
- Audit-trail per gebruiker (CF Access login-log).
- Publieke launch (Fase 3): Access uitzetten is één API-call, of een
  tweede Coolify-app zonder Access op `master`-branch ernaast zetten.

**Negatief**

- Externe webhooks (Stripe, Flowable) kunnen alleen binnen met een
  service-token of bypass-regel op de Access-policy — acceptabel, komt pas
  in Fase 3.
- Tooling die publiek HTTP verwacht (externe monitoring, Lighthouse CI)
  werkt niet vanzelf — moet via service-token.

## Exit-criteria

Herzien wanneer:

1. **Fase 3 publieke launch**: CF Access policy opengegooid óf aparte
   publieke Coolify-app zonder Access op `master`-branch, óf publieke host
   op mijn.host Ultimate naast de interne staging-app.
2. CF Access-pricing verandert onacceptabel. Tot nu toe: Free tier dekt ons
   (50 users, onbeperkte apps).

## Verificatie

```
curl -sI https://retroductor.nl
# Verwacht: HTTP/1.1 302 Found
# Location: https://dbrbndr.cloudflareaccess.com/cdn-cgi/access/login/retroductor.nl?…
```

Browser → SSO-login met Pieter's e-mail → volledige landing en dashboard
zichtbaar. Geldigheid van sessie 8u.
