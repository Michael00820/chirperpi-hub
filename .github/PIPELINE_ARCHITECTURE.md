# CI/CD Pipeline Architecture

This document describes the GitHub Actions CI/CD pipeline architecture for ChirperPi Hub.

## Overview

The CI/CD pipeline consists of two main workflows:

```
Push to main/develop
        ↓
    [CI Workflow]
    ├─ Lint & Type Check (parallel)
    ├─ Unit Tests (parallel)
    ├─ Build (depends on lint)
    └─ E2E Tests (depends on build)
        ↓
   (If all pass)
        ↓
Push to main + CI passes
        ↓
   [Deploy Workflow]
    ├─ Deploy Server (Railway)
    ├─ Deploy Client (Vercel)
    └─ Notifications
```

## CI Workflow (`ci.yml`)

### Purpose
Verify code quality, type safety, and functionality before merge.

### Triggers
- Push to `main` or `develop`
- Pull request targeting `main` or `develop`

### Jobs

#### 1. Lint and Type Check (`lint`)
**Purpose**: Validate code style and TypeScript types

**Steps**:
- Checkout code
- Setup Node.js 18.x with npm cache
- Install dependencies (`npm ci`)
- Run ESLint (`npm run lint --workspaces`)
- Run TypeScript compiler (`npm run build --workspaces -- --noEmit`)

**Time**: ~2-3 minutes
**Runs on**: `ubuntu-latest`

**Caches**: npm dependencies
**Artifacts**: None

#### 2. Unit Tests (`unit-tests`)
**Purpose**: Run Jest (server) and Vitest (client) tests

**Services**:
- PostgreSQL 15 (test database)
- Redis 7 (session cache)

**Steps**:
- Checkout code
- Setup Node.js 18.x with npm cache
- Install dependencies
- Run database migrations to test database
- Run all unit tests (`npm test --workspaces`)
- Upload coverage to codecov.io

**Time**: ~5-7 minutes
**Runs on**: `ubuntu-latest`

**Environment Variables**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chirperpi_test
REDIS_URL=redis://localhost:6379
NODE_ENV=test
```

**Coverage**: Automatically sent to codecov.io

#### 3. Build (`build`)
**Purpose**: Verify production build succeeds (depends on lint)

**Steps**:
- Checkout code
- Setup Node.js 18.x with npm cache
- Install dependencies
- Build client (`npm --prefix client run build`)
- Build server (`npm --prefix server run build`)
- Upload build artifacts (5-day retention)

**Time**: ~3-4 minutes
**Runs on**: `ubuntu-latest`

**Artifacts**:
- `client/dist` - Vite production build
- `server/dist` - TypeScript compiled output

**Note**: Artifacts available for 5 days for debugging failed builds

#### 4. E2E Tests (`e2e-tests`)
**Purpose**: Run Playwright browser automation tests (depends on build)

**Steps**:
- Checkout code
- Setup Node.js 18.x with npm cache
- Install dependencies
- Install Playwright browsers (`npx playwright install --with-deps`)
- Run E2E tests (`npm run test:e2e`)
- Upload Playwright report on failure (30-day retention)

**Time**: ~8-10 minutes
**Runs on**: `ubuntu-latest`

**Browsers**:
- Chromium
- Firefox

**Artifacts**: Playwright HTML report (screenshots, videos on failure)

#### 5. Test Summary (`test-summary`)
**Purpose**: Provide aggregate test status (depends on unit-tests and e2e-tests)

**Behavior**:
- Checks if either unit-tests or e2e-tests failed
- Fails the job if any test job failed
- Runs regardless of previous failures (`if: always()`)

**Time**: < 1 minute

### CI Workflow Performance

```
Parallel Execution:
┌──────────────────────────────────────────────────────────┐
│ Lint (2-3 min) | Unit Tests (5-7 min) | Build (3-4 min) │
│                                                           │
│ E2E Tests (8-10 min, depends on build)                  │
│                                                           │
│ Test Summary (< 1 min)                                  │
└──────────────────────────────────────────────────────────┘

