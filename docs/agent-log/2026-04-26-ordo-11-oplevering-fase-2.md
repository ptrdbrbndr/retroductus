# Ordo 11 — Oplevering Fase 2 intern testen

**Datum:** 2026-04-26
**Centurio:** Janus
**Branch:** `staging`
**Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md)

## Samenvatting

Administratieve afronding van Fase 2 — intern testen. Alle Ordines 1 t/m 10 zijn voltooid en geverifieerd. STAPPENPLAN bevat nu een Fase 2-tabel met Definition of Done, BUSINESSPLAN draagt status "Fase 2 — intern testen actief", Superductus-portfoliokaart toont Fase 2 met voortgang 75%.

Wat er in Fase 2 is opgeleverd:

- **Engine + frontend op Beelink/Coolify** achter Cloudflare Access (`retroductor.nl` live, `/health` 200, Cloudflare proxy)
- **DPA-acceptatie verplicht** in registratieflow + register-tabel
- **Stripe prep-only scaffold** (501-stubs, geen live Price ID, geen webhook actief)
- **Conductus X-Tenant-Id contract** op Flowable-connector + `conductus_tenant_id` kolom in `mining_jobs`
- **AI-insights SSE end-to-end** auth-keten geverifieerd; eerste chunk binnen 3,5s
- **Vibe-baseline 46/0/3** op staging (0 fails)
- **Twee bugfixes**: RLS infinite recursion `user_plans` + SSR cookie-rotation Beelink-Supabase
- **Retentie-cleanup-functie** ingericht en gedocumenteerd, niet geactiveerd (handmatig schakelen)
- **Supabase-migratie** Cloud → Beelink (fresh-start, 7 migraties)
- **Tester-seeding**: Pieter (admin) + 2 externe testers
- **Branch-sync** master → staging (31 commits)
- **Railway + Vercel uitgefaseerd**: Vercel ontkoppeld + domain weg, Railway pause-step blijft handmatig (token dood — zie acties)
- **ADR 0001, 0003, 0004, 0005** vastgelegd
- **`docs/staging-users.md`** bijgewerkt

## Commits Fase 2 (chronologisch)

| Commit | Beschrijving |
|--------|--------------|
| `5f051e0` | docs(ordo-2-v2): ADR 0001/0004 + frontend-op-beelink missio-rapport |
| `daa61db` | docs(fase-2): plan + spec + ADR 0003 + Ordo 1-3 missio-rapporten |
| `dba9b10` | merge: master -> staging (Fase 1 features + hardening + docs) |
| `784de16` | feat(auth): verplicht DPA-acceptatie bij registratie |
| `735bcbc` | docs(ordo-3-v2): DPA-acceptatie deployed op staging |
| `9efdd5d` | docs(agent-log): Supabase fresh-start migratie naar Beelink |
| `754026e` | feat(db): baseline mining_jobs migratie + tester-seeding Fase 2 |
| `f6b2ce2` | docs(ordo-4): addendum Supabase-tunnel-fix — blokker Beelink onbereikbaar |
| `12978c8` | docs(ordo-4): addendum — tester-seeding afgerond na Beelink-reboot |
| `14070ec` | chore(stripe): prep-only scaffold, not wired |
| `e779dbe` | docs(ordo-5): rapport stripe prep-only scaffold |
| `02fb047` | feat(integratie): Conductus X-Tenant-Id contract op Flowable-connector |
| `32e9056` | docs(ordo-6): rapport Conductus X-Tenant-Id contract |
| `1f1045c` | test(insights): vibe-test SSE-stream eerste chunk binnen 3.5s |
| `8ec53eb` | docs(ordo-7): rapport AI-insights SSE end-to-end verificatie |
| `396c54b` | test(vibe): auth-setup env-var refactor + Ordo 8 blokker-rapport |
| `d67f010` | test(vibe): Ordo 8 retry baseline groen — fase2-01 actief, 2 nieuwe blokkers |
| `8b673c8` | fix(rls): user_plans admin-policy zonder infinite recursion |
| `267ad7e` | fix(auth): SSR cookie-rotation breekt session na page-render |
| `c406b61` | test(vibe): fase2-04/05 blokker-doc update na bug-1+2 fixes |
| `ef6515e` | docs(ordo-8b): bugfix-rapport RLS recursion + SSR cookies |
| `42889b9` | feat(retention): cleanup-functie ingericht (niet geactiveerd) |
| `cfdcf3d` | docs(ordo-10): Railway + Vercel uitfaseren voor retroductus |
| _(deze)_ | feat(fase-2): oplevering — intern testen actief |

## Definition of Done — gecheckt

- ✅ retroductor.nl live, Beelink-gehost, achter Cloudflare Access
- ✅ Engine `/health` 200 op Beelink
- ✅ DPA-acceptatie verplicht in register
- ✅ Stripe SDK + stubs aanwezig, 501, geen live Price ID
- ✅ X-Tenant-Id contract werkt; `conductus_tenant_id` in `mining_jobs`
- ✅ AI-insights SSE-stream auth-keten geverifieerd
- ✅ `./vibe-check.sh` 0 fail (46 pass / 0 fail / 3 skip)
- ✅ ADR 0001, 0003, 0004, 0005 vastgelegd
- ✅ `docs/staging-users.md` bijgewerkt
- ✅ Railway + Vercel uitgefaseerd (14d grace)
- ✅ STAPPENPLAN Fase 2-sectie met DoD
- ✅ BUSINESSPLAN status bijgewerkt
- ✅ Superductus projects-data toont Fase 2 (75%)

## Backlog voor Fase 2.5 / Fase 3

- `mining_jobs.tenant_id` + `mining_jobs.source` kolom-drift (schema-fix nodig)
- Engine 500 op `/insights/ai` happy-path (diagnose nodig)
- Tunnel-config wordt periodiek gereset (root-cause onderzoek)
- Cross-project Supabase-tunnel-stabiliteit (iductus / deductus / overige)
- Stripe activatie + Price ID's koppelen + webhook live
- Retentie-cleanup-functie scope-uitbreiding + pg_cron-activatie

## Pieter — handmatige acties

| # | Actie | Toelichting |
|---|-------|-------------|
| 1 | Railway dashboard → Pause `retroductus-engine` | API-token dood (Ordo 10), GraphQL-call faalt met "Not Authorized". Manueel via dashboard pauzeren. Backup van Vercel env-vars staat in `.tmp/vercel-env-final-2026-04-26.env` (gitignored). |
| 2 | Concordius dispatchen voor Conductus-zijde X-Tenant-Id | Retroductus-zijde stuurt `X-Tenant-Id`, Conductus moet hem nog accepteren + valideren in Flowable-connector. Zie [`Ordo 6 rapport`](2026-04-26-ordo-6-conductus-integratie.md). |
| 3 | Mailbox-aliassen `tester1@retroductor.nl` / `tester2@retroductor.nl` | Optioneel — alleen nodig wanneer wachtwoord-reset of Resend-mail gewenst is. Nu lopen testers via persoonlijke adressen + handmatig wachtwoord. |
| 4 | Cron / pg_cron activeren voor retentie-cleanup | Functie staat klaar (`42889b9`); activeren wanneer eerste klantdata > 90 dagen wordt. |

## Geen secrets

Geen credentials, tokens, wachtwoorden of bcrypt-hashes in dit rapport. Pieter's handmatige stappen verwijzen naar eerdere rapporten of dashboards — niet naar inhoud.

---

_Opgesteld door Centurio Janus, 2026-04-26._
