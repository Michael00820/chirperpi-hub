# 🎉 Complete Step-by-Step Deployment Guide

## Split Repository Deployment (Separate Backend & Frontend)

**Total Time**: ~60 minutes  
**Difficulty**: Easy ✅

---

## 📋 Phase 1: Prepare Split Repositories (10 mins)

### Step 1.1: Create Two New GitHub Repositories

**Backend Repository:**
1. Go to **https://github.com/new**
2. Repository name: `chirperpi-backend`
3. Description: `ChirperPi Backend API - Express.js with Pi Network`
4. Set to **Public** or **Private**
5. Click **"Create repository"**

**Frontend Repository:**
1. Go to **https://github.com/new**
2. Repository name: `chirperpi-frontend`
3. Description: `ChirperPi Frontend - React Vite App with Pi Network`
4. Set to **Public** or **Private**
5. Click **"Create repository"**

### Step 1.2: Copy Backend Files from Current Repo

1. In your `chirperpi-hub` folder:
   ```bash
   # Copy all backend files
   cp -r server/* ../chirperpi-backend/
   cp BACKEND_package.json ../chirperpi-backend/package.json
   cp BACKEND_tsconfig.json ../chirperpi-backend/tsconfig.json
   cp BACKEND_env.example ../chirperpi-backend/.env.example
   ```

2. Update `../chirperpi-backend/package.json`:
   - Remove any `"workspaces"` references
   - Ensure `"main": "dist/index.js"`
   - Keep all express/node dependencies

### Step 1.3: Copy Frontend Files from Current Repo

1. In your `chirperpi-hub` folder:
   ```bash
   # Copy all frontend files
   cp -r client/* ../chirperpi-frontend/
   cp FRONTEND_package.json ../chirperpi-frontend/package.json
   cp FRONTEND_tsconfig.json ../chirperpi-frontend/tsconfig.json
   cp FRONTEND_env.example ../chirperpi-frontend/.env.example
   cp FRONTEND_vercel.json ../chirperpi-frontend/vercel.json
   ```

2. Update `../chirperpi-frontend/package.json`:
   - Remove any `"workspaces"` references
   - Keep all react/vite dependencies

### Step 1.4: Fix Imports (Remove `shared/` references)

**For Backend Files** (`chirperpi-backend/src/**/*`):
```bash
# Find all "shared" imports
grep -r "from.*shared" src/

# Replace with local imports
# BEFORE: import { Type } from 'shared/src/types'
# AFTER:  import { Type } from './types'
```

**For Frontend Files** (`chirperpi-frontend/src/**/*`):
```bash
# Find all "shared" imports
grep -r "from.*shared" src/

# Replace with local imports
# BEFORE: import { Type } from 'shared/src/types'
# AFTER:  import { Type } from './types'
```

### Step 1.5: Create Git Repos Locally

```bash
# Backend repo
cd ../chirperpi-backend
git init
git add .
git commit -m "Initial commit: Backend from monorepo split"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chirperpi-backend.git
git push -u origin main

# Frontend repo
cd ../chirperpi-frontend
git init
git add .
git commit -m "Initial commit: Frontend from monorepo split"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chirperpi-frontend.git
git push -u origin main
```

---

## 🚀 Phase 2: Deploy Backend to Railway (15 mins)

### Step 2.1: Create Railway Project

1. Go to **https://railway.app/dashboard**
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select **"chirperpi-backend"** repo
5. Click **"Deploy"** ✅

### Step 2.2: Add PostgreSQL Database

1. In Railway dashboard, click **"Add Service"**
2. Click **"Database"**
3. Select **"PostgreSQL"**
4. Wait for creation (~2 minutes) ✅
5. Click **"PostgreSQL"** service
6. Go to **"Connect"** tab
7. **Copy** the full connection string (starts with `postgresql://`)
8. Save this as `DB_URL_VALUE` ✅

