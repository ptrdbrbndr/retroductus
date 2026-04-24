-- dpa_acceptance: bijhouden of gebruiker de Verwerkersovereenkomst heeft geaccepteerd
-- Retentie: bewaard zolang het account actief is, verwijderd via CASCADE bij account-verwijdering
-- Vereist voor GDPR/AVG-compliance bij B2B-klanten die bedrijfseigen event logs uploaden

CREATE TABLE IF NOT EXISTS dpa_acceptance (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dpa_version TEXT NOT NULL DEFAULT '1.0',
  ip_address  TEXT -- optioneel, voor audit trail
);

ALTER TABLE dpa_acceptance ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag alleen eigen DPA-acceptatie lezen
CREATE POLICY "Gebruiker leest eigen DPA-acceptatie"
  ON dpa_acceptance FOR SELECT
  USING (user_id = auth.uid());

-- Gebruiker mag eigen DPA-acceptatie aanmaken
CREATE POLICY "Gebruiker accepteert DPA"
  ON dpa_acceptance FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE dpa_acceptance IS 'AVG-verwerkersovereenkomst acceptatie per gebruiker. Retentie: bewaard zolang account actief, verwijderd via CASCADE bij account-verwijdering.';
