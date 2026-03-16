# 🔧 Troubleshooting Guide - SGB Order Hub

## ⚠️ Common Issues and Solutions

### 1. TypeScript Module Errors

**Error:**
```
Cannot find module 'react' or its corresponding type declarations
Cannot find module 'lucide-react' or its corresponding type declarations
```

**Solution:**
These errors appear before running `npm install`. They are expected and will be resolved automatically.

```bash
# Run this command to install all dependencies
npm install

# If errors persist, try:
rm -rf node_modules package-lock.json
npm install
```

---

### 2. Supabase Connection Errors

**Error:**
```
Failed to connect to Supabase
Invalid API key
```

**Solution:**
1. Verify your `.env` file has the correct credentials:
```env
VITE_SUPABASE_PROJECT_ID="fwmnriafhdbdgtklheyy"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xdgTOLxRK9umcQWpd_eCmA_mLBSASCi"
VITE_SUPABASE_URL="https://fwmnriafhdbdgtklheyy.supabase.co"
```

2. Restart the dev server:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

3. Check Supabase dashboard:
   - Go to https://supabase.com/dashboard
   - Verify project ID matches
   - Check API keys in Settings → API

---

### 3. Database Tables Not Found

**Error:**
```
relation "products" does not exist
relation "orders" does not exist
```

**Solution:**
You need to run the database setup script:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `fwmnriafhdbdgtklheyy`
3. Click "SQL Editor" in the left sidebar
4. Open `supabase-setup.sql` file
5. Copy ALL content (Ctrl+A, Ctrl+C)
6. Paste in SQL Editor
7. Click "Run" button
8. Wait for "Success" message

---

### 4. No Products Showing

**Error:**
Products dropdown is empty or no products on home page

**Solution:**
The sample products are inserted by the `supabase-setup.sql` script.

```sql
-- Run this in Supabase SQL Editor to verify:
SELECT COUNT(*) FROM products;

-- Should return 20

-- If it returns 0, run the INSERT statements from supabase-setup.sql
```

---

### 5. Login Fails / Authentication Errors

**Error:**
```
Invalid login credentials
User not found
```

**Solution:**

**Option 1: Register a new user**
1. Click "Register" on login page
2. Fill in details
3. Select role
4. Submit

**Option 2: Check Supabase Auth**
1. Go to Supabase Dashboard → Authentication → Users
2. Verify user exists
3. Check if email is confirmed
4. Try password reset if needed

**Option 3: Check user_roles table**
```sql
-- Verify user has a role assigned
SELECT * FROM user_roles;

-- If empty, assign role manually:
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin');
```

---

### 6. Role-Based Access Not Working

**Error:**
User can't access their dashboard or sees "Unauthorized"

**Solution:**

1. **Check RLS Policies:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

2. **Check user role:**
```sql
SELECT get_user_role('USER_UUID_HERE');
```

3. **Logout and login again:**
   - Sometimes the role cache needs refresh
   - Click logout
   - Login again

---

### 7. Charts Not Displaying

**Error:**
Charts show empty or don't render

**Solution:**

1. **Create test data:**
   - You need at least one order for charts to display
   - Login as Billing user
   - Create a test order

2. **Check browser console:**
   - Press F12
   - Look for JavaScript errors
   - Recharts requires data in specific format

3. **Verify data exists:**
```sql
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;
```

---

### 8. Build Errors

**Error:**
```
npm run build fails
Type errors during build
```

**Solution:**

1. **Check TypeScript errors:**
```bash
npm run build
# Read the error messages
```

2. **Common fixes:**
```bash
# Clear cache
rm -rf node_modules .vite dist
npm install
npm run build
```

3. **Skip type checking (temporary):**
```bash
# Edit package.json
"build": "vite build --mode production"
```

---

### 9. Port Already in Use

**Error:**
```
Port 5173 is already in use
```

**Solution:**

**Option 1: Kill the process**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9
```

**Option 2: Use different port**
```bash
npm run dev -- --port 3000
```

---

### 10. Image Not Loading (hero-bg.jpg)

**Error:**
Hero background image doesn't show

**Solution:**

1. **Check if image exists:**
```bash
ls src/assets/hero-bg.jpg
```

2. **If missing, add a placeholder:**
```typescript
// In Home.tsx, replace:
import heroBg from '@/assets/hero-bg.jpg';

// With:
const heroBg = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920';
```

3. **Or use solid color:**
```typescript
// Remove the background image div
// Keep only the gradient
```

---

### 11. Slow Performance

**Issue:**
Application is slow or laggy

**Solution:**

1. **Check database indexes:**
```sql
-- Verify indexes exist
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

2. **Optimize queries:**
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
```

3. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cache and cookies
   - Reload page

---

### 12. CORS Errors

**Error:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:**

1. **Check Supabase URL configuration:**
   - Go to Supabase Dashboard → Settings → API
   - Add your domain to allowed origins

2. **For local development:**
   - Should work automatically with localhost
   - Check if using correct URL in `.env`

---

### 13. Deployment Issues

**Error:**
Build works locally but fails in production

**Solution:**

1. **Environment variables:**
   - Ensure all `VITE_*` variables are set in deployment platform
   - Variables must start with `VITE_` to be accessible

2. **Build command:**
```bash
npm run build
```

3. **Output directory:**
```
dist/
```

4. **Redirects (for SPA):**
   - Vercel: Automatic
   - Netlify: Add `netlify.toml`
   - Others: Configure redirect rules

---

### 14. Database Connection Timeout

**Error:**
```
Connection timeout
Could not connect to database
```

**Solution:**

1. **Check Supabase status:**
   - Visit https://status.supabase.com
   - Check if there are any outages

2. **Check project status:**
   - Go to Supabase Dashboard
   - Verify project is active (not paused)

3. **Check connection pooling:**
   - Supabase has connection limits
   - Free tier: 60 connections
   - Upgrade if needed

---

### 15. TypeScript Strict Mode Errors

**Error:**
Strict type checking errors

**Solution:**

The project is configured with `strict: false` for easier development.

If you want to enable strict mode:

1. Edit `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

2. Fix type errors one by one

---

## 🆘 Still Having Issues?

### Debug Checklist

- [ ] Ran `npm install`
- [ ] Ran `supabase-setup.sql` in Supabase SQL Editor
- [ ] Verified `.env` file has correct credentials
- [ ] Restarted dev server
- [ ] Checked browser console for errors (F12)
- [ ] Checked Supabase logs
- [ ] Verified database tables exist
- [ ] Verified RLS policies are enabled
- [ ] Created at least one test user
- [ ] Assigned role to test user

### Get Help

1. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Look for red errors
   - Copy error message

2. **Check Supabase logs:**
   - Go to Supabase Dashboard
   - Click "Logs" in sidebar
   - Look for errors

3. **Check network tab:**
   - Press F12
   - Go to Network tab
   - Look for failed requests (red)
   - Check request/response

### Useful Commands

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Clear all caches
rm -rf node_modules package-lock.json .vite dist
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

---

## ✅ Verification Steps

After fixing issues, verify everything works:

1. **Home page loads** ✓
2. **Products display** ✓
3. **Role cards clickable** ✓
4. **Can register new user** ✓
5. **Can login** ✓
6. **Dashboard loads** ✓
7. **Can create order (Billing)** ✓
8. **Can mark as packed (Packing)** ✓
9. **Can ship order (Shipping)** ✓
10. **Charts display (Admin)** ✓

---

**Last Updated**: March 2026  
**Version**: 1.0.0