### Step 2.3: Add Redis Cache

1. In Railway dashboard, click **"Add Service"**
2. Click **"Database"**
3. Select **"Redis"**
4. Wait for creation (~1 minute) ✅
5. Click **"Redis"** service
6. Go to **"Connect"** tab
7. **Copy** the full connection string (starts with `redis://`)
8. Save this as `REDIS_URL_VALUE` ✅

### Step 2.4: Generate Secret Keys

Open terminal and run these commands 3 times, copy each output:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

You now have 3 secret values ✅

### Step 2.5: Add Environment Variables to Railway

1. Go to Railway **server service**
2. Click **"Variables"** tab
3. For each variable below, click **"New Variable"**:

| Variable Name | Value |
|---|---|
| `DATABASE_URL` | `postgresql://...` (from Step 2.2) |
| `REDIS_URL` | `redis://...` (from Step 2.3) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `JWT_SECRET` | (from Step 2.4 - line 1) |
| `SESSION_SECRET` | (from Step 2.4 - line 2) |
| `JWT_REFRESH_SECRET` | (from Step 2.4 - line 3) |
| `PI_API_KEY` | Get from developers.pi.network |
| `PI_API_SECRET` | Get from developers.pi.network |
| `PI_OAUTH_ID` | Get from developers.pi.network |
| `PI_OAUTH_SECRET` | Get from developers.pi.network |
| `PI_PLATFORM_API_URL` | `https://api.pi.network` |
| `API_URL` | Leave empty for now (will update) |
| `FRONTEND_URL` | Leave empty for now (will update) |
| `CLIENT_URL` | Leave empty for now (will update) |

Each variable is auto-saved in Railway ✅

### Step 2.6: Configure Build Settings

1. Go to Railway **server service** → **"Settings"** tab
2. Verify or set:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Save ✅

### Step 2.7: Deploy Backend

1. Go to Railway **"Deployments"** tab
2. Click **"Trigger Deploy"** (or push new commit to main)
3. Watch the logs - you should see:
   - `npm install` ✅
   - `npm run build` ✅
   - `node dist/index.js` ✅
   - `"Server listening on port 3001"` ✅
4. Wait 5-7 minutes for deployment to complete ✅
5. When green checkmark appears, click **"View"** to get the domain

### Step 2.8: Get Railway Backend Domain

1. Go to Railway **server service** → **"Settings"** tab
2. Find **"Public Networking"** section
3. You should see a generated domain like: `chirperpi-api-abc123.railway.app`
4. **Copy** this domain ✅
5. Save as `RAILWAY_DOMAIN` ✅

### Step 2.9: Update Backend API_URL Variable

1. Go back to Railway **"Variables"** tab
2. Find **"API_URL"** variable
3. Click to edit
4. Change value to: `https://RAILWAY_DOMAIN.railway.app` (replace RAILWAY_DOMAIN)
5. Save ✅
6. Go to **"Deployments"** tab
7. Click **"Redeploy"** button
8. Wait 3-4 minutes ✅

### Step 2.10: Test Backend

```bash
curl https://RAILWAY_DOMAIN.railway.app/api/health
```

Expected: `200 OK` with JSON response ✅

---

## 🎨 Phase 3: Deploy Frontend to Vercel (15 mins)

### Step 3.1: Create Vercel Project

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Search for **"chirperpi-frontend"**
5. Click **"Import"** ✅

### Step 3.2: Configure Build Settings

1. You'll see configuration page
2. Set:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
3. Click **"Deploy"** ✅

### Step 3.3: Get Vercel Domain (While Building)

1. Vercel starts building automatically
2. You'll get a preview URL like: `https://chirperpi-frontend-abc123.vercel.app`
3. **Copy** this URL ✅
4. Save as `VERCEL_DOMAIN` ✅

### Step 3.4: Wait for Deployment

1. Vercel will build and deploy (~3-5 minutes)
2. You should see green checkmark when done ✅

