-- Bug 1: RLS infinite recursion op user_plans (admin-policy)
-- Oude policy "Admins can view all user plans" deed EXISTS-lookup op
-- user_plans vanuit user_plans-policy → 42P17.
-- Fix: SECURITY DEFINER helper-functie die RLS bypass'd voor de
-- enkele check.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT is_admin
    FROM public.user_plans
    WHERE user_id = auth.uid()
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Vervang de recursieve admin-policy met de helper
DROP POLICY IF EXISTS "Admins can view all user plans" ON public.user_plans;
CREATE POLICY "Admins can view all user plans"
ON public.user_plans
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());
