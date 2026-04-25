-- ============================================
-- Conductus-integratie label op mining_jobs (Ordo 6, Fase 2 intern testen)
--
-- conductus_tenant_id is een label voor sourcing-tracking — registreert
-- welke Conductus-tenant de mining-job heeft getriggerd via de Flowable-
-- connector. Dit is GEEN toegangscontrole: RLS blijft op user_id (zie
-- 20260314000001_rls_tenant_isolation.sql). De kolom is optioneel: oudere
-- jobs en jobs die niet via Conductus zijn gestart blijven NULL.
--
-- Idempotent: gebruikt IF NOT EXISTS zodat re-applicatie veilig is.
-- ============================================

ALTER TABLE public.mining_jobs
  ADD COLUMN IF NOT EXISTS conductus_tenant_id text NULL;

CREATE INDEX IF NOT EXISTS idx_mining_jobs_conductus_tenant
  ON public.mining_jobs(conductus_tenant_id)
  WHERE conductus_tenant_id IS NOT NULL;

COMMENT ON COLUMN public.mining_jobs.conductus_tenant_id IS
  'Conductus-tenant die de mining_job triggerde via Flowable-connector. Label voor sourcing-tracking, geen RLS-key.';