Total time: ~15-20 minutes
```

## Deploy Workflow (`deploy.yml`)

### Purpose
Deploy application to production after successful CI.

### Triggers
- Push to `main` branch only
- Only after CI workflow passes

### Concurrency
- Only one deployment at a time
- Cancels previous incomplete deployments

### Environment
- `production` environment (with optional approval gates)

### Jobs

#### 1. Deploy Server (`deploy-server`)
**Purpose**: Deploy backend to Railway and run migrations

**Steps**:
- Checkout code
- Setup Node.js 18.x
- Install dependencies
- Build server (`npm --prefix server run build`)
- Install Railway CLI (`npm install -g @railway/cli`)
- Deploy to Railway (`railway up --service chirperpi-server`)
- Run database migrations (`railway run npm run migrate`)
- Notify Slack on success

**Time**: ~5-10 minutes
**Environment**: production
**Secrets Used**:
- `RAILWAY_TOKEN` - Railway API authentication
- `DATABASE_URL` - Production database connection

**Notifications**: Slack webhook (non-blocking failure)

#### 2. Deploy Client (`deploy-client`)
**Purpose**: Deploy frontend to Vercel

**Steps**:
- Checkout code
- Setup Node.js 18.x
- Install dependencies
- Build client with environment variables (`npm --prefix client run build`)
- Deploy to Vercel using amondnet/vercel-action
- Notify Slack on success

**Time**: ~3-5 minutes
**Environment**: production
**Secrets Used**:
- `VERCEL_TOKEN` - Vercel API authentication
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `VITE_API_URL` - Production API URL (build-time variable)

**Build Environment Variables**:
```
VITE_API_URL=<production-api-url>
```

**Notifications**: Slack webhook (non-blocking failure)

#### 3. Deployment Notification (`deployment-notification`)
**Purpose**: Send aggregate deployment status (depends on both deployments)

**Behavior**:
- Runs regardless of deployment success (`if: always()`)
- Sends "success" Slack message if both deployments passed
- Sends "failure" Slack message if either deployment failed

**Time**: < 1 minute

### Deploy Workflow Performance

```
Sequential Execution (with optional concurrency):
┌──────────────────────┐
│ Deploy Server (5-10) │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ Deploy Client (3-5)  │
└──────────────────────┘
        ↓
┌──────────────────────┐
│ Notification (< 1)   │
└──────────────────────┘

Total time: ~10-20 minutes (sequential) or ~5-10 minutes (parallel)
```

## Required GitHub Secrets

### For CI
- None (uses public services: PostgreSQL, Redis, node_modules cache)

### For Deploy
- `RAILWAY_TOKEN` - Railway deployment
- `DATABASE_URL` - Database access
- `VERCEL_TOKEN` - Vercel deployment
- `VERCEL_ORG_ID` - Vercel organization
- `VERCEL_PROJECT_ID` - Vercel project
- `VITE_API_URL` - Client API endpoint
- `SLACK_WEBHOOK` (optional) - Slack notifications

## Caching Strategy

### npm Cache
- **Key**: Includes `package-lock.json` hash
- **Path**: `~/.npm`
- **Scope**: Per job
- **Hit Rate**: ~90% for unchanged dependencies

**Benefits**:
- Saves ~1-2 minutes per workflow
- Reduces GitHub Actions bandwidth

### Service Container Cache
- **PostgreSQL**: No caching (fresh database each run)
- **Redis**: No caching (fresh instance each run)

## Artifacts Storage

### CI Artifacts
- **Build outputs**: 5 days
- **Playwright reports**: 30 days

### Keep Times
- Short (5 days): Build artifacts for PR investigations
- Long (30 days): Test reports for trend analysis

## Notifications

### Slack Integration
- **On Deploy Success**: "🚀 Server/Client deployed successfully"
- **On Deploy Failure**: "⚠️ Deployment failed"
- **On All Complete**: "✅ All deployments completed successfully"

### GitHub Notifications
- **PR Comments**: Workflow status in PR
- **Branch Status**: Status checks on commits

## Security Considerations

### Secret Management
- All secrets masked in logs by GitHub Actions
- Secrets only available to authorized workflows
- Workflow file cannot directly print secrets

### Access Control
- Deploy workflow requires `production` environment (optional approval)
- Branch protection on `main` (optional PR reviews)

### Dependency Security
- npm ci (clean install, uses lock file)
- No sudo or elevated permissions needed
- Container isolation (GitHub Actions runners)

## Troubleshooting Guide

### Common Issues

**Linting fails**
- Check ESLint rules in `.eslintrc`
- Run `npm run lint` locally
- Fix issues and recommit

**Type checking fails**
- Check `tsconfig.json` settings
- Run `npm run build --workspaces -- --noEmit` locally
- Fix TypeScript errors

**Tests fail in CI but pass locally**
- Database/Redis availability
- Environment variable differences
- Different Node.js version (use 18.x)

**Build fails**
- Out of disk space (rare on GitHub Actions)
- Missing dependencies (check package.json)
- TypeScript compilation errors

**Deployment fails**
- Invalid secrets (check Railway/Vercel dashboards)
- Service quota exceeded (check Railway/Vercel usage)
- Database connection issues
- Check Railway/Vercel logs directly

## Performance Optimization Tips

### Reduce CI Time
1. **Cache npm dependencies**: Already configured (~2-3 min saved)
2. **Parallel jobs**: Jobs run in parallel where possible
3. **Limit E2E scope**: Run critical paths only
4. **Use workflows correctly**: Avoid redundant builds

### Reduce Deploy Time
1. **Use Railway preview deployments** for staging
2. **Pre-warm production resources** before deploy
3. **Monitor Railway/Vercel build times** separately

## Workflow File Locations

- CI: `.github/workflows/ci.yml`
- Deploy: `.github/workflows/deploy.yml`
- Documentation:
  - `GITHUB_SETUP.md` - Setup instructions
  - `DEPLOYMENT_GUIDE.md` - Deployment guide
  - `SECRETS_REFERENCE.md` - Secrets documentation

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Playwright Documentation](https://playwright.dev)
