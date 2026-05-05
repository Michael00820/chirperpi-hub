# GitHub Setup Instructions

Quick-start guide to enable CI/CD for a new ChirperPi Hub repository.

## Phase 1: Repository Configuration (5 minutes)

1. **Enable GitHub Actions**
   - Repository → Settings → Actions → General
   - Allow all actions and reusable workflows
   - Save

2. **Configure Branch Protection** (optional but recommended)
   - Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Require pull request reviews: ✓
   - Require status checks to pass:
     - `lint` (linting and type checking)
     - `unit-tests` (server + client tests)
     - `build` (production build verification)
     - `e2e-tests` (Playwright tests)
   - Save

3. **Configure Environments** (for deployment secrets)
   - Settings → Environments → New environment
   - Name: `production`
   - Deployment branches: `main`
   - Required reviewers: (optional) Your team members
   - Save

## Phase 2: Secret Configuration (10-15 minutes)

See [SECRETS_REFERENCE.md](./SECRETS_REFERENCE.md) for detailed instructions.

Quick checklist:
- [ ] Railway account and API token
- [ ] Vercel account and credentials
- [ ] Production database connection string
- [ ] (Optional) Slack webhook for notifications

## Phase 3: Railway Setup (10 minutes)

1. **Create Railway Project**
   - Go to railway.app
   - Create new project named "chirperpi"

2. **Add PostgreSQL Plugin**
   - Project → Plugins → PostgreSQL
   - Accept defaults
   - Note the connection string (for DATABASE_URL secret)

3. **Connect GitHub Repository**
   - Project → Connect GitHub
   - Select your chirperpi-hub repository
   - Select `server` directory

4. **Configure Environment Variables**
   - Project → Environment
   - Set variables from `server/.env.example`
   - Make sure `DATABASE_URL` matches PostgreSQL plugin

5. **Deploy Initial Version** (optional)
   - First push to main will trigger deployment automatically

## Phase 4: Vercel Setup (10 minutes)

1. **Create Vercel Project**
   - Go to vercel.com
   - Create new project
   - Import GitHub repository
   - Select Framework: Vite
   - Root Directory: `client`

2. **Configure Environment**
   - Project Settings → Environment Variables
   - Add `VITE_API_URL` (production API URL)
   - Add other variables from `client/.env.example`

3. **Link Repository**
   - Project → Git Integration → Connect
   - Set Production Branch to `main`

## Phase 5: GitHub Secrets Configuration (5 minutes)

Add to Settings → Secrets and variables → Actions:

```
RAILWAY_TOKEN=<your-railway-token>
DATABASE_URL=<railway-postgres-url>
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
VITE_API_URL=<production-api-url>
SLACK_WEBHOOK=<optional-slack-webhook>
```

## Phase 6: Test the Workflow

1. **Make a test commit**
   ```bash
   git add .
   git commit -m "chore: setup CI/CD pipeline"
   git push origin main
   ```

2. **Monitor CI workflow**
   - Go to Actions tab
   - Watch CI workflow complete all steps
   - Check for any failures in:
     - Linting
     - Type checking
     - Unit tests
     - Build

3. **After CI passes, deploy is triggered**
   - Deploy workflow should start automatically
   - Monitor Railway and Vercel deployments
   - Check Slack for notifications (if configured)

## Verifying the Setup

### CI Workflow
- [ ] GitHub Actions tab shows "CI" workflow running
- [ ] All jobs pass (lint, unit-tests, build, e2e-tests)
- [ ] Coverage report uploaded to codecov

### Deploy Workflow (only on main branch)
- [ ] Railway deployment completes
- [ ] Database migrations run successfully
- [ ] Vercel deployment completes
- [ ] Slack notification received (if configured)

### Application Health
- [ ] Client accessible at Vercel URL
- [ ] Server API responds at Railway URL
- [ ] Database connection verified
- [ ] Can log in with test credentials

## Troubleshooting Setup

### CI fails with "Cannot find module"
- [ ] Run `npm ci` locally to verify dependencies
- [ ] Check for typos in package.json
- [ ] Check Node.js version (18.x required)

### Tests fail in CI but pass locally
- [ ] Common causes:
  - Database/Redis not available
  - Environment variables not set
  - Different Node.js version
- [ ] Check CI logs for specific errors

### Deploy fails
- [ ] Check Railway service health
- [ ] Verify `RAILWAY_TOKEN` is not expired
- [ ] Check Vercel project ID/token
- [ ] Review deployment logs in railway.app and vercel.com

### Slack notifications don't appear
- [ ] Verify webhook URL is correct (starts with https://hooks.slack.com)
- [ ] Check webhook is not expired
- [ ] Check Slack app has permission to post to channel

## Post-Setup Maintenance

### Weekly
- Monitor GitHub Actions for failed workflows
- Check application health (client + server uptime)

### Monthly
- Review and update dependencies
- Check for security advisories
- Rotate secrets that haven't changed in 90 days

### As-needed
- Update workflow files when deployment strategy changes
- Add new secrets if new services are added
- Adjust branch protection rules based on team needs

## Quick Reference Commands

```bash
# Test locally before pushing
npm run lint --workspaces      # Linting
npm run build --workspaces -- --noEmit  # Type check
npm test --workspaces          # Unit tests
npm run test:e2e               # E2E tests
npm run build --workspaces     # Production build

# Monitor deployments
railway logs                   # View server logs
vercel logs                    # View client logs

# Rollback if needed
railway up --service chirperpi-server  # Rollback server
vercel --prod --target production      # Rollback client
```

## Support

For detailed setup instructions, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment documentation
- [SECRETS_REFERENCE.md](./SECRETS_REFERENCE.md) - GitHub secrets reference
- Workflow files: `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`
