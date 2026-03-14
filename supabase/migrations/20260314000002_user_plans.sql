-- user_plans: abonnementsplan per gebruiker
-- Retentie: bewaard zolang het account actief is, verwijderd via CASCADE bij account-verwijdering
-- Vereist voor server-side plan-check (Pro features gating)

CREATE TABLE IF NOT EXISTS user_plans (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL DEFAULT 'free',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag alleen eigen plan lezen
CREATE POLICY "Gebruiker leest eigen plan"
  ON user_plans FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON TABLE user_plans IS 'Abonnementsplan per gebruiker. Retentie: bewaard zolang account actief, verwijderd via CASCADE bij account-verwijdering.';