### Step 3.5: Add Frontend Environment Variables

1. After deployment finishes, go to **"Settings"** tab
2. Click **"Environment Variables"** in left menu
3. Add variable 1:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://RAILWAY_DOMAIN.railway.app/api`
   - Click **"Add"** ✅
4. Add variable 2:
   - **Name**: `VITE_APP_NAME`
   - **Value**: `ChirperPi`
   - Click **"Add"** ✅

### Step 3.6: Redeploy Frontend with Env Vars

1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click **"Redeploy"** button
4. Wait 3-5 minutes ✅

### Step 3.7: Test Frontend

1. Open: `https://VERCEL_DOMAIN.vercel.app`
2. Should load without errors
3. Open DevTools (F12) → **Console** tab
4. Should be no red errors ✅

---

## 🔗 Phase 4: Connect Frontend & Backend (10 mins)

### Step 4.1: Update Railway Backend URLs

1. Go to Railway **server service** → **"Variables"** tab
2. Find **"FRONTEND_URL"** variable
3. Change to: `https://VERCEL_DOMAIN.vercel.app` ✅
4. Find **"CLIENT_URL"** variable
5. Change to: `https://VERCEL_DOMAIN.vercel.app` ✅
6. Click **"Redeploy"**
7. Wait 3-4 minutes ✅

### Step 4.2: Verify Frontend Env Vars

1. Go to Vercel → **Settings** → **Environment Variables**
2. Confirm **"VITE_API_URL"** is: `https://RAILWAY_DOMAIN.railway.app/api` ✅

### Step 4.3: Final Redeploy (if needed)

1. If you changed Vercel env vars, click **"Deployments"** tab
2. Click **"Redeploy"**
3. Wait 3-5 minutes ✅

---

## ✅ Phase 5: Final Verification (10 mins)

### Test 1: Backend Health Check
```bash
curl https://RAILWAY_DOMAIN.railway.app/api/health
```
✅ Should return `200 OK` with JSON

### Test 2: Frontend Loads
1. Open browser: `https://VERCEL_DOMAIN.vercel.app`
2. Should see homepage ✅
3. DevTools Console should have NO red errors ✅

### Test 3: CORS & API Connection
1. Open DevTools (F12)
2. Go to **Network** tab
3. Perform any action on frontend (if available)
4. Look for requests to `RAILWAY_DOMAIN.railway.app/api`
5. Should be `200`, `201`, or `400+` status (not connection errors) ✅
6. **No CORS errors** in console ✅

### Test 4: Backend Logs
1. Go to Railway → **server service** → **"Logs"** tab
2. Should see: `"Server listening on port 3001"` ✅
3. No red error entries ✅

### Test 5: Frontend Logs
1. Go to Vercel → Latest deployment
2. Click **"Runtime Logs"** tab
3. Should have info/debug entries ✅
4. No red error entries ✅

---

## 🎯 Summary of URLs

| Component | URL |
|---|---|
| **Backend API** | `https://RAILWAY_DOMAIN.railway.app` |
| **Frontend App** | `https://VERCEL_DOMAIN.vercel.app` |
| **Health Check** | `https://RAILWAY_DOMAIN.railway.app/api/health` |

---

## 🎉 You're Live! 🚀

Your ChirperPi application is now deployed and running on:
- **Backend**: Railway
- **Frontend**: Vercel
- **Communication**: API calls from Vercel to Railway

Both are connected via environment variables and communicating successfully! ✅

---

## 📞 Next Steps

1. ✅ Share the frontend URL with users
2. ✅ Monitor logs regularly
3. ✅ Set up custom domains (optional)
4. ✅ Configure error tracking (Sentry)
5. ✅ Set up backups (Railway PostgreSQL automatic)
6. ✅ Monitor performance and optimize

---

**Deployment Complete! 🎊**  
*Deployed on: May 14, 2026*
