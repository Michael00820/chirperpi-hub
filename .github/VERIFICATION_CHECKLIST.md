# CI/CD Verification Checklist

Use this checklist to verify that your GitHub Actions CI/CD pipeline is working correctly.

## Pre-Setup Verification

- [ ] GitHub repository is created and accessible
- [ ] GitHub Actions is enabled (Settings → Actions)
- [ ] `.github/workflows/ci.yml` exists
- [ ] `.github/workflows/deploy.yml` exists
- [ ] Node.js 18.x installed locally (`node --version`)
- [ ] npm 9+ installed locally (`npm --version`)

## Local Testing (Before GitHub)

```bash
cd /path/to/chirperpi-hub
```

- [ ] **Install dependencies**: `npm ci` (no errors)
- [ ] **Lint**: `npm run lint --workspaces` (no errors)
- [ ] **Type check**: `npm run build --workspaces -- --noEmit` (no errors)
- [ ] **Unit tests**: `npm test --workspaces` (all pass)
- [ ] **Build**: `npm run build --workspaces` (all succeed)
- [ ] **E2E tests**: `npm run test:e2e` (with mocked backend)

## GitHub Secrets Configuration

### Step 1: Verify Secrets Added

Go to: Settings → Secrets and variables → Actions

- [ ] `RAILWAY_TOKEN` (starts with Railway-specific format)
- [ ] `DATABASE_URL` (PostgreSQL connection string)
- [ ] `VERCEL_TOKEN` (Vercel token format)
- [ ] `VERCEL_ORG_ID` (organization ID or empty for personal)
- [ ] `VERCEL_PROJECT_ID` (project ID format)
- [ ] `VITE_API_URL` (full URL like https://api.example.com)
- [ ] `SLACK_WEBHOOK` (optional, starts with https://hooks.slack.com)

### Step 2: Validate Secret Values

For each secret, verify:
- [ ] No extra spaces before/after value
- [ ] Correct format for service (token, URL, etc.)
- [ ] Not accidentally committed to repository
- [ ] Regenerated tokens if over 6 months old

## Railway Setup Verification

- [ ] Railway project created and named "chirperpi"
- [ ] PostgreSQL plugin added to project
- [ ] Database URL copied correctly
- [ ] `DATABASE_URL` secret set in GitHub
- [ ] `RAILWAY_TOKEN` generated from account settings
- [ ] Environment variables configured in Railway
- [ ] Server service created in Railway project

### Test Railway Connection

```bash
# Verify token works
railway token verify

# List projects
railway projects

# Check deployed service
railway status
```

## Vercel Setup Verification

- [ ] Vercel project created (named "chirperpi-client" or similar)
- [ ] GitHub repository connected to Vercel
- [ ] Root directory set to `client`
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables configured:
  - [ ] `VITE_API_URL`
  - [ ] Other required env vars

### Test Vercel Connection

```bash
# Verify token works
vercel whoami

# Verify project link
vercel projects

# Check project details
vercel projects inspect
```

## CI Workflow Verification

### First CI Run

1. Make a test commit:
   ```bash
   git add .
   git commit -m "chore: setup CI/CD pipeline"
   git push origin develop  # or your test branch
   ```

2. Go to GitHub Actions tab
3. Watch the CI workflow run

### Verify Each Job

#### Lint & Type Check
- [ ] Job started successfully
- [ ] Node.js 18.x installed
- [ ] npm cache hit (or miss on first run)
- [ ] ESLint check passed
- [ ] TypeScript compilation passed
- [ ] Job duration ~2-3 minutes

#### Unit Tests
- [ ] Job started successfully
- [ ] PostgreSQL service started
- [ ] Redis service started
- [ ] Dependencies installed
- [ ] Database migrations ran
- [ ] Jest tests passed
- [ ] Vitest tests passed
- [ ] Coverage uploaded to codecov.io
- [ ] Job duration ~5-7 minutes

#### Build
- [ ] Job depends on lint (shown in workflow)
- [ ] Client build succeeded
- [ ] Server build succeeded
- [ ] Build artifacts uploaded
- [ ] Artifacts retention: 5 days
- [ ] Job duration ~3-4 minutes

#### E2E Tests
- [ ] Job depends on build (shown in workflow)
- [ ] Playwright browsers installed
- [ ] Tests ran successfully
- [ ] No browser crashes
- [ ] Job duration ~8-10 minutes
- [ ] Report uploaded (if needed for debugging)

#### Test Summary
- [ ] All previous jobs completed
- [ ] Summary shows all jobs passed
- [ ] Green checkmark on workflow

### CI Workflow Status

After first run:
- [ ] GitHub shows green checkmark on commit
- [ ] PR shows all status checks passing
- [ ] Workflow duration: 15-20 minutes total
- [ ] No failures or errors

## Deploy Workflow Verification

### Prerequisites for Deploy

- [ ] Commit is on `main` branch
- [ ] CI workflow passed successfully
- [ ] All secrets are configured
- [ ] Railway service is ready
- [ ] Vercel project is ready

### First Deploy Run

1. Create a test PR and merge to main (or push directly to main)
2. Go to GitHub Actions tab
3. Watch the Deploy workflow run

### Verify Each Job

#### Deploy Server
- [ ] Job started after CI passed
- [ ] Node.js 18.x installed
- [ ] Server built successfully
- [ ] Railway CLI installed
- [ ] Deploy command executed
- [ ] Database migrations ran successfully
- [ ] Slack notification sent (if configured)
- [ ] Job duration ~5-10 minutes

Check Railway:
- [ ] New deployment visible in Railway dashboard
- [ ] Deployment status: Active/Running
- [ ] Server is accessible via Railway URL
- [ ] No errors in Railway logs

#### Deploy Client
- [ ] Job started (parallel or after server)
- [ ] Client built with `VITE_API_URL` set
- [ ] Vercel deployment initiated
- [ ] Deployment completed successfully
- [ ] Slack notification sent (if configured)
- [ ] Job duration ~3-5 minutes

Check Vercel:
- [ ] New deployment visible in Vercel dashboard
- [ ] Deployment status: Ready
- [ ] Client is accessible via Vercel URL
- [ ] No build errors in Vercel logs

#### Deployment Notification
- [ ] Job ran after both deployments
- [ ] Status message sent to Slack (if configured)
- [ ] Message indicates success or failure

### Deploy Workflow Status

After first deploy:
- [ ] GitHub shows green checkmark on commit
- [ ] All deployment jobs succeeded
- [ ] Workflow duration: 10-20 minutes total
- [ ] Server and client both accessible

## Application Testing

### Verify Server is Running

```bash
# Test API endpoint
curl https://your-railway-app.railway.app/api/health

# Should return success response or 200 status
```

- [ ] API responds with 200 or expected status
- [ ] No connection errors
- [ ] Database queries work

### Verify Client is Running

1. Visit Vercel URL: `https://your-vercel-app.vercel.app`
2. Check browser console for errors
3. Verify API calls point to correct server

- [ ] Page loads without errors
- [ ] No CORS issues
- [ ] Network requests to API succeed
- [ ] Can navigate application
- [ ] Can login/authenticate

### Verify Integrations

- [ ] Slack webhooks post deployment messages
- [ ] CodeCov shows coverage data (if configured)
- [ ] GitHub status checks block PRs without passing CI
- [ ] Branch protection rules enforced

## Performance Verification

### Check Workflow Times

Go to Actions tab → Click workflow run → Check durations:

- [ ] CI Lint: < 3 minutes
- [ ] Unit Tests: < 8 minutes
- [ ] Build: < 5 minutes
- [ ] E2E Tests: < 12 minutes
- [ ] **Total CI**: < 25 minutes

- [ ] Deploy Server: < 15 minutes
- [ ] Deploy Client: < 8 minutes
- [ ] **Total Deploy**: < 25 minutes

### Check Cache Hit Rates

In GitHub Actions logs, verify npm cache:
- [ ] "Cache hit" messages appear
- [ ] Cache saves ~1-2 minutes on subsequent runs
- [ ] Cache key includes package.json hash

## Troubleshooting Checklist

### Workflow Won't Run

- [ ] `.github/workflows/` directory exists
- [ ] Workflow files have `.yml` extension
- [ ] YAML syntax is valid (no indentation errors)
- [ ] GitHub Actions enabled in Settings
- [ ] Workflow trigger conditions match your branch

### Workflow Fails During Linting

- [ ] Local linting passes: `npm run lint --workspaces`
- [ ] ESLint config is correct: `.eslintrc`
- [ ] Node version 18.x used in workflow
- [ ] Check lint output for specific errors

### Workflow Fails During Testing

- [ ] Local tests pass: `npm test --workspaces`
- [ ] Database/Redis services started (check logs)
- [ ] DATABASE_URL environment variable set
- [ ] REDIS_URL environment variable set
- [ ] TEST database exists in PostgreSQL

### Workflow Fails During Build

- [ ] Local build succeeds: `npm run build --workspaces`
- [ ] No TypeScript errors locally
- [ ] All imports resolve correctly
- [ ] Check build output in Actions logs

### Deploy Fails - Railway

- [ ] `RAILWAY_TOKEN` is valid (not expired)
- [ ] `DATABASE_URL` points to production database
- [ ] Railway service exists and is configured
- [ ] Environment variables set in Railway dashboard
- [ ] Check Railway logs for specific errors

### Deploy Fails - Vercel

- [ ] `VERCEL_TOKEN` is valid (not expired)
- [ ] `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- [ ] `VITE_API_URL` is set correctly
- [ ] Project settings in Vercel are correct
- [ ] Check Vercel logs for build/deployment errors

### Secrets Not Working

- [ ] Secret names are exact match (case-sensitive)
- [ ] No extra spaces in secret values
- [ ] Secrets added to correct repository (not organization)
- [ ] Workflow file references correct secret names
- [ ] Use `${{ secrets.SECRET_NAME }}` syntax

## Security Verification

- [ ] Secrets not visible in GitHub Actions logs
- [ ] No hardcoded credentials in workflow files
- [ ] Secrets only available in appropriate jobs
- [ ] Branch protection rules enabled
- [ ] Only authorized users can merge to main
- [ ] Deployment environment approval gates working
- [ ] Audit log shows all secret accesses

## Success Criteria

✅ **You're done when:**

1. ✅ CI workflow passes on every commit
2. ✅ Deploy workflow runs and succeeds on main branch
3. ✅ Server deployed and accessible via Railway
4. ✅ Client deployed and accessible via Vercel
5. ✅ Slack notifications sent (if configured)
6. ✅ All status badges show green
7. ✅ Team can track deployments in GitHub Actions
8. ✅ Automated tests catch issues before production
9. ✅ Database migrations run automatically
10. ✅ No manual deployment steps needed

## Maintenance

Perform these tasks regularly:

### Weekly
- [ ] Check GitHub Actions for failed workflows
- [ ] Review deployment status in Railway/Vercel
- [ ] Check application error logs

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review security advisories
- [ ] Check workflow execution times

### Quarterly
- [ ] Rotate tokens and secrets
- [ ] Review branch protection rules
- [ ] Update documentation if workflow changes

---

**Last Updated**: May 5, 2026
**Status**: Complete
**Next Step**: Follow `.github/GITHUB_SETUP.md` if not already started
