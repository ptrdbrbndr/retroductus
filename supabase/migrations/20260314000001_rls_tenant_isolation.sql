-- RLS tenant isolatie voor Retroductus
-- Elke gebruiker ziet alleen zijn eigen mining jobs
-- Retentie: mining_jobs worden bewaard zolang de gebruiker een actief account heeft

ALTER TABLE mining_jobs ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag eigen jobs lezen
CREATE POLICY "Gebruiker leest eigen jobs"
  ON mining_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Gebruiker mag eigen jobs aanmaken (via Next.js API proxy)
CREATE POLICY "Gebruiker maakt eigen jobs aan"
  ON mining_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Gebruiker mag eigen jobs bijwerken (bijv. filename na upload)
CREATE POLICY "Gebruiker werkt eigen jobs bij"
  ON mining_jobs FOR UPDATE
  USING (user_id = auth.uid());

-- Gebruiker mag eigen jobs verwijderen
CREATE POLICY "Gebruiker verwijdert eigen jobs"
  ON mining_jobs FOR DELETE
  USING (user_id = auth.uid());

-- Service role (engine) mag altijd schrijven (bypassed RLS via service key)
-- Geen extra policy nodig: service_role bypasses RLS by default
