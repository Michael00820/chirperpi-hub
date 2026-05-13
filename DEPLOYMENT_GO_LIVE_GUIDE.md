# Complete Deployment & Go-Live Guide

## 🚀 Critical Fixes Applied

### ✅ Fix 1: server/package.json Syntax Error
**Line 10**: Missing comma after `"test:integration": "jest --runInBand"`
- **Status**: FIXED
- **Impact**: This was preventing all CI/CD builds
- **Result**: npm install and npm run build now work

### ✅ Fix 2: vercel.json SPA Configuration
**Missing File**: No SPA routing configuration
- **Status**: CREATED
- **Impact**: Direct URL access would return 404 errors
- **Result**: All routes now properly rewrite to /index.html

### ✅ Fix 3: Environment Variables
**Status**: VERIFIED & EXPANDED
- `server/.env.example` - 60+ variables documented
- `client/.env.example` - All VITE_ variables included

---

## 🎯 Step-by-Step Deployment Guide

### PHASE 1: Backend Deployment (Railway)

#### Step 1.1: Create Railway Account & Project
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"

#### Step 1.2: Connect GitHub Repository
1. Click "Connect GitHub"
2. Authorize Railway app
3. Select `Michael00820/chirperpi-hub`
4. Click "Deploy"

#### Step 1.3: Create PostgreSQL Database
1. In Railway Dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Wait 2 minutes for deployment
4. Click PostgreSQL service → "Connect" tab
5. Copy the connection string → save as `DATABASE_URL`

#### Step 1.4: Create Redis Cache
1. Click "New" again
2. Select "Database" → "Redis"
3. Wait for deployment
4. Copy connection URL → save as `REDIS_URL`

#### Step 1.5: Configure Environment Variables
In Railway → Your Project → Server Service → Variables tab:

```
# Core Application
NODE_ENV=production
PORT=3001

# Database & Cache (from steps above)
DATABASE_URL=postgresql://user:password@host:5432/db
REDIS_URL=redis://default:password@host:6379

# Authentication Secrets (generate new)
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Frontend URL
FRONTEND_URL=https://your-vercel-domain.vercel.app
CLIENT_URL=https://your-vercel-domain.vercel.app

# Pi Network (from Pi Developer Portal)
PI_API_KEY=your_pi_api_key
PI_API_SECRET=your_pi_api_secret
PI_OAUTH_ID=your_oauth_client_id
PI_OAUTH_SECRET=your_oauth_client_secret
PI_PLATFORM_API_URL=https://api.pi.network

# File Storage (Optional - Pinata)
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret

# Error Tracking (Optional - Sentry)
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

#### Step 1.6: Configure Build & Start Commands
1. Go to Server Service → Deployments tab
2. Click "Settings"
3. Set:
   - **Build Command**: `npm run build --workspaces`
   - **Start Command**: `npm --prefix server start`

#### Step 1.7: Get Public Domain
1. Server Service → Settings → "Public Networking"
2. Click "Generate Domain"
3. Copy auto-generated domain (e.g., `chirperpi-api-prod.railway.app`)
4. Update `API_URL` variable with this domain

#### Step 1.8: Deploy
1. Make any commit and push to `main`:
   ```bash
   git add .
   git commit -m "deploy: ready for production"
   git push origin main
   ```
2. Watch deployment in Railway Dashboard
3. Should see "Server listening on port 3001" in logs

#### Step 1.9: Verify Backend
```bash
curl https://your-railway-domain.railway.app/api/health
# Should return 200 status
```

---

### PHASE 2: Frontend Deployment (Vercel)

#### Step 2.1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub

#### Step 2.2: Import Repository
1. Click "Add New..." → "Project"
2. Click "Import Git Repository"
3. Find `chirperpi-hub`
4. Click "Import"

#### Step 2.3: Configure Project Settings
1. **Framework Preset**: Select "Vite"
2. **Root Directory**: `./client`
3. **Build Command**: `npm run build` (should auto-fill)
4. **Output Directory**: `dist` (should auto-fill)
5. **Install Command**: `npm ci --workspaces`
6. Click "Deploy"

#### Step 2.4: Add Environment Variables
1. After deployment, go to Settings → "Environment Variables"
2. Add:
   ```
   VITE_API_URL=https://your-railway-domain.railway.app/api
   VITE_INFURA_PROJECT_ID=your_infura_id
   VITE_INFURA_PROJECT_SECRET=your_infura_secret
   ```
3. Save and redeploy

#### Step 2.5: Redeploy with Environment Variables
1. Go to "Deployments" tab
2. Click latest deployment
3. Click "Redeploy"
4. Wait for build to complete (2-3 minutes)

#### Step 2.6: Get Frontend URL
1. After deployment, copy the URL shown (e.g., `https://chirperpi-hub.vercel.app`)
2. Update Railway `FRONTEND_URL` with this URL

