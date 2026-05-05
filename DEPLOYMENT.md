# ChirperPi Hub Deployment Guide

A complete step-by-step guide to deploying ChirperPi Hub to production with Railway (backend) and Vercel (frontend).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Backend Deployment (Railway)](#backend-deployment-railway)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Pi Network Integration](#pi-network-integration)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Monitoring & Observability](#monitoring--observability)
9. [Rollback Instructions](#rollback-instructions)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Accounts Required

- [ ] **GitHub Account** (for source control) - [github.com](https://github.com)
- [ ] **Railway Account** (backend hosting) - [railway.app](https://railway.app)
- [ ] **Vercel Account** (frontend hosting) - [vercel.com](https://vercel.com)
- [ ] **Pi Network Account** (for OAuth setup) - [pi.network](https://pi.network)
- [ ] **Slack Workspace** (optional, for notifications) - [slack.com](https://slack.com)

### Local Development Setup

Ensure you have these installed and working:

```bash
# Check Node.js version (must be 18.x or higher)
node --version    # Should be v18.x.x or v20.x.x

# Check npm version (should be 9+)
npm --version     # Should be 9.x.x or higher

# Check Git is installed
git --version     # Should be 2.x.x or higher
```

If any of these are missing:
- **Node.js**: Download from [nodejs.org](https://nodejs.org) (LTS version)
- **Git**: Download from [git-scm.com](https://git-scm.com)

### Access Required

- [ ] Admin access to GitHub repository
- [ ] Ability to create new projects on Railway
- [ ] Ability to create new projects on Vercel
- [ ] Access to Pi Developer Portal

---

## Environment Variables

### Complete Environment Variables Table

| Variable | Service | Where to Get | Required | Example |
|----------|---------|-------------|----------|---------|
| **DATABASE_URL** | Server | Railway PostgreSQL | Yes | `postgresql://user:pass@host:5432/db` |
| **REDIS_URL** | Server | Railway Redis | Yes | `redis://default:pass@host:6379` |
| **NODE_ENV** | Server | Set manually | Yes | `production` |
| **PORT** | Server | Set manually | Yes | `3001` |
| **JWT_SECRET** | Server | Generate new | Yes | `your-secret-key-min-32-chars` |
| **API_URL** | Server | Railway domain | Yes | `https://api.chirperpi.app` |
| **PI_API_KEY** | Server | Pi Dev Portal | Yes | See [Pi Network Integration](#pi-network-integration) |
| **PI_API_SECRET** | Server | Pi Dev Portal | Yes | See [Pi Network Integration](#pi-network-integration) |
| **PI_OAUTH_ID** | Server | Pi Dev Portal | Yes | See [Pi Network Integration](#pi-network-integration) |
| **PI_OAUTH_SECRET** | Server | Pi Dev Portal | Yes | See [Pi Network Integration](#pi-network-integration) |
| **VITE_API_URL** | Client | Server URL | Yes | `https://api.chirperpi.app/api` |
| **VITE_APP_NAME** | Client | Set manually | No | `PiConnect` |
| **IPFS_GATEWAY** | Server | Pinata or public | No | `https://gateway.pinata.cloud` |
| **PINATA_API_KEY** | Server | Pinata account | No | For file uploads |
| **PINATA_API_SECRET** | Server | Pinata account | No | For file uploads |
| **SENTRY_DSN** | Server | Sentry project | No | For error tracking |
| **VITE_SENTRY_DSN** | Client | Sentry project | No | For client error tracking |
| **SLACK_WEBHOOK** | Server | Slack channel | No | For notifications |

### Environment Variables by Service

#### Server Environment Variables
```bash
# Database & Cache
DATABASE_URL=postgresql://user:password@host:5432/chirperpi
REDIS_URL=redis://default:password@host:6379

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=your-32-character-minimum-secret-key
API_URL=https://your-api-domain.railway.app

# Pi Network OAuth
PI_API_KEY=your-pi-api-key
PI_API_SECRET=your-pi-api-secret
PI_OAUTH_ID=your-pi-oauth-app-id
PI_OAUTH_SECRET=your-pi-oauth-app-secret

# Optional - File Storage
IPFS_GATEWAY=https://gateway.pinata.cloud
PINATA_API_KEY=your-pinata-key
PINATA_API_SECRET=your-pinata-secret

# Optional - Error Tracking
SENTRY_DSN=https://key@sentry.io/projectid

# Optional - Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Client Environment Variables
```bash
# API Configuration
VITE_API_URL=https://your-api-domain.railway.app/api

# Optional - App Branding
VITE_APP_NAME=PiConnect
VITE_APP_VERSION=1.0.0

# Optional - Error Tracking
VITE_SENTRY_DSN=https://key@sentry.io/projectid
```

---

## Database Setup

### Phase 1: Create PostgreSQL Database on Railway

1. **Log into Railway**
   ```bash
   # Open Railway dashboard
   # https://railway.app/dashboard
   ```

2. **Create New Project**
   - Click "New Project"
   - Select "Database"
   - Choose "PostgreSQL"
   - Wait for database to deploy (~2 minutes)

3. **Get Database Connection String**
   - In Railway project, click PostgreSQL service
   - Go to "Connect" tab
   - Copy the connection string (includes password)
   - Should look like: `postgresql://user:password@host:port/database`

### Phase 2: Run Database Migrations

Migrations create all necessary tables and schemas.

1. **Set up local environment**
   ```bash
   # Navigate to project root
   cd /path/to/chirperpi-hub

   # Install dependencies
   npm install

   # Create .env.production file with your DATABASE_URL
   echo "DATABASE_URL=postgresql://your:password@host:port/db" > server/.env.production
   ```

2. **Run migrations on production database**
   ```bash
   # Option A: If connected directly to production
   npm --prefix server run migrate

   # Option B: If migrations fail, run SQL manually
   # Get the migration files from server/migrations/
   # Copy-paste each SQL file into Railway PostgreSQL console
   ```

3. **Verify migrations succeeded**
   ```bash
   # Connect to production database and check tables
   psql $DATABASE_URL -c "\dt"
   
   # Should show tables like: users, posts, follows, groups, etc.
   ```

### Phase 3: Database Backups

Railway automatically backs up PostgreSQL databases:
- **Automatic backups**: Daily, kept for 30 days
- **Manual backup**: Via Railway dashboard
- **Restore**: Available in Railway → PostgreSQL → Backups

To restore from backup:
1. Go to Railway project → PostgreSQL service
2. Click "Backups" tab
3. Select desired backup date/time
4. Click "Restore"

### Switching from SQLite to PostgreSQL

If you're migrating from development SQLite:

```bash
# 1. Export data from SQLite (optional, for migration)
# This creates a SQL dump of your development database
sqlite3 dev.db .dump > dev_data.sql

# 2. Create new PostgreSQL database (done above)

# 3. Load data into PostgreSQL (optional)
psql $DATABASE_URL -f dev_data.sql

# 4. Run current migrations on top
npm --prefix server run migrate

# 5. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

---

## Backend Deployment (Railway)

### Step 1: Connect GitHub Repository to Railway

1. **Go to Railway Dashboard**
   - Open [railway.app/dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Authorize Railway with GitHub**
   - Click "Connect GitHub"
   - Authorize Railway app in GitHub
   - Select your `chirperpi-hub` repository
   - Click "Deploy"

3. **Configure Build Settings**
   - Railway auto-detects Node.js project
   - Build command: `npm run build --workspaces`
   - Start command: `npm --prefix server start`

### Step 2: Set Environment Variables in Railway

1. **In Railway Project, Click Server Service**

2. **Go to Variables Tab**
   - Click "New Variable"
   - Add each required variable from the [Environment Variables](#environment-variables) table
   
3. **Paste Each Variable**
   ```
   DATABASE_URL = postgresql://user:pass@host:port/db
   REDIS_URL = redis://default:pass@host:port
   NODE_ENV = production
   PORT = 3001
   JWT_SECRET = (generate with: openssl rand -base64 32)
   API_URL = https://your-api-domain.railway.app
   PI_OAUTH_ID = (from Pi Developer Portal)
   PI_OAUTH_SECRET = (from Pi Developer Portal)
   PI_API_KEY = (from Pi Developer Portal)
   PI_API_SECRET = (from Pi Developer Portal)
   ```

4. **Save Variables**
   - Each variable is automatically added
   - Railway shows which variables are set

### Step 3: Set Custom Domain

1. **In Railway Project, Click Server Service**

2. **Go to Settings Tab**
   - Scroll down to "Public Networking"
   - Click "Generate Domain" or "Add Custom Domain"

3. **For Public Railway Domain** (easiest)
   - Copy auto-generated domain (looks like `chirperpi-api-prod.railway.app`)
   - Update `API_URL` environment variable with this domain
   - Update client `VITE_API_URL` with `https://domain/api`

4. **For Custom Domain** (optional)
   - Add your domain (e.g., `api.chirperpi.app`)
   - Point DNS to Railway's provided CNAME
   - Wait for DNS propagation (~5-10 minutes)
   - SSL certificate auto-generates

### Step 4: Deploy

1. **Trigger First Deployment**
   - Push code to `main` branch
   - Railway auto-detects and deploys
   - Watch deployment logs in Railway dashboard
   - Takes ~3-5 minutes

2. **View Deployment Logs**
   - In Railway: Project → Server Service → Deployments
   - Click latest deployment
   - Expand logs to see build/start output
   - Look for "Server listening on port 3001" message

3. **Verify Server is Running**
   ```bash
   # Test API endpoint (replace with your domain)
   curl https://your-api-domain.railway.app/api/health
   
   # Should return 200 status and possibly health data
   ```

### Step 5: Set Up Health Check (Optional)

Railway can monitor your service health:

1. **In Railway, Click Server Service**
2. **Go to Settings → Health Checks**
3. **Enable Health Checks**
   - URL: `https://your-api-domain.railway.app/api/health`
   - Interval: 30 seconds
   - Timeout: 10 seconds
4. **Save**

---

## Frontend Deployment (Vercel)

### Step 1: Connect GitHub to Vercel

1. **Go to Vercel Dashboard**
   - Open [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Click "Import Git Repository"

2. **Select Repository**
   - Find `chirperpi-hub` in the list
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./client`
   - **Build Command**: `npm run build` (should auto-populate)
   - **Output Directory**: `dist` (should auto-populate)
   - **Install Command**: `npm ci --workspaces`
   - Click "Deploy"

### Step 2: Set Environment Variables

1. **In Vercel Project, Go to Settings**

2. **Click Environment Variables**

3. **Add Client Variables**
   ```
   VITE_API_URL = https://your-api-domain.railway.app/api
   VITE_APP_NAME = PiConnect
   ```

4. **Redeploy**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push new commit to trigger redeploy

### Step 3: Configure SPA Routing (Rewrites)

React SPA needs routing configuration so direct URL access works:

1. **Create `vercel.json` in project root**
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. **Commit and Push**
   ```bash
   git add vercel.json
   git commit -m "chore: add Vercel SPA routing config"
   git push origin main
   ```

3. **Verify**
   - Vercel auto-redeploys
   - Test direct URLs work (e.g., `/profile/username`)

### Step 4: Set Custom Domain (Optional)

1. **In Vercel Project, Go to Settings → Domains**

2. **Add Domain**
   - Enter your domain (e.g., `chirperpi.app`)
   - Follow DNS configuration steps
   - SSL certificate auto-generates

3. **Verify DNS**
   ```bash
   # Check if domain resolves to Vercel
   nslookup your-domain.com
   
   # Should show Vercel IP addresses
   ```

### Step 5: Deploy

1. **Trigger Deployment**
   - Push code to `main` branch
   - Vercel auto-deploys
   - Takes ~2-3 minutes

2. **Monitor Deployment**
   - In Vercel: Deployments tab
   - Watch build logs
   - Click deployment URL when ready

3. **Verify Frontend is Accessible**
   ```bash
   # Test frontend (replace with your domain)
   curl https://your-frontend-domain.vercel.app/
   
   # Should return HTML with React app
   ```

### Step 6: Verify API Connection

1. **Open Browser Developer Tools** (F12)

2. **Go to Network Tab**

3. **Perform any action** (login, load posts, etc.)

4. **Check Network Requests**
   - Should see requests to `https://your-api-domain.railway.app/api/*`
   - Status should be 200 (or expected codes)
   - No CORS errors

---

## Pi Network Integration

### Step 1: Register App in Pi Developer Portal

1. **Go to [Pi Developer Portal](https://developers.pi.network)**

2. **Log In with Pi Account**
   - Create account if needed
   - Verify with Pi wallet

3. **Create New App**
   - Click "Create App"
   - **App Name**: ChirperPi Hub
   - **Description**: Social networking for Pi community
   - **Category**: Social
   - **Website**: https://your-frontend-domain.com
   - Click "Create"

### Step 2: Configure OAuth Redirect URIs

1. **In Developer Portal, Click Your App**

2. **Go to OAuth Settings**

3. **Add Redirect URIs**
   - Development: `http://localhost:4173/auth/callback`
   - Staging: `https://staging.your-domain.com/auth/callback`
   - Production: `https://your-frontend-domain.com/auth/callback`
   
   Add each and save after each.

4. **Copy OAuth Credentials**
   - Copy `Client ID`
   - Copy `Client Secret`
   - Save these (you'll need them for environment variables)

### Step 3: Configure Authorized Domains

1. **In Developer Portal, OAuth Settings**

2. **Add Authorized Domains**
   - Add `your-frontend-domain.com`
   - Add `your-api-domain.com`
   - Click Save

3. **Whitelist Wallets (Optional)**
   - In Developer Portal → Wallets
   - Add any wallet addresses to test with

### Step 4: Set Pi Environment Variables

1. **On Railway (Server)**
   ```bash
   # Add these to Railway environment variables:
   PI_OAUTH_ID = (Client ID from Developer Portal)
   PI_OAUTH_SECRET = (Client Secret from Developer Portal)
   PI_API_KEY = (API Key from Developer Portal)
   PI_API_SECRET = (API Secret from Developer Portal)
   ```

2. **Redeploy Server**
   - Push code to `main` branch
   - Or manually trigger redeploy in Railway

3. **Verify Pi OAuth Works**
   - Go to frontend
   - Click "Continue with Pi"
   - Should redirect to Pi login
   - After login, redirect back to your app

### Step 5: Configure Webhook (Optional)

For payment callbacks and notifications:

1. **In Developer Portal, Webhooks Settings**

2. **Add Webhook Endpoint**
   - URL: `https://your-api-domain.railway.app/api/webhooks/pi`
   - Events: Select which events (payments, etc.)
   - Click Save

3. **Test Webhook**
   - Click "Send Test Event"
   - Check Railway logs for webhook receipt
   - Verify in server that webhook is handled

---

## Post-Deployment Checklist

### Phase 1: Basic Connectivity (15 minutes)

- [ ] **Server API Responds**
  ```bash
  curl https://your-api-domain.railway.app/api/health
  # Should return 200 status
  ```

- [ ] **Client Loads**
  ```bash
  # Visit frontend in browser
  # https://your-frontend-domain.com
  # Should show home page without errors
  ```

- [ ] **API Connection Works**
  - Open browser DevTools (F12)
  - Network tab
  - Reload page
  - Should see requests to `/api/*` endpoints
  - No CORS errors

### Phase 2: Authentication (20 minutes)

- [ ] **Pi Login Flow**
  - Click "Continue with Pi"
  - Redirects to Pi login
  - Enter test credentials (or use test wallet)
  - After auth, redirects back to app
  - Logged in user visible in UI

- [ ] **Token Storage**
  - DevTools → Application → Storage → localStorage
  - Should have `authToken` key with JWT value
  - Token should not be blank

- [ ] **Protected Routes**
  - Try accessing `/profile/username` without login
  - Should redirect to login page
  - After login, profile loads correctly

### Phase 3: Core Features (30 minutes)

- [ ] **Create Post**
  - Log in
  - Navigate to home/feed
  - Click "New Post" or similar
  - Enter post content
  - Click "Post"
  - Post appears in feed

- [ ] **Like/React to Post**
  - Click like button on any post
  - Heart icon fills/changes color
  - Like count increments

- [ ] **Comment on Post**
  - Click comment button
  - Type comment
  - Submit
  - Comment appears below post

- [ ] **Follow User**
  - Go to any user profile
  - Click "Follow" button
  - Button changes to "Unfollow"
  - Follow count increments

- [ ] **Search/Explore**
  - Try search functionality
  - Should return results
  - No errors in console

### Phase 4: Database & Data (15 minutes)

- [ ] **Data Persists**
  - Create a post
  - Reload page
  - Post still visible

- [ ] **Database Queries Work**
  - Create/like/comment on multiple items
  - Refresh page multiple times
  - All data present and correct

- [ ] **User Data Stored**
  - Update profile (if feature exists)
  - Reload page
  - Profile data persisted

### Phase 5: SSL & Security (10 minutes)

- [ ] **SSL Certificate Valid**
  ```bash
  # Check certificate
  openssl s_client -connect your-api-domain.com:443 </dev/null
  
  # Look for "Verify return code: 0 (ok)"
  ```

- [ ] **No Mixed Content Warnings**
  - Open DevTools Console
  - No "Mixed Content" warnings
  - No HTTP requests from HTTPS page

- [ ] **HSTS Header (if applicable)**
  - DevTools → Network → Click any request
  - Headers tab
  - Should see `strict-transport-security` header

### Phase 6: Performance (10 minutes)

- [ ] **Page Load Time**
  - DevTools → Network
  - Reload page
  - Document load time < 3 seconds
  - Total resources < 2 MB

- [ ] **API Response Time**
  - Check individual API requests
  - Response times < 500ms for database queries
  - < 100ms for cached data

- [ ] **No Memory Leaks**
  - DevTools → Memory
  - Take heap snapshot before and after
  - No dramatic memory increase

### Phase 7: Error Handling (10 minutes)

- [ ] **Test Error Scenarios**
  - Simulate API timeout: Use DevTools throttle
  - Missing required fields: Try invalid submit
  - Should show user-friendly error messages
  - No raw error text in UI

- [ ] **Check Server Logs**
  - Railway: Project → Server → Logs
  - No red error entries
  - Look for warnings to investigate

- [ ] **Check Browser Console**
  - DevTools → Console
  - No red error messages
  - Yellow warnings acceptable (consider fixing)

### Phase 8: Monitoring Setup (Optional, 10 minutes)

- [ ] **Set Up Error Tracking** (Sentry)
  ```bash
  # Optional: Add Sentry for error tracking
  # Go to https://sentry.io
  # Create account and project
  # Get DSN
  # Add to server environment variable:
  SENTRY_DSN=your-sentry-dsn
  # Redeploy server
  ```

- [ ] **Set Up Analytics** (Optional)
  - Add Google Analytics (if desired)
  - Track user flows
  - Monitor page views

- [ ] **Configure Monitoring Alerts** (Optional)
  - Railway: Set up deployment notifications
  - Sentry: Set up error alerts to Slack
  - Vercel: Set up deployment notifications

---

## Monitoring & Observability

### Server Logs (Railway)

**View Real-time Logs**
```bash
# In Railway Dashboard
# Project → Server Service → Logs tab
# Filter by level: All, Error, Warning, Info
```

**Common Log Entries**
- `Server listening on port 3001` - Server started successfully
- `Database connection established` - DB connected
- `Error: ECONNREFUSED` - Cannot connect to database
- `JWT verification failed` - Invalid/expired token

### Client Monitoring

**Browser Console Check**
- Open DevTools (F12)
- Console tab
- Red entries = errors (fix these)
- Yellow entries = warnings (consider fixing)
- Blue/gray = info (normal)

**Network Requests**
- Network tab
- Check each API request
- 200-299 = success
- 400-499 = client error
- 500-599 = server error

### Error Tracking with Sentry (Free Tier)

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up (free tier available)
   - Create new project for Node.js

2. **Get DSN**
   - Project Settings → Client Keys (DSN)
   - Copy DSN value

3. **Add to Server**
   - In Railway environment variables:
     ```
     SENTRY_DSN = your-sentry-dsn
     ```
   - Redeploy server

4. **Errors Auto-Report**
   - Any server error automatically goes to Sentry
   - View issues in Sentry dashboard
   - Set up alerts to Slack (optional)

### Performance Monitoring

**Monitor Key Metrics**

| Metric | Target | Where to Check |
|--------|--------|-----------------|
| API Response Time | < 500ms | Railway logs, DevTools |
| Page Load Time | < 3s | Browser DevTools |
| Database Query Time | < 100ms | Server logs |
| Error Rate | < 1% | Sentry dashboard |
| Uptime | 99.9% | Railway/Vercel status page |

### Regular Maintenance

**Daily**
- [ ] Check Railway server status
- [ ] Check Vercel deployment status
- [ ] Monitor error logs

**Weekly**
- [ ] Review Sentry error summary
- [ ] Check database storage usage
- [ ] Verify backups are running

**Monthly**
- [ ] Review user feedback
- [ ] Analyze performance metrics
- [ ] Update dependencies (security patches)

---

## Rollback Instructions

### Scenario 1: Recent Deployment Broke Something (Last 24 Hours)

#### Rollback Server (Railway)

1. **View Deployment History**
   - Go to Railway: Project → Server Service
   - Click "Deployments" tab
   - See list of all deployments with timestamps

2. **Identify Previous Good Deployment**
   - Look for deployment before the broken one
   - Check timestamp and status (should say "Deployed")

3. **Rollback to Previous Version**
   ```bash
   # In Railway Dashboard
   # Click on the previous good deployment
   # Click "Revert" button
   # Confirm the revert
   # Railway re-deploys that version (takes ~2-3 minutes)
   ```

4. **Verify Rollback Succeeded**
   ```bash
   # Test API is responding
   curl https://your-api-domain.railway.app/api/health
   
   # Check logs show no errors
   # In Railway: Project → Server Service → Logs
   ```

#### Rollback Client (Vercel)

1. **View Deployment History**
   - Go to Vercel: Dashboard → Your Project
   - Click "Deployments" tab
   - See list of all deployments

2. **Identify Previous Good Deployment**
   - Look for deployment before the broken one
   - Check status (should be "Ready")

3. **Rollback**
   ```bash
   # Click on the previous good deployment
   # Click "Make Production" button
   # Confirm that you want this as production version
   # Vercel makes this the live version
   ```

4. **Verify Frontend Works**
   - Visit your app URL
   - Test basic functionality
   - Check DevTools console for errors

### Scenario 2: Need to Revert to Older Version (Older Than 24 Hours)

#### Railway (Server)

```bash
# Option 1: Via Railway Dashboard
# Project → Server → Deployments
# Only recent deployments (last week) are available
# Click desired deployment → Revert

# Option 2: Via Git (if not in Railway history)
# Find the commit you want to revert to
git log --oneline

# Revert to that commit
git revert <commit-hash>
git push origin main

# Railway auto-deploys the new commit
```

#### Vercel (Client)

```bash
# Option 1: Via Vercel Dashboard
# Project → Deployments
# Click deployment from desired date
# Click "Make Production"

# Option 2: Via Git
# Find the commit you want to revert to
git log --oneline

# Revert to that commit
git revert <commit-hash>
git push origin main

# Vercel auto-deploys
```

### Scenario 3: Database Issue (Rollback Data)

Railway PostgreSQL backups:

```bash
# In Railway Dashboard
# Project → PostgreSQL Service
# Click "Backups" tab
# Select the backup from before the issue
# Click "Restore"
# Confirm restoration (takes 5-10 minutes)
```

**⚠️ Warning**: Restoring a backup will overwrite current database. Use only if necessary.

### Scenario 4: Emergency Scaling

If your app is down due to traffic:

#### Railway
```bash
# In Railway Dashboard
# Project → Server Service → Deploy
# Increase "Replica Count" to 2 or 3
# Railway automatically load-balances
```

#### Vercel
- Vercel auto-scales based on traffic
- No manual action needed
- Check dashboard to confirm

---

## Troubleshooting

### Common Issues & Solutions

#### "502 Bad Gateway" on API

**Cause**: Server is not responding

**Solutions**:
```bash
# 1. Check Railway logs
# Railway Dashboard → Server → Logs
# Look for error messages

# 2. Check environment variables are set
# Railway Dashboard → Server → Variables
# Verify all required variables present

# 3. Check database connection
# Try manual connection:
psql $DATABASE_URL -c "SELECT 1;"

# 4. Restart the server
# Railway Dashboard → Server → Settings → Restart
```

#### "CORS Error" in Frontend

**Cause**: Backend not allowing frontend requests

**Solutions**:
```bash
# 1. Verify API_URL is correct
# Browser DevTools → Network
# Check request URL - should be your Railway domain

# 2. Check CORS headers
# Any API request → Headers tab
# Should see "access-control-allow-origin" header

# 3. Verify frontend environment variable
# Vercel Dashboard → Settings → Environment Variables
# VITE_API_URL should point to Railway domain

# 4. Redeploy with correct URL
git push origin main
```

#### "Cannot POST /auth/pi"

**Cause**: OAuth not configured

**Solutions**:
```bash
# 1. Verify Pi credentials set
# Railway → Server → Variables
# Check PI_OAUTH_ID and PI_OAUTH_SECRET are set

# 2. Check Pi Developer Portal settings
# Redirect URI includes your frontend URL
# API_URL includes your backend URL

# 3. Verify environment variables in Railway
# Make sure exact variable names match code
# Case-sensitive!

# 4. Redeploy after making changes
git push origin main
```

#### "Database connection refused"

**Cause**: Cannot connect to PostgreSQL

**Solutions**:
```bash
# 1. Verify DATABASE_URL format
# Should be: postgresql://user:password@host:port/database

# 2. Test connection directly
psql postgresql://user:password@host:port/database -c "SELECT 1;"

# 3. Check Railway PostgreSQL service
# Railway Dashboard → PostgreSQL
# Status should be "Running"

# 4. Check password doesn't have special characters
# If it does, URL-encode them:
# @ becomes %40
# : becomes %3A

# 5. Get fresh connection string from Railway
# Delete and re-copy DATABASE_URL from Railway dashboard
```

#### "Redis connection refused"

**Cause**: Cannot connect to Redis

**Solutions**:
```bash
# 1. Verify REDIS_URL set in Railway
# Railway → Server → Variables

# 2. Check Railway Redis service
# Railway Dashboard → Redis
# Status should be "Running"

# 3. Test connection
redis-cli -u redis://user:password@host:port

# 4. Look for Redis service errors
# Railway → Redis → Logs
```

#### "Cannot find module" error

**Cause**: Dependencies not installed

**Solutions**:
```bash
# 1. Check Railway build logs
# Railway → Deployments → Click deployment → Build Logs

# 2. Verify package.json is correct
# Look for typos in dependencies

# 3. Try rebuilding
# Delete node_modules locally and reinstall:
rm -rf node_modules package-lock.json
npm install

# 4. Commit and push - forces rebuild
git add -A
git commit -m "chore: rebuild dependencies"
git push origin main
```

#### "Port already in use" locally

**Cause**: Another process using port 3001

**Solutions**:
```bash
# 1. Find process using port 3001
lsof -i :3001

# 2. Kill the process
kill -9 <PID>

# 3. Start server again
npm --prefix server run dev
```

#### Vercel deployment stuck on "Analyzing"

**Cause**: Build taking too long or stalled

**Solutions**:
```bash
# 1. Wait a bit longer (can take 5+ minutes)

# 2. Check build logs
# Vercel Dashboard → Deployments → Click deployment
# Scroll to "Build" section to see what's happening

# 3. Cancel and retry
# Vercel Dashboard → Deployments
# Click three dots → "Cancel Deployment"
# Go to "Deployments" → "Redeploy"

# 4. Check for build errors in package.json
# Verify build command works locally:
npm --prefix client run build
```

#### "Cannot read property 'token' of undefined"

**Cause**: User not properly authenticated

**Solutions**:
```bash
# 1. Clear browser cache/localStorage
# DevTools → Application → Storage → Clear Site Data
# Refresh page

# 2. Try Pi login again
# Go to login page
# Click "Continue with Pi"
# Complete authentication

# 3. Check server logs for auth errors
# Railway → Server → Logs

# 4. Verify JWT_SECRET is set in Railway
# Must be same as when tokens were created
```

### Getting Help

If issues persist:

1. **Check GitHub Issues**
   - Search for similar issue in repository
   - May find solution from community

2. **Check Service Status Pages**
   - [Railway Status](https://status.railway.app)
   - [Vercel Status](https://www.vercel-status.com)
   - May be service-wide outage

3. **Review Logs**
   - Railway logs (most important)
   - Browser DevTools console and network
   - Sentry error tracking (if configured)

4. **Recreate Locally**
   - Try to reproduce issue locally first
   - Easier to debug

5. **Ask for Help**
   - Create GitHub issue with:
     - What you were doing
     - What went wrong
     - Error messages
     - Relevant logs

---

## Next Steps After Deployment

1. **Share App URL**
   - Frontend URL with team
   - Collect feedback

2. **Monitor for Issues**
   - Check Railway logs daily
   - Monitor Sentry (if configured)
   - Get user feedback

3. **Optimize Performance**
   - Review DevTools metrics
   - Optimize slow queries
   - Consider caching strategies

4. **Plan Features**
   - Based on user feedback
   - Create GitHub issues for next features
   - Plan next deployment

---

## Quick Reference: Common Commands

```bash
# Local Development
npm install                      # Install dependencies
npm run dev --workspaces         # Start dev servers
npm test --workspaces            # Run tests locally

# Database
npm --prefix server run migrate  # Run migrations
psql $DATABASE_URL -c "\dt"      # List tables in database

# Deployment
git push origin main             # Trigger automatic deploy
git log --oneline               # View commit history
git revert <commit-hash>        # Revert specific commit

# Testing
curl https://your-api/api/health # Test API
npm run test:e2e                # Run end-to-end tests

# Monitoring
railway logs                    # View server logs (if Railway CLI installed)
vercel logs                     # View build logs (if Vercel CLI installed)
```

---

## Deployment Checklist Template

Use this when deploying updates:

```
[ ] Code review completed
[ ] Tests pass locally (npm test --workspaces)
[ ] No console errors locally
[ ] Commit message is descriptive
[ ] Push to develop branch first (test environment)
[ ] Wait for CI/CD to complete
[ ] Test on develop deployment
[ ] Create PR for main branch
[ ] PR reviewed and approved
[ ] Merge to main
[ ] Monitor Railway deployment (5-10 min)
[ ] Monitor Vercel deployment (2-3 min)
[ ] Test production app
[ ] Verify no new errors in Sentry
[ ] Update status/changelog if needed
```

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [React Best Practices](https://react.dev)

---

**Last Updated**: May 5, 2026
**Version**: 1.0
**Maintainer**: ChirperPi Team

For updates or corrections, please submit an issue on GitHub.
