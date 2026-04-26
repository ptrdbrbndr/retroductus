# Security Baseline — Retroductus

**Privacy-niveau: HOOG**
Verwerkt bedrijfsprocessen en event logs van klanten. Deze data is vertrouwelijk en bedrijfseigen — een lek kan klanten zakelijk schaden.

**Relevante normen**: OWASP ASVS Level 1, ISO/IEC 27001, ISO/IEC 12207

> Status: Fase 0 — nog niet gestart (2026-03-13). Dit document dient als bouwinitiatief — verwerk deze eisen vanaf dag 1.

---

> **Doc-revalidatie — 2026-04-26.** Deze baseline was geschreven in Fase 0 (2026-03-13, commit 35fefb2). Het project staat per heden op **Fase 2 oplevering — intern testen actief** (commit ec6a59f). Onderstaande status-tabellen geven nog "⬜ bouwen" aan op items die inmiddels grotendeels ingericht zijn; bevestig elk item via code-review vóór externe pre-flight of audit. Belangrijke architectuur- en security-shifts sinds 35fefb2:
>
> - **Hosting verschoven** — Engine + Frontend draaien op **Beelink/Coolify**; Railway- en Vercel-projecten zijn uitgefaseerd (commit cfdcf3d, ordo-10). Engine-FQDN: `retroductus-engine.cyberductus.nl`. Frontend: `retroductor.nl` direct via CF Tunnel.
> - **Self-host Supabase** op Beelink (FQDN `supabase-retroductus.cyberductus.nl`, credentials in `credentials.md`)
> - **CF Access met e-mail-allowlist** (Pieter + 2 testers) — toegang tot intern testen
> - **RLS-bug user_plans admin-policy infinite recursion** opgelost (commit 8b673c8) + SSR cookie-rotation fix (commit 267ad7e); ordo-8b bugfix-rapport in `docs/agent-log/`
> - **Conductus X-Tenant-Id contract** geïmplementeerd op Flowable-connector (commit 02fb047, ordo-6 rapport) — wachtende op Concordius voor Conductus-zijde
> - **AI-insights SSE end-to-end** — vibe-test stream eerste chunk binnen 3.5s (commit 1f1045c, ordo-7)
> - **Stripe prep-only scaffold** (501-stubs, niet aangesloten — Fase 3, commit 14070ec)
> - **Retention cleanup-functie** ingericht (niet geactiveerd, commit 42889b9)
> - **DPA-acceptatie** verplicht in register (zie `docs/DPA.md` + `docs/staging-users.md`)
>
> Inhoudelijke regels (HOOG-niveau, OWASP ASVS L1, ISO 27001) blijven geldig. Status-cellen hieronder zijn niet stuk-voor-stuk geverifieerd in deze revalidatie — pak een code-review-pass vóór een externe audit, of volg de Fase-2-blokkers in `docs/agent-log/` voor de canonieke up-to-date status.

---

## Architectuur security (bouw dit in vanaf het begin)

### Multi-tenant event log isolatie

| Item | Eis | Status |
|------|-----|--------|
| RLS op event log tabellen | Gebruiker/org ziet alleen eigen logs | ⬜ bouwen |
| Project-isolatie | Supabase `project_id` FK in elke query | ⬜ bouwen |
| FastAPI: organisatie-check | Elke endpoint valideert eigenaarschap | ⬜ bouwen |
| Supabase → FastAPI auth | Service calls geauthenticeerd via JWT of service key | ⬜ bouwen |

### Bestandsupload (XES / CSV event logs)

| Item | Eis | Status |
|------|-----|--------|
| File type validatie server-side | Alleen `.xes`, `.csv` — MIME + extensie check | ⬜ bouwen |
| Bestandsgrootte limiet | Per plan: Free 10MB, Starter 100MB, Pro 1GB | ⬜ bouwen |
| Virus/malware scan | ClamAV of Supabase Storage policy | ⬜ verkennen |
| Opslag geïsoleerd per org | Storage bucket per organisatie of prefix-isolatie | ⬜ bouwen |
| Automatische verwijdering | Event logs verwijderd bij account-opzegging | ⬜ bouwen |

