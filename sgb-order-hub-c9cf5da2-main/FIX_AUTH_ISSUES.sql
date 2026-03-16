-- ============================================================
-- FIX 1: Allow users to insert their own role on registration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop conflicting policies if any
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role insert on signup" ON public.user_roles;

-- Allow authenticated users to insert their own role
CREATE POLICY "Users can insert own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own role
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- FIX 2: Delete a stuck user from Auth (replace the UUID below)
-- Go to Supabase Dashboard → Authentication → Users
-- Find the user, copy their UUID, paste below
-- ============================================================

-- DELETE FROM auth.users WHERE email = 'jacob17181@gmail.com';
-- (Uncomment and run if needed — or just delete from the Auth UI)

-- ============================================================
-- FIX 3: Manually assign role to existing user (if needed)
-- Replace the UUID with the actual user_id from auth.users
-- ============================================================

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('paste-user-uuid-here', 'sales_agent')
-- ON CONFLICT (user_id, role) DO NOTHING;
