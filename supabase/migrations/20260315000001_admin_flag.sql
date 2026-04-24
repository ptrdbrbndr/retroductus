-- ============================================
-- Admin vlag op user_plans
-- Eerste admin instellen via Supabase Dashboard:
--   UPDATE user_plans SET is_admin = true WHERE user_id = '<jouw-user-id>';
-- ============================================

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- RLS policy: admins mogen elkaars admin-vlag zien (voor checks)
CREATE POLICY "Admins can view all user plans"
  ON user_plans FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