#### Step 2.7: Verify Frontend
1. Visit your Vercel URL in browser
2. Should see ChirperPi Hub home page
3. Open DevTools (F12) → Network tab
4. Test any action (e.g., load page)
5. Should see requests to your Railway API domain

---

### PHASE 3: Custom Domains (Optional)

#### For Backend (Railway)
1. Railway Dashboard → Server Service → Settings
2. "Public Networking" → "Add Custom Domain"
3. Enter `api.yourcompany.com`
4. Point DNS CNAME to provided Railway address
5. SSL auto-generates (5-10 min)

#### For Frontend (Vercel)
1. Vercel Project → Settings → "Domains"
2. Click "Add"
3. Enter `yourcompany.com`
4. Follow DNS configuration
5. SSL auto-generates

---

### PHASE 4: Post-Deployment Verification

#### Backend Tests
- [ ] API responds: `curl https://api.railway.app/api/health`
- [ ] Database connected: Check Railway logs
- [ ] Redis connected: Check Railway logs
- [ ] All environment variables loaded: No errors in logs

#### Frontend Tests
- [ ] Frontend loads without errors
- [ ] API requests work (check Network tab)
- [ ] No CORS errors
- [ ] Login flow works
- [ ] Direct URL access works (e.g., `/profile/username`)

#### Security Tests
- [ ] HTTPS redirects work
- [ ] Security headers present (check response headers)
- [ ] No mixed content warnings
- [ ] Rate limiting working

---

## 📋 Pre-Launch Checklist

- [ ] All 60+ server environment variables set in Railway
- [ ] All client environment variables set in Vercel
- [ ] Database migrations run successfully
- [ ] Backend deployed and responding
- [ ] Frontend deployed and accessible
- [ ] API connection working (test via Network tab)
- [ ] Login flow tested with Pi Network
- [ ] Core features tested (posts, comments, follows)
- [ ] SSL certificates active on both services
- [ ] Monitoring setup (Sentry for errors)
- [ ] Backups enabled (Railway PostgreSQL)

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is unique and strong (32+ chars)
- [ ] SESSION_SECRET is unique and strong (32+ chars)
- [ ] Database password is strong
- [ ] Redis password is set
- [ ] HTTPS enforced on both services
- [ ] CORS limited to your frontend domain
- [ ] Rate limiting active (100/min general, 10/min auth)
- [ ] XSS sanitization enabled
- [ ] CSRF protection enabled
- [ ] SQL injection prevention verified

---

## 🚨 Troubleshooting

### Build Fails with "package.json parse error"
- **Fix**: The comma issue has been fixed. Redeploy.

### Frontend returns 404 on direct URLs
- **Fix**: The `vercel.json` file has been created. Redeploy.

### CORS errors in browser console
- **Problem**: API domain doesn't match FRONTEND_URL
- **Fix**: Update FRONTEND_URL in Railway to exact Vercel domain

### "Cannot connect to database"
- **Fix**: Verify DATABASE_URL is set in Railway variables
- **Fix**: Ensure PostgreSQL service is running

### "Cannot connect to Redis"
- **Fix**: Verify REDIS_URL is set in Railway variables
- **Fix**: Ensure Redis service is running

### PI OAuth not working
- **Fix**: Verify PI_OAUTH_ID and PI_OAUTH_SECRET in Railway
- **Fix**: Add your Vercel domain to Pi Developer Portal authorized domains

---

## 📞 After Going Live

### Weekly
- Check Railway server logs for errors
- Monitor error rate in Sentry
- Review API response times

### Monthly
- Update dependencies for security patches
- Review rate limiting metrics
- Backup database manually (Railway auto-backups too)

### Quarterly
- Rotate JWT secrets
- Security audit
- Performance analysis

---

## 🎉 You're Done!

Your app is now:
- ✅ Deployed to Railway (backend)
- ✅ Deployed to Vercel (frontend)
- ✅ Secured with industry-standard security
- ✅ Monitored with error tracking
- ✅ Backed up automatically

**Live URL**: https://your-vercel-domain.vercel.app  
**API URL**: https://your-railway-domain.railway.app  
**Admin Dashboard**: Railway & Vercel dashboards

Go live with confidence! 🚀

