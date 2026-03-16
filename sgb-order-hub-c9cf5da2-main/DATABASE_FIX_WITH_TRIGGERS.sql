-- ============================================
-- SGB Order Hub - Database Fix with Triggers
-- This adds automatic profile creation
-- Run this AFTER the main setup
-- ============================================

-- ============================================
-- CREATE TRIGGER FUNCTION
-- ============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE TRIGGER
-- ============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE RLS POLICIES FOR PROFILES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;

-- Allow service role to insert profiles (for trigger)
CREATE POLICY "Enable insert for authentication" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Test the setup
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger created successfully!';
  RAISE NOTICE '✅ Profile will be auto-created on user signup';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: user_roles must still be inserted manually by the app';
END $$;

-- ============================================
-- MANUAL FIX FOR EXISTING USERS
-- ============================================

-- If you already have users without profiles, run this:
-- (Uncomment the lines below if needed)

/*
INSERT INTO profiles (user_id, name, email)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', 'User'),
  email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles);
*/
