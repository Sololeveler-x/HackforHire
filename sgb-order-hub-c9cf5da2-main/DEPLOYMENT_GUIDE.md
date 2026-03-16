# 🚀 Deployment Guide - SGB Order Hub

## 📋 Pre-Deployment Checklist

Before deploying, ensure:
- [ ] Database setup completed (`supabase-setup.sql` executed)
- [ ] All environment variables configured
- [ ] Application tested locally
- [ ] Test users created for all roles
- [ ] Complete workflow tested
- [ ] No console errors
- [ ] Mobile responsiveness verified

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

#### Step 1: Prepare Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - SGB Order Hub"

# Push to GitHub
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

#### Step 3: Environment Variables
Add in Vercel dashboard:
```
VITE_SUPABASE_PROJECT_ID=bmpdxpqvjdhukaupczji
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://bmpdxpqvjdhukaupczji.supabase.co
```

#### Step 4: Deploy
- Click "Deploy"
- Wait for build to complete
- Your app will be live at `your-project.vercel.app`

---

### Option 2: Netlify

#### Step 1: Build Settings
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy
1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select repository
5. Add environment variables
6. Deploy

---

### Option 3: Self-Hosted (VPS/Cloud)

#### Requirements
- Ubuntu 20.04+ or similar
- Node.js 18+
- Nginx
- SSL certificate (Let's Encrypt)

#### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Deploy Application
```bash
# Clone repository
cd /var/www
git clone YOUR_REPO_URL sgb-order-hub
cd sgb-order-hub/sgb-order-hub-c9cf5da2-main

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Build application
npm run build
```

#### Step 3: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/sgb-order-hub
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/sgb-order-hub/sgb-order-hub-c9cf5da2-main/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/sgb-order-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Environment Configuration

### Production Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=https://your-project.supabase.co

# Optional: Analytics
VITE_GA_TRACKING_ID=your_google_analytics_id
```

### Supabase Production Settings

#### 1. Enable Email Confirmations (Optional)
```
Supabase Dashboard → Authentication → Settings
- Enable email confirmations
- Configure email templates
```

#### 2. Configure Auth Providers
```
Supabase Dashboard → Authentication → Providers
- Email: Enabled
- Configure redirect URLs
```

#### 3. Add Production URL
```
Supabase Dashboard → Authentication → URL Configuration
- Site URL: https://your-domain.com
- Redirect URLs: https://your-domain.com/**
```

#### 4. Database Backups
```
Supabase Dashboard → Database → Backups
- Enable automatic backups
- Set backup schedule
```

---

## 🔒 Security Hardening

### 1. Environment Variables
- Never commit `.env` to git
- Use platform-specific secret management
- Rotate keys regularly

### 2. Supabase Security
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should show rowsecurity = true
```

### 3. HTTPS Only
- Force HTTPS in production
- Use HSTS headers
- Configure CSP headers

### 4. Rate Limiting
Configure in Supabase:
```
Dashboard → Settings → API
- Enable rate limiting
- Set appropriate limits
```

---

## 📊 Post-Deployment Tasks

### 1. Create Admin User
```bash
# Register first admin user through UI
# Or via Supabase SQL:
INSERT INTO user_roles (user_id, role) 
VALUES ('user_uuid_here', 'admin');
```

### 2. Add Real Products
```sql
-- Remove sample products if needed
DELETE FROM products;

-- Add your real products
INSERT INTO products (product_name, category, price, description, stock)
VALUES 
('Your Product 1', 'Category', 1000.00, 'Description', 50),
('Your Product 2', 'Category', 2000.00, 'Description', 30);
```

### 3. Configure Email Notifications (Optional)
Set up email templates in Supabase for:
- Order confirmations
- Status updates
- User invitations

### 4. Set Up Monitoring
- Enable Supabase monitoring
- Set up error tracking (Sentry)
- Configure uptime monitoring
- Set up analytics (Google Analytics)

---

## 🧪 Production Testing

### Test Checklist
- [ ] All 4 roles can login
- [ ] Billing can create orders
- [ ] Packing can mark as packed
- [ ] Shipping can ship orders
- [ ] Admin sees analytics
- [ ] Charts render correctly
- [ ] Mobile responsive
- [ ] HTTPS working
- [ ] No console errors
- [ ] Database queries optimized

### Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test homepage
ab -n 1000 -c 10 https://your-domain.com/

# Test API endpoints
ab -n 100 -c 5 https://your-domain.com/api/orders
```

---

## 📈 Performance Optimization

### 1. Enable Caching
```nginx
# In Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Enable Compression
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 3. Database Optimization
```sql
-- Add indexes if needed
CREATE INDEX idx_orders_customer ON orders(customer_name);
CREATE INDEX idx_products_category ON products(category);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE order_status = 'shipped';
```

### 4. CDN (Optional)
- Use Cloudflare for static assets
- Enable caching rules
- Configure page rules

---

## 🔄 Continuous Deployment

### GitHub Actions (Vercel)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🐛 Troubleshooting

### Issue: Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Environment Variables Not Working
- Ensure variables start with `VITE_`
- Restart dev server after changes
- Check platform-specific variable syntax

### Issue: Database Connection Fails
- Verify Supabase URL and keys
- Check RLS policies
- Verify network connectivity

### Issue: Charts Not Rendering
- Check data is available
- Verify Recharts is installed
- Check browser console for errors

---

## 📞 Support & Maintenance

### Regular Maintenance
- [ ] Weekly: Check error logs
- [ ] Monthly: Review database performance
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Quarterly: Backup verification

### Monitoring Tools
- Supabase Dashboard (built-in)
- Vercel Analytics (if using Vercel)
- Google Analytics
- Sentry (error tracking)
- UptimeRobot (uptime monitoring)

---

## 🎉 Deployment Complete!

Your SGB Order Hub is now live and ready for production use!

### Next Steps:
1. ✅ Share URL with team
2. ✅ Create user accounts
3. ✅ Add real products
4. ✅ Start processing orders
5. ✅ Monitor performance
6. ✅ Gather user feedback

**Congratulations! 🚀**
