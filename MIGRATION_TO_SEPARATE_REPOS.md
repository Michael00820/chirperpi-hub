# 🔄 Migration Guide: Monorepo to Separate Repositories

**Date**: May 14, 2026  
**Status**: Complete Setup Instructions  
**Goal**: Split into `chirperpi-backend` and `chirperpi-frontend` for easier deployment

---

## 📋 Current Structure (Monorepo - Issues with deployment)
```
chirperpi-hub/
├── client/
├── server/
├── shared/
└── package.json (root workspaces)
```

## 🎯 New Structure (Separate Repos)

### **Repository 1: chirperpi-backend**
```
chirperpi-backend/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── infrastructure/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── db/
│   └── sentry.ts
├── dist/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── Dockerfile (optional)
```

### **Repository 2: chirperpi-frontend**
```
chirperpi-frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── contexts/
│   ├── pages/
│   ├── services/
│   └── sentry.ts
├── dist/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
└── vercel.json
```

---

## ✅ Step 1: Prepare the Backend Repo

### 1.1 Create `chirperpi-backend` folder structure
```bash
mkdir -p chirperpi-backend/src/{infrastructure,middleware,routes,services,db}
```

### 1.2 Copy backend files
```bash
cp server/src/* chirperpi-backend/src/
cp server/package.json chirperpi-backend/
cp server/tsconfig.json chirperpi-backend/
cp server/.env.example chirperpi-backend/
```

### 1.3 Update `chirperpi-backend/package.json`
- Remove monorepo workspace references
- Remove `shared` dependency
- Keep all express/node dependencies

### 1.4 Fix shared imports in backend
Replace all imports like:
```typescript
// OLD (monorepo style)
import { Something } from 'shared/src/types'

// NEW (backend only)
import { Something } from './types'
```

---

## ✅ Step 2: Prepare the Frontend Repo

### 2.1 Create `chirperpi-frontend` folder structure
```bash
mkdir -p chirperpi-frontend/src/{components,contexts,pages,services}
```

### 2.2 Copy frontend files
```bash
cp client/src/* chirperpi-frontend/src/
cp client/package.json chirperpi-frontend/
cp client/tsconfig.json chirperpi-frontend/
cp client/vite.config.ts chirperpi-frontend/
cp client/index.html chirperpi-frontend/
```

### 2.3 Update `chirperpi-frontend/package.json`
- Remove monorepo workspace references
- Remove `shared` dependency
- Keep all react/vite dependencies

### 2.4 Fix shared imports in frontend
Replace all imports like:
```typescript
// OLD (monorepo style)
import { Types } from 'shared/src/types'

// NEW (frontend only)
import { Types } from './types'
```

### 2.5 Create `chirperpi-frontend/vercel.json`
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

---

## 🚀 Step 3: Deploy Backend (Railway)

1. Create new GitHub repo: `chirperpi-backend`
2. Push contents of `chirperpi-backend/` folder
3. In Railway:
   - Connect to `chirperpi-backend` repo
   - Build command: `npm run build`
   - Start command: `npm start`
   - Add all environment variables
4. Get Railway domain
5. Deploy ✅

---

## 🚀 Step 4: Deploy Frontend (Vercel)

1. Create new GitHub repo: `chirperpi-frontend`
2. Push contents of `chirperpi-frontend/` folder
3. In Vercel:
   - Import `chirperpi-frontend` repo
   - Root Directory: `.`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
4. Add VITE_API_URL environment variable
5. Get Vercel domain
6. Deploy ✅

---

## 📝 Files to Modify

### Backend Changes
- [x] Remove monorepo `workspaces` from package.json
- [x] Fix all `shared/` imports
- [x] Create standalone .env.example
- [x] Update tsconfig.json paths

### Frontend Changes
- [x] Remove monorepo `workspaces` from package.json
- [x] Fix all `shared/` imports
- [x] Create standalone .env.example
- [x] Create vercel.json
- [x] Update tsconfig.json paths

---

## ✨ Benefits of Separate Repos

✅ Independent deployments (deploy backend without touching frontend)
✅ Faster builds (each CI/CD runs only relevant code)
✅ Clearer project structure
✅ No more monorepo complexity
✅ Easier scaling (can hire separate frontend/backend teams)
✅ Better error isolation (failures don't cascade)

---

## 🔗 Communication Between Repos

**Frontend** calls **Backend** via:
```typescript
// In frontend .env
VITE_API_URL=https://backend-domain.railway.app/api

// In frontend code
const response = await fetch(`${import.meta.env.VITE_API_URL}/endpoint`)
```

---

## Next Steps

1. Create 2 new GitHub repos
2. Push backend code to `chirperpi-backend`
3. Push frontend code to `chirperpi-frontend`
4. Connect each to Railway and Vercel
5. Set environment variables
6. Deploy and verify 🚀

