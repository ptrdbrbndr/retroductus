# Deployment: Retroductus

**Versie:** 0.1
**Datum:** 2026-03-14

---

## Omgevingen

| Omgeving | URL | Branch/Trigger |
|----------|-----|---------------|
| Development | localhost:3009 | Handmatig: `npx next dev -p 3009` |
| Staging | staging.retroductus.nl | Handmatig deployen (zie hieronder) |
| Productie | retroductus.nl | Currently: coming soon `index.html` |

---

## Retroductus UI deployen

### Vereisten
- Vercel CLI: `npm i -g vercel` (of npx)
- Vercel token: zie credentials memory
- Werkmap: `c:\Projecten\retroductus\` (niet de `ui/` subdirectory!)

### Staging deploy
```bash
cd /c/Projecten/retroductus

VERCEL_TOKEN="<zie credentials>"
npx vercel deploy --token="$VERCEL_TOKEN" --yes

# Alias instellen:
DEPLOY_URL=$(npx vercel deploy --token="$VERCEL_TOKEN" --yes 2>&1 | grep "Preview:" | awk '{print $2}')
npx vercel alias set "$DEPLOY_URL" staging.retroductus.nl --token="$VERCEL_TOKEN" --scope=ptrdbrbndrs-projects
```

### Productie deploy (pas toe als app gereed is)
```bash
cd /c/Projecten/retroductus
npx vercel deploy --prod --token="$VERCEL_TOKEN" --yes
# Vercel used rootDirectory=ui/ automatically
```

> **Let op:** De productie alias `retroductus.nl` wijst momenteel naar de coming soon pagina (`index.html`).
> Verwijder `index.html` uit de repo root voordat je productie deployt met de Next.js app.

### Vercel project-configuratie
- **Project ID:** `prj_O80YP3STWQsVu7uKnuoEOclaUXMl`
- **Team ID:** `team_RVnlSWJ9zuZqcKU5d5cD76hd`
- **Root directory:** `ui/`
- **Framework:** nextjs

---

## Mining Engine deployen (Railway)

### Vereisten
- Railway CLI: `npm i -g @railway/cli`
- Railway account (handmatige login vereist)

### Deploy
```bash
cd /c/Projecten/retroductus/engine

railway login          # Browserless login
railway link           # Koppel aan Railway project
railway up             # Deploy
```

### Environment variables instellen in Railway
```
MINING_ENGINE_SECRET=VM8ZWRdkO1MVYDfxGBbYnBKFps2wa_7RH4n9fMC_2WY
FLOWABLE_DB_URL=<Flowable PostgreSQL connection string>
SUPABASE_URL=https://dpybzmujozzwqbqusekc.supabase.co
SUPABASE_SERVICE_KEY=<zie credentials>
ANTHROPIC_API_KEY=<Anthropic API key>
```

---

## Conductus mining-migratie uitvoeren

```bash
cd /c/Projecten/conductus/cmmn-portal

# Staging
npx supabase db push --db-url "postgresql://postgres:<wachtwoord>@ttfgpbuievkuiwdhmtaz.supabase.co:5432/postgres"

# Productie
npx supabase db push --db-url "postgresql://postgres:<wachtwoord>@dpybzmujozzwqbqusekc.supabase.co:5432/postgres"
```

---

## DNS (mijn.host)

| Record | Type | Waarde |
|--------|------|--------|
| retroductus.nl | CNAME | cname.vercel-dns.com |
| staging.retroductus.nl | CNAME | cname.vercel-dns.com |
| api.retroductus.nl | CNAME | (Railway URL — toekomst) |

---

## Probleemoplossing

**Vercel deployt vanuit rootDirectory=ui/ui (dubbele ui)**
Voer de deploy altijd uit vanuit `c:\Projecten\retroductus\` (repo root), niet vanuit `ui/`.

**Nieuwe commits overschrijven de staging-UI**
Git-koppeling triggert automatische deploys vanuit de root van de repo.
Fix: Vercel project heeft `rootDirectory=ui` ingesteld, maar controleer dit als het opnieuw mis gaat via:
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/prj_O80YP3STWQsVu7uKnuoEOclaUXMl?teamId=team_RVnlSWJ9zuZqcKU5d5cD76hd" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory": "ui", "framework": "nextjs"}'
```

**staging.retroductus.nl wijst naar verkeerde deployment**
Bekijk huidige aliassen: `vercel alias ls --scope=ptrdbrbndrs-projects`
Corrigeer: `vercel alias set <deploy-url> staging.retroductus.nl`
