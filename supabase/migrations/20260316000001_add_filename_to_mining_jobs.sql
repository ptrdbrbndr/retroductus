-- Voeg filename kolom toe aan mining_jobs
ALTER TABLE mining_jobs ADD COLUMN IF NOT EXISTS filename TEXT;