### FastAPI (Python Mining Engine)

| Item | Eis | Status |
|------|-----|--------|
| Auth op alle endpoints | Bearer token validatie (Supabase JWT) | ⬜ bouwen |
| Input validatie met Pydantic | Schema-validatie op alle request bodies | ⬜ bouwen |
| Geen arbitrary code execution | PM4Py parameters gesandboxed | ⬜ verifiëren |
| Rate limiting | Zware mining operaties per user beperkt | ⬜ bouwen |
| Timeout op mining jobs | Max 60s per analyse, daarna afbreken | ⬜ bouwen |
| Error responses clean | Geen Python tracebacks naar client | ⬜ bouwen |
| CORS restrictief | Alleen conductus.nl / retroductor.nl origins | ⬜ bouwen |

### AI Insights (Claude API)

| Item | Eis | Status |
|------|-----|--------|
| Prompt injection preventie | Event log data in system context, niet als user input | ⬜ bouwen |
| Data minimalisatie naar API | Stuur alleen geaggregeerde stats, geen ruwe event data | ⬜ bouwen |
| API key via env | `ANTHROPIC_API_KEY` nooit in code | ⬜ standaard |
| Usage limiet per plan | Pro-only feature, quota per maand | ⬜ bouwen |

### Authenticatie & Autorisatie

| Item | Eis | Status |
|------|-----|--------|
| Supabase Auth | JWT-gebaseerd | ⬜ bouwen |
| Plan-check server-side | Free-gebruiker kan geen Pro-features aanroepen | ⬜ bouwen |
| Team-toegang isolatie | Team-lid ziet alleen projecten van zijn org | ⬜ bouwen |
| Supabase service key server-side | Nooit in Next.js client bundle | ⬜ standaard |

### Privacy (AVG)

| Item | Eis | Status |
|------|-----|--------|
| Verwerkersovereenkomst template | Klanten uploaden bedrijfsdata — DPA nodig | ⬜ juridisch |
| Data export | Gebruiker kan eigen event logs + analyses downloaden | ⬜ bouwen |
| Account + data verwijdering | Alle logs, analyses, resultaten verwijderd | ⬜ bouwen |
| Bewaartermijn gedocumenteerd | Hoe lang bewaar je event logs na opzegging? | ⬜ definiëren |

---

## Prioriteit actielijst (bouwen in deze volgorde)

1. **FUNDAMENT** — Multi-tenant RLS + organisatie-isolatie vóór enige data-feature
2. **FUNDAMENT** — FastAPI auth middleware (JWT validatie) op elke endpoint
3. **FUNDAMENT** — Pydantic input validatie + clean error responses
4. **HOOG** — File upload validatie (type + grootte) met plan-limiet
5. **HOOG** — Plan-check server-side voor Pro-features (AI insights)
6. **MEDIUM** — Rate limiting mining endpoints (zware Python operaties)
7. **MEDIUM** — Prompt injection preventie voor Claude API
8. **JURIDISCH** — Verwerkersovereenkomst (DPA) voor B2B klanten

---

## Bedreigingsmodel

| Bedreiging | Impact | Kans | Mitigatie |
|------------|--------|------|-----------|
| Org A ziet event logs van Org B | Kritiek | Medium | RLS + org-check (bouwen) |
| Malformed XES crash mining engine | Hoog | Medium | Input validatie + timeout |
| Plan bypass (Free gebruikt Pro features) | Hoog | Medium | Server-side plan check |
| Prompt injection via event log data | Medium | Laag | Data in system context houden |
| Grote upload gooit Railway server plat | Medium | Hoog | Bestandsgrootte limiet |
| Event log data lekt via AI API | Hoog | Laag | Minimaliseer wat je naar Claude stuurt |
