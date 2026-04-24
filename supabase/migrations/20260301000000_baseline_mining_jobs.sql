-- ============================================
-- Baseline: mining_jobs tabel
-- Reconstructie uit engine-code (engine/routers/{logs,analysis,connectors,conformance,insights}.py)
-- + Supabase Cloud runtime-schema (was nooit als migratie gecommit; tabel werd handmatig
-- aangemaakt in Cloud). Deze baseline zet de tabel deterministisch op een schone stack op.
-- Datum timestamp vóór de eerste bestaande migratie (20260314000001) zodat fresh-start
-- deze eerst uitvoert, gevolgd door de later toegevoegde kolommen (filename, RLS, etc.).
--
-- Retentie: mining_jobs worden bewaard zolang de gebruiker een actief account heeft
-- (CASCADE via user_id → auth.users).
-- ============================================

CREATE TABLE IF NOT EXISTS public.mining_jobs (
  id                  UUID PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'done', 'error')),
  result              JSONB,
  event_count         INTEGER,
  error_message       TEXT,
  conformance_result  JSONB,
  insights_cache      JSONB,
  filename            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- Indexen voor dashboard-queries (lijst van jobs per gebruiker, sorteren op datum)
CREATE INDEX IF NOT EXISTS idx_mining_jobs_user_id
  ON public.mining_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_mining_jobs_user_created_at
  ON public.mining_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mining_jobs_status
  ON public.mining_jobs(status)
  WHERE status IN ('pending', 'running');

COMMENT ON TABLE public.mining_jobs IS
  'Process mining jobs per gebruiker. Retentie: bewaard zolang account actief, verwijderd via CASCADE bij account-verwijdering. RLS: ingeschakeld in 20260314000001_rls_tenant_isolation.sql.';
