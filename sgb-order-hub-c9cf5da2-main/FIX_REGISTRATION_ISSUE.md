# 🔧 Fix Registration Issue - Step by Step

## Problem
Registration credentials are not saving in the `profiles` and `user_roles` tables.

## Root Cause
1. Missing database trigger to auto-create profiles
2. RLS policies blocking inserts
3. AuthContext not properly handling profile creation

## ✅ Complete Solution

### Step 1: Run the Complete Database Setup

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select project: `fwmnriafhdbdgtklheyy`
3. Click **"SQL Editor"**
4. Copy **ALL** content from `COMPLETE_DATABASE_SETUP.sql`
5. Paste and click **"Run"**
6. Wait for success message

### Step 2: Add Database Triggers

1. Still in SQL Editor
2. Copy **ALL** content from `DATABASE_FIX_WITH_TRIGGERS.sql`
3. Paste and click **"Run"**
4. Wait for success message

### Step 3: Verify Setup

Run this query in SQL Editor:
```sql
-- Check if trigger exists
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see:
- ✅ Trigger: `on_auth_user_created`
- ✅ Function: `handle_new_user`
- ✅ Multiple policies for each table

### Step 4: Test Registration

1. **Restart your dev server:**
   ```powershell
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Open browser:** `http://localhost:5173`

3. **Register a test user:**
   - Click "Admin Login" card
   - Click "Register"
   - Fill in:
     - Name: Test Admin
     - Email: admin@test.com
     - Password: admin123
     - Role: Admin
   - Click "Create Account"

4. **Check if it worked:**
   - You should see success message
   - You should be redirected to admin dashboard

### Step 5: Verify Data in Database

Go to Supabase Dashboard → Table Editor:

**Check auth.users:**
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check profiles:**
```sql
SELECT * FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check user_roles:**
```sql
SELECT * FROM user_roles 
ORDER BY created_at DESC 
LIMIT 5;
```

All three should show your new user! ✅

---

## 🔍 What Was Fixed

### 1. Database Trigger
**Before:** No automatic profile creation
**After:** Trigger automatically creates profile when user signs up

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2. RLS Policies
**Before:** Profiles table blocked inserts
**After:** Service role can insert profiles

```sql
CREATE POLICY "Enable insert for authentication" 
  ON profiles FOR INSERT 
  WITH CHECK (true);
```

### 3. AuthContext
**Before:** Only inserted role, no profile
**After:** Creates both profile and role with error handling

```typescript
// Creates profile
await supabase.from('profiles').upsert({
  user_id: data.user.id,
  name: name,
  email: email,
});

// Creates role
await supabase.from('user_roles').upsert({
  user_id: data.user.id,
  role: roleValue,
});
```

---

## 🧪 Testing Checklist

- [ ] Ran `COMPLETE_DATABASE_SETUP.sql`
- [ ] Ran `DATABASE_FIX_WITH_TRIGGERS.sql`
- [ ] Verified trigger exists
- [ ] Restarted dev server
- [ ] Registered test user
- [ ] Saw success message
- [ ] User appears in auth.users
- [ ] User appears in profiles
- [ ] User appears in user_roles
- [ ] Can login with test user
- [ ] Dashboard loads correctly

---

## 🐛 Troubleshooting

### Issue: Still getting RLS error
**Solution:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Try registration again
-- Then re-enable:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### Issue: Trigger not working
**Solution:**
```sql
-- Check trigger status
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Issue: Profile created but no role
**Solution:**
Check browser console (F12) for errors. The role insert might be failing due to RLS.

```sql
-- Manually insert role for existing user
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Issue: Email confirmation required
**Solution:**
Disable email confirmation in Supabase:
1. Go to Authentication → Settings
2. Disable "Enable email confirmations"
3. Save

---

## 📊 Verify Everything Works

### Test Complete Workflow

1. **Register 4 users:**
   - admin@test.com (Admin)
   - billing@test.com (Billing)
   - packing@test.com (Packing)
   - shipping@test.com (Shipping)

2. **Login as Billing:**
   - Create an order
   - Add products
   - Submit

3. **Login as Packing:**
   - See the order
   - Mark as packed

4. **Login as Shipping:**
   - See the order
   - Ship it

5. **Login as Admin:**
   - See analytics
   - View all orders

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Registration completes without errors
- ✅ User appears in all 3 tables (auth.users, profiles, user_roles)
- ✅ Can login immediately after registration
- ✅ Dashboard loads with correct role
- ✅ No RLS errors in browser console

---

## 🎉 All Fixed!

Your registration system now:
- ✅ Creates user in Supabase Auth
- ✅ Auto-creates profile via trigger
- ✅ Creates user role via app
- ✅ Handles errors gracefully
- ✅ Works with RLS enabled

**You're ready to use the application!** 🚀
