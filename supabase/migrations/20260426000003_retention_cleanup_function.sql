-- ============================================
-- Retentie-cleanup-functie (Ordo 9, Fase 2 intern testen)
--
-- Wist event-log-data ouder dan 30 dagen, conform DPA-pagina
-- (src/app/dpa/page.tsx, sectie 3): event logs (XES/CSV) max. 30 dagen.
--
-- BELANGRIJK: deze functie is NIET geactiveerd in pg_cron.
-- Activatie en scope-uitbreiding gebeurt in Fase 2.5 of later, conform
-- ADR 0005 (docs/adr/0005-retentie-cleanup-strategie.md).
--
-- Scope (minimaal, conservatief):
--   Alleen mining_jobs-rows met status='error' ouder dan 30 dagen worden
--   verwijderd. Reden: mining_jobs zelf valt onder retentie "zolang account
--   actief" (analyse-resultaten/aggregaten); alleen mislukte runs bevatten
--   geen waarde voor de gebruiker en kunnen veilig na 30 dagen weg.
--   Scope-uitbreiding (raw event-data in mining_jobs.result-JSONB
--   leegmaken bij voltooide jobs >30d) wordt overwogen bij activatie,
--   na audit van wat er feitelijk in `result` zit.
--
-- Veiligheid:
--   - SECURITY DEFINER + REVOKE FROM PUBLIC + GRANT EXECUTE TO postgres:
--     functie kan alleen door de Postgres-superuser worden aangeroepen.
--   - DELETE-statement gebruikt expliciet WHERE + INTERVAL — geen
--     ongebonden DELETE.
--   - Idempotent: CREATE OR REPLACE; opnieuw uitvoeren overschrijft veilig.
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_event_logs()
RETURNS TABLE(deleted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.mining_jobs
    WHERE status = 'error'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO n FROM deleted;
  RETURN QUERY SELECT n;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_event_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_event_logs() TO postgres;

COMMENT ON FUNCTION public.cleanup_old_event_logs() IS
  'Retentie-cleanup. NIET geactiveerd in pg_cron. Activatie via Fase 2.5 / ADR 0005. Scope: alleen mining_jobs met status=error ouder dan 30 dagen.';
