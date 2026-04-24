-- ============================================
-- Seed: interne testers Fase 2 — template
-- ============================================
-- Deze SQL seed vult user_plans + dpa_acceptance voor de 3 interne testers
-- NADAT ze via het Supabase Auth admin-endpoint zijn aangemaakt.
--
-- Voorwaarde: users bestaan al in auth.users (aanmaak via
--   POST https://supabase-retroductus.cyberductus.nl/auth/v1/admin/users
--   body: {"email":"...","password":"...","email_confirm":true}
--   headers: apikey + Authorization: Bearer <SERVICE_ROLE_KEY>
-- ).
--
-- Draai deze file via Supabase Studio SQL-editor of `psql` met service-role DB-URL.
-- Wachtwoorden staan NIET in dit bestand — zie credentials.md.
-- ============================================

-- 1. free-plan voor alle 3 interne testers
INSERT INTO public.user_plans (user_id, plan)
SELECT id, 'free'
FROM auth.users
WHERE email IN (
  'pieter@debrabander.com',
  'tester1@retroductor.nl',
  'tester2@retroductor.nl'
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Pieter admin-vlag (Legatus)
UPDATE public.user_plans
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'pieter@debrabander.com'
);

-- 3. DPA-acceptance seed (versie 2026-04-24, ip_address 0.0.0.0 want seed)
INSERT INTO public.dpa_acceptance (user_id, dpa_version, ip_address)
SELECT id, '2026-04-24', '0.0.0.0'
FROM auth.users
WHERE email IN (
  'pieter@debrabander.com',
  'tester1@retroductor.nl',
  'tester2@retroductor.nl'
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verificatie-query (commenteer na seed)
-- SELECT u.email, u.id, p.plan, p.is_admin, d.dpa_version
-- FROM auth.users u
-- LEFT JOIN public.user_plans p ON p.user_id = u.id
-- LEFT JOIN public.dpa_acceptance d ON d.user_id = u.id
-- WHERE u.email IN (
--   'pieter@debrabander.com',
--   'tester1@retroductor.nl',
--   'tester2@retroductor.nl'
-- );
