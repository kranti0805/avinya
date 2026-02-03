-- Fix Profiles RLS Policy
-- The previous policy only allowed users to see their OWN profile.
-- This prevented managers from seeing employee names (hence "Unknown").

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);
