-- ============================================
-- Issues — gemelde problemen door gebruikers
-- Retentie: 2 jaar na aanmaak (AVG/ISO 27701)
-- ============================================

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  page_url TEXT,
  category TEXT NOT NULL
    CHECK (category IN ('bug', 'inhoud', 'technisch', 'toegang', 'suggestie', 'overig')),
  priority TEXT NOT NULL DEFAULT 'normaal'
    CHECK (priority IN ('laag', 'normaal', 'hoog', 'kritiek')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_behandeling', 'opgelost', 'gesloten')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_issues_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_issues_updated_at();

-- RLS
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Alle ingelogde gebruikers mogen issues zien
CREATE POLICY "Authenticated users can view issues"
  ON issues FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Alle ingelogde gebruikers mogen issues aanmaken
CREATE POLICY "Authenticated users can insert issues"
  ON issues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Alleen admins mogen issues verwijderen
CREATE POLICY "Admins can delete issues"
  ON issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
