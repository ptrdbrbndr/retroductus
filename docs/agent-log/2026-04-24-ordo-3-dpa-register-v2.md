# Missio — Ordo 3 v2: DPA-acceptatie verplicht in register-flow (GESLAAGD)

- **Datum:** 2026-04-24
- **Agent:** Centurio Janus
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 3
- **Status:** Implementatie + deploy geslaagd. 2 vibe-tests groen, 1 test `fixme` (vereist staging-Supabase).
- **Commit:** `784de16` — `feat(auth): verplicht DPA-acceptatie bij registratie`
- **Branch:** `staging` (geen `page.tsx`-aanraking, coming-soon-regel nageleefd).

## Resultaat

Registratie weigert server-side én client-side zonder DPA-akkoord. Bij geldige submit:
`auth.users` + `dpa_acceptance { user_id, dpa_version: '2026-04-24', ip_address }` atomair — faalt de DPA-insert, dan wordt het net-aangemaakte auth-account direct verwijderd (privacy-by-design, géén account zonder bewijs).

## Gewijzigde / nieuwe bestanden

| Pad | Toelichting |
|---|---|
| `src/lib/constants.ts` (nieuw) | `DPA_VERSION = '2026-04-24'` — geen magic strings |
| `src/app/(auth)/register/actions.ts` (nieuw) | Server-action `registerUser`; resolveert IP uit `x-forwarded-for` → `x-real-ip` → `'0.0.0.0'`; hard-fail rollback |
| `src/app/(auth)/register/page.tsx` (gewijzigd) | Delegeert aan server-action via `useTransition`; checkbox `data-testid="register-dpa-checkbox"`; link `/dpa` met `target="_blank" rel="noopener noreferrer"`; submit `data-testid="register-submit"` disabled zonder vinkje; `data-testid="register-error"` met `role="alert"` |
| `tests/vibe/fase2-01-register-dpa.test.ts` (nieuw) | 3 tests: checkbox-state, server-side force-submit blokkade, DB-assertion (fixme — staging) |

Geen wijziging in `src/app/auth/callback/route.ts`: DPA-insert loopt vóór e-mail-confirmation in de server-action — callback hoeft het niet opnieuw te doen.

## Vibe-test evolutie

Pre-implementatie run (na Stap 1 vibe-test, vóór Stap 2):
```
getaddrinfo ENOTFOUND ttfgpbuievkuiwdhmtaz.supabase.co
```
`.env.local` verwijst nog naar het oude Supabase Cloud-project; in de lopende migratie is de DNS weg. Test A (checkbox-state) en Test B (geforceerde submit → NL error) werken zonder backend; Test C (DB-assertion via service-role) vereist een bereikbare Supabase en is `test.fixme` gemaakt met verwijzing naar dit rapport.

Post-implementatie (`--no-deps`, pre-existing setup-test overgeslagen):
```
ok 1 checkbox begint uitgevinkt en submit-button is disabled tot gechecked (1.4s)
ok 2 submit zonder DPA-vinkje blijft op /register en toont NL foutmelding (1.2s)
- 3 ... fixme (Supabase DNS onbereikbaar)
1 skipped, 2 passed
```
TypeScript: `npx tsc --noEmit` clean.

## Coolify-deploy + staging-verificatie

- Deployment UUID: `s8cljerewshwhx7zr1nbihgk` (app `cd1xaylx877wr431p1xzcjaf` `retroductus-ui`, branch `staging`).
- Force-deploy via Coolify API → status `finished`, application `running`.
- Raw curl (Host-header naar Beelink IP):
```
$ curl -sk --resolve retroductor.nl:443:192.168.68.69 https://retroductor.nl/register | grep dpa
data-testid="register-dpa-checkbox"
dpa-accept
verwerkersovereenkomst
HTTP/1.1 200 OK, X-Nextjs-Prerender: 1
```

## Afwijkingen

1. **DPA-insert gebeurt niet langer in `auth/callback/route.ts` maar in de register-action**: `data.user.id` is daar direct beschikbaar, IP server-side leesbaar, en de rollback kan atomair — dit past beter bij privacy-by-design dan een best-effort insert na e-mail-confirm.
2. **Test C gemarkeerd `test.fixme`**: de staging-Supabase draait op een andere host dan de lokale `.env.local` referentie. Contract-check (DB-rij, `dpa_version`, `ip_address`) wordt geleverd door een vervolg-test zodra Ordo 6/staging-Supabase binding vaststaat.
3. **Pre-existing `01-auth.setup.ts` faalt** (tester-account `test@retroductus.nl` bestaat niet of wachtwoord is gewijzigd) — buiten scope Ordo 3, valt onder Ordo 4 (interne tester-seeding).

## Open punten voor Legatus

- Ordo 4: tester-seeding activeert Test C.
- Ordo 6: `.env.local` voor frontend-op-Beelink moet wijzen naar de Beelink-Supabase (verschilt van huidige Cloud-URL) zodat lokale dev + vibe-tests de end-to-end signup kunnen valideren.
- Accessibility: `Link` naar `/dpa` opent in nieuwe tab — `rel="noopener noreferrer"` staat ingesteld.

## Geen secrets

Dit rapport bevat geen tokens, wachtwoorden of service-role keys.
