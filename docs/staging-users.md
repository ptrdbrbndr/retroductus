# Gebruikers: Staging & Productie

**Datum:** 2026-03-14
**Omgeving:** Conductus-suite (Supabase Auth)

> Retroductus heeft geen eigen auth. Gebruikers worden beheerd via Conductus (Supabase Auth).

---

## Staging gebruikers (conductus-staging)

**Supabase project:** ttfgpbuievkuiwdhmtaz.supabase.co

| ID (kort) | E-mail | Naam | Aangemaakt | Laatste login | Bevestigd |
|-----------|--------|------|-----------|---------------|-----------|
| 4ff46900 | pieter@debrabander.com | henk | 2026-03-13 | 2026-03-13 | ja |
| 9265140c | marnix.timmermans@nn.nl | Marnix Timmermans | 2026-03-13 | 2026-03-13 | ja |
| d2db3caf | testuser@conductus.nl | Test Gebruiker | 2026-03-12 | 2026-03-13 | ja |
| 8e710e37 | reinierlammerts@hotmail.com | Reinier | 2026-03-13 | nooit | nee |

---

## Productie gebruikers (conductus)

**Supabase project:** dpybzmujozzwqbqusekc.supabase.co

| ID (kort) | E-mail | Naam | Aangemaakt | Laatste login | Bevestigd |
|-----------|--------|------|-----------|---------------|-----------|
| 3c5d9179 | chris.ypkemeule@ductus.nl | geurt | 2026-03-06 | 2026-03-06 | ja |
| 387b6b68 | marnix.timmermans@nn.nl | Marnix Timmermans | 2026-03-13 | 2026-03-13 | ja |
| 60176da1 | testuser@conductus.nl | Test Gebruiker | 2026-03-12 | 2026-03-14 | ja |
| 6676b961 | reinierlammerts@hotmail.com | Reinier Lammerts | 2026-03-06 | nooit | nee |
| 35b48a85 | pjitter@proton.me | w | 2026-03-13 | nooit | nee |

---

## Testaccounts

| Omgeving | E-mail | Wachtwoord |
|----------|--------|-----------|
| Staging | testuser@conductus.nl | Conductus-Test-2026! |
| Productie | testuser@conductus.nl | Conductus-Test-2026! |

> Gebruik de testaccounts voor automated tests via Playwright (`auth.setup.ts`).
