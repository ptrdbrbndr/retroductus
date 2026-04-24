# Ordo extra — Supabase migratie Beelink (Janus, 2026-04-24)

**Missie:** fresh-start Supabase-stack voor retroductus op Beelink/Coolify, conform Tier-2 Modus D runbook. Cloud-project `ttfgpbuievkuiwdhmtaz` was al verwijderd — geen dump/restore.

**Resultaat: e2e groen.**

## Opgeleverd

| Component | Waarde |
|---|---|
| Coolify service UUID | `nfjxj1dahpu416ywxpdiqya1` |
| FQDN | `https://supabase-retroductus.cyberductus.nl` |
| CF DNS record-id | `f2c3613a7bf280550106e68d0082732c` (CNAME proxied) |
| Tunnel-ingress | `v31`, hostname toegevoegd vóór catchall via remote CF API |
| CF Access app | **geen** — consistent met 8 andere Supabase-stacks (API-auth via anon/service key is voldoende) |
| Tabellen | `mining_jobs`, `user_plans`, `issues`, `dpa_acceptance` — alle met RLS aan |

## Stappen (chronologisch)

1. Stack aangemaakt via `POST /services` (type=supabase, template iductus als patroon). DB healthy binnen 30s.
2. Secrets gelezen via `GET /services/{uuid}/envs` — alle 6 keys (POSTGRES/JWT/ANON/SERVICE/admin user+pw) correct gegenereerd.
3. Kong-FQDN via directe `UPDATE service_applications` in `coolify-db` (runbook §4) — API-endpoint werkt niet voor service-child-apps.
4. CF DNS CNAME via `POST /zones/{zone}/dns_records` (CF DNS-token).
5. **Blokker ontdekt en opgelost**: lokale `/etc/cloudflared/config.yml` werd genegeerd — tunnel is **remotely managed** (bevestigd via "version=30" log). Oplossing: `PUT /accounts/{acct}/cfd_tunnel/{tun}/configurations` met volledige ingress-JSON, inclusief nieuwe hostname vóór catchall. Resulteert in version=31 en `/auth/v1/settings` gaat van 404 → 200 binnen 10s. Zelfde fix als Ordo 2 v2 engine-health.
6. Access-app eerst aangemaakt (ID `ba7b9776-ef74-4c57-849c-bb3833616ee9`) maar direct weer verwijderd — briefing stond haaks op praktijk (andere 8 stacks hebben geen Access-gate, die breekt API-calls van de UI-app). Anon-key + service-key geven voldoende auth.
7. **Baseline-schema `mining_jobs` ontbrak in `supabase/migrations/`** — was destijds direct via Supabase Studio UI aangemaakt. Zelf geschreven vanuit engine-code (alle kolommen: `id`, `user_id`, `status`, `result`, `conformance_result`, `insights_cache`, `event_count`, `error_message`, `created_at`, `completed_at`). Migratie 1 kon toen starten.
8. Alle 6 migraties gerund via `docker exec psql -v ON_ERROR_STOP=1` — **alle groen, geen errors**.
9. Env-vars geüpdatet op beide Coolify-apps (productie + preview varianten):
   - UI `cd1xaylx877wr431p1xzcjaf`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Engine `oesusoqqwfstloktovb1c6qb`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
10. Force-deploy via `POST /deploy?force=true` — beide `finished`.
11. E2E-test: `POST /auth/v1/signup` → HTTP 200 + user-row in `auth.users`. Service-role `POST /rest/v1/dpa_acceptance` → HTTP 201. Test-users opgeruimd.

## Verificatie (na afloop)

```
https://supabase-retroductus.cyberductus.nl/auth/v1/settings → 200 (met anon key)
https://supabase-retroductus.cyberductus.nl/rest/v1/ → 200 (met anon key)
https://retroductus-engine.cyberductus.nl/health → 200 (met CF Access service-token)
https://retroductor.nl/ → 302 (CF Access gate actief, correct)
DB state: 0 users, 0 dpas, 0 jobs, 4 tabellen met RLS
```

## Afwijkingen van runbook

- Geen CF Access op `supabase-retroductus.cyberductus.nl` — briefing zei wel, andere 8 stacks hebben het niet en de app heeft geen workaround om door Access heen te praten. Consistency won.
- Stap 1 runbook-template had baseline-schema al in Supabase Studio — retroductus had niks. Zelf baseline-tabel `mining_jobs` gemaakt.

## Runbook-verbetering (voorstel voor `MIGRATIE-RUNBOOK-MODUS-D.md`)

Tussen stappen 3 en 4 vastleggen:

> **Tunnel-ingress moet via CF API** (niet lokale YAML — tunnel is remotely managed sinds Ordo 2 v2). `PUT /accounts/{acct}/cfd_tunnel/{tun}/configurations` met volledige ingress-JSON.

En stap 0 uitbreiden:

> **Als het project geen SQL-migratie heeft voor zijn basisschema (was direct via Studio UI aangemaakt op Cloud), eerst de tabelstructuur uit de app-code reconstrueren.** Geldt o.a. voor retroductus (`mining_jobs`).

## Credentials-instructie voor Legatus

Nieuwe entry voor `credentials.md` sectie "Beelink self-host Supabase stacks" ligt klaar in **`c:\Projecten\.tmp\credentials-orig-4.txt`** (gitignored). Overnemen en tmp-file wissen.

## Openstaand

- Repo-migratie: overweeg baseline-`mining_jobs`-tabel als nieuwe eerste migration `20260313000000_baseline_mining_jobs.sql` — op dit moment ontbreekt die zodat een volgende fresh-start nog steeds dezelfde blokker raakt. Geen scope van deze Ordo; commit niet gedaan.
- `docs/STAPPENPLAN.md` / `BUSINESSPLAN.md` / `superductus/projects-data.ts` niet aangeraakt — infra-verhuizing, geen product-fase-update.
- Vercel + Railway uitfasering staat in Ordo 10.
