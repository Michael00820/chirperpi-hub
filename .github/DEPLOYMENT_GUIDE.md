# Deployment Guide for ChirperPi Hub

This guide walks through setting up the CI/CD pipeline and deployment infrastructure.

## Prerequisites

- GitHub repository (public or private)
- Railway account (for server hosting)
- Vercel account (for client hosting)
- Slack/Discord workspace (optional, for notifications)

## Step 1: GitHub Secrets Configuration

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Create the following secrets:

### Railway Deployment Secrets

#### RAILWAY_TOKEN
1. Go to [Railway.app](https://railway.app)
2. Log in and create/select a project
3. Go to **Account** → **API Tokens**
4. Create a new API token
5. Copy the token and add it to GitHub Secrets as `RAILWAY_TOKEN`

#### DATABASE_URL (Production)
In Railway:
1. Create a PostgreSQL plugin for your project
2. Connect it to your service
3. Copy the connection string (Format: `postgresql://user:password@host:port/database`)
4. Add to GitHub Secrets as `DATABASE_URL`

### Vercel Deployment Secrets

#### VERCEL_TOKEN
1. Go to [Vercel.com](https://vercel.com)
2. Log in and go to **Settings** → **Tokens**
3. Create a new token (scope: Full access)
4. Copy and add to GitHub Secrets as `VERCEL_TOKEN`

#### VERCEL_ORG_ID & VERCEL_PROJECT_ID
1. Link your GitHub repo to a Vercel project
2. In Vercel project **Settings** → **General**, find:
   - **Project ID** → Add as `VERCEL_PROJECT_ID`
   - **Team ID** (if in organization) or leave blank → Add as `VERCEL_ORG_ID`

To find these programmatically:
```bash
vercel link  # This will display the IDs
```

#### VITE_API_URL
The production API URL for your server (e.g., `https://your-server.railway.app/api`)

### Slack Notifications (Optional)

#### SLACK_WEBHOOK
1. Go to your Slack workspace
2. Create a new app or use existing one
3. Enable **Incoming Webhooks**
4. Add a new webhook to a channel (e.g., #deployments)
5. Copy the webhook URL
6. Add to GitHub Secrets as `SLACK_WEBHOOK`

## Step 2: CI Workflow Setup

The CI workflow (`.github/workflows/ci.yml`) automatically runs on:
- Push to `main` or `develop` branches
- Pull requests targeting these branches

### Services Used
- **PostgreSQL**: Test database (automatically spun up)
- **Redis**: Session/cache store (automatically spun up)

No additional setup needed - the workflow handles everything.

## Step 3: Deploy Workflow Setup

The deploy workflow (`.github/workflows/deploy.yml`) automatically runs on:
- Push to `main` branch (after CI passes)

### Railway Server Deployment
1. Create a Railway project for ChirperPi Hub
2. Link your GitHub repository
3. Configure environment variables in Railway:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `NODE_ENV=production`
   - Other server env vars (see server/.env.example)
4. The workflow will automatically run migrations

### Vercel Client Deployment
1. Create a Vercel project for the ChirperPi client
2. Link your GitHub repository (optional - workflow can deploy via CLI)
3. Configure environment variables in Vercel:
   - `VITE_API_URL`
   - Other client env vars (see client/.env.example)

## Step 4: Local Testing

Before pushing, test locally:

```bash
# Install dependencies
npm run install:all

# Run linting
npm run lint --workspaces

# Run type checking
npm run build --workspaces -- --noEmit

# Run unit tests (with local PostgreSQL/Redis)
npm test --workspaces

# Run E2E tests
npm run test:e2e

# Build for production
npm run build --workspaces
```

## Monitoring & Troubleshooting

### CI Workflow
- View logs: GitHub → Actions → CI workflow
- Check for:
  - Linting errors (ESLint)
  - Type errors (TypeScript)
  - Failed tests (Jest/Vitest)
  - E2E failures (Playwright)

### Deploy Workflow
- View logs: GitHub → Actions → Deploy workflow
- Common issues:
  - Missing secrets → Check GitHub Secrets configuration
  - Railway deployment fails → Check Railway service and environment variables
  - Vercel deployment fails → Check Vercel project configuration
  - Slack notification fails → Verify webhook URL (non-blocking)

### Viewing Deployment Artifacts
- **Build artifacts**: GitHub → Actions → Build job
- **Playwright reports**: GitHub → Actions → E2E Tests job
- **Coverage reports**: CodeCov (after codecov integration)

## Environment Variables Reference

### Server (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/chirperpi
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key
API_URL=https://api.chirperpi.app
```

### Client (.env)
```
VITE_API_URL=https://api.chirperpi.app
```

## Rollback Procedure

If a deployment fails or needs to be rolled back:

1. **Server (Railway)**:
   - Railway Dashboard → Select service → Deployments
   - Click the previous stable deployment
   - Click "Redeploy"

2. **Client (Vercel)**:
   - Vercel Dashboard → Select project → Deployments
   - Find previous stable deployment
   - Click "Redeploy"

3. **Manual Rollback**:
   ```bash
   # Railway
   railway up --service chirperpi-server --skip-deploy
   
   # Vercel
   vercel --prod --target production
   ```

## Advanced Configuration

### Matrix Testing
The CI workflow uses Node.js 18.x. To test multiple versions:

Edit `.github/workflows/ci.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
```

### Custom Status Checks
Add branch protection rules in GitHub:
- Settings → Branches → Add rule
- Require CI to pass before merging
- Require status checks: `lint`, `unit-tests`, `build`, `e2e-tests`

### Scheduled Deployments
To deploy on a schedule (e.g., nightly):

Add to `deploy.yml`:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
```

## Getting Help

For issues with:
- **GitHub Actions**: [GitHub Docs](https://docs.github.com/en/actions)
- **Railway**: [Railway Docs](https://docs.railway.app)
- **Vercel**: [Vercel Docs](https://vercel.com/docs)
- **CI/CD Setup**: Check the workflow files in `.github/workflows/`
