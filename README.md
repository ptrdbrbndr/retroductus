# Retroductus

> *Retro* (terug) + *ducere* (leiden) — kijk terug op je processen om beter vooruit te sturen.

Retroductus is een open-source gebaseerd **process mining platform** dat zowel standalone (retroductor.nl) als geïntegreerd in [Conductus](https://conductus.nl) draait.

Het platform gebruikt **PM4Py** als mining engine en biedt inzicht in:
- Hoe processen werkelijk verlopen (process discovery)
- Waar vertragingen ontstaan (performance analytics)
- Welke cases afwijken van het normatiefmodel (conformance checking)
- AI-gegenereerde verbeteraanbevelingen (Claude API)

---

## Documentatie

| Document | Beschrijving |
|---------|-------------|
| [docs/analyse.md](docs/analyse.md) | Toolselectie-analyse — waarom PM4Py |
| [docs/productvision.md](docs/productvision.md) | Productvision, doelgroep, businessmodel |
| [docs/architectuur.md](docs/architectuur.md) | Technische architectuur, componenten, datamodel |
| [docs/stappenplan.md](docs/stappenplan.md) | Fasering, taken, mijlpalen (22 weken) |

---

## Status

> **Fase 0 — Fundament** (nog niet gestart)

Zie [stappenplan](docs/stappenplan.md) voor de volledige roadmap.

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Mining Engine | Python 3.12, FastAPI, PM4Py 2.7.x |
| Frontend | Next.js 15, Tailwind CSS, React Flow |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage (S3-compatible) |
| AI | Anthropic Claude API (claude-opus-4-6) |
| Hosting Engine | Railway |
| Hosting UI | Vercel |
| DNS | mijn.host (retroductor.nl) |

---

## Licentie

Retroductus UI en API wrapper zijn proprietary software van Pieter de Brabander.
PM4Py wordt gebruikt als geïsoleerde microservice onder AGPL 3.0 licentie.
