# GitHub Secrets Configuration Reference

This file documents all GitHub Secrets required for the CI/CD pipeline. 
**Do NOT commit actual secret values - these are examples only.**

## Overview

Store all secrets in GitHub Settings → Secrets and variables → Actions

## Required Secrets for Deployment

### Railway (Server Deployment)

**RAILWAY_TOKEN**
- Description: Railway API authentication token
- Where to get: railway.app → Account → API Tokens
- Format: Long alphanumeric string
- Required: Yes
- Used in: deploy.yml (server deployment)

**DATABASE_URL**
- Description: Production PostgreSQL connection string
- Format: `postgresql://username:password@host:port/database?sslmode=require`
- Required: Yes
- Used in: CI (testing), deploy.yml (migrations)
- Security: Contains credentials, keep private

### Vercel (Client Deployment)

**VERCEL_TOKEN**
- Description: Vercel API authentication token for CLI access
- Where to get: vercel.com → Account Settings → Tokens
- Format: Long alphanumeric string
- Required: Yes
- Used in: deploy.yml (client deployment)
- Security: Full API access token

**VERCEL_ORG_ID**
- Description: Vercel organization/team ID
- Where to get: Run `vercel link` in project directory, or Vercel Dashboard
- Format: Short alphanumeric string or empty for personal account
- Required: Yes (can be empty for personal projects)
- Used in: deploy.yml (client deployment)

**VERCEL_PROJECT_ID**
- Description: Vercel project ID
- Where to get: Vercel Dashboard → Project Settings → General
- Format: Long alphanumeric string
- Required: Yes
- Used in: deploy.yml (client deployment)

### Application Configuration

**VITE_API_URL**
- Description: Production API URL for client
- Format: `https://your-server-domain.com/api`
- Required: Yes
- Used in: deploy.yml (client build)
- Example: `https://chirperpi-api.railway.app/api`

## Optional Secrets for Notifications

### Slack Notifications

**SLACK_WEBHOOK**
- Description: Slack incoming webhook URL for deployment notifications
- Where to get: Your Slack workspace → App settings → Incoming Webhooks
- Format: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
- Required: No (notifications will be skipped if missing)
- Used in: deploy.yml (status notifications)
- Security: Channel-specific, can be regenerated easily

## Quick Setup Checklist

- [ ] Create Railway project and PostgreSQL plugin
- [ ] Copy Railway API token to `RAILWAY_TOKEN`
- [ ] Copy production database URL to `DATABASE_URL`
- [ ] Create Vercel project and link GitHub
- [ ] Copy Vercel token to `VERCEL_TOKEN`
- [ ] Copy Vercel org ID to `VERCEL_ORG_ID` (can be empty)
- [ ] Copy Vercel project ID to `VERCEL_PROJECT_ID`
- [ ] Set `VITE_API_URL` to production API endpoint
- [ ] (Optional) Add Slack webhook to `SLACK_WEBHOOK`

## Validating Secrets

### Test Railway Token
```bash
railway token
railway projects
```

### Test Vercel Token
```bash
vercel whoami
vercel link
```

### Verify Database Connection
```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Test Slack Webhook (if configured)
```bash
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test notification"}'
```

## Security Best Practices

1. **Rotation**: Rotate tokens every 90 days
2. **Scoping**: Use most restrictive permissions needed
   - Railway: Project-specific tokens when possible
   - Vercel: Avoid full account access if not needed
3. **Monitoring**: Check GitHub Actions logs don't expose secrets (GitHub masks them)
4. **Revocation**: Immediately revoke if compromised
   - Railway: Delete token in Account settings
   - Vercel: Delete token in Account settings
5. **Audit**: Review who has access to repository settings

## Regenerating Secrets

### If RAILWAY_TOKEN is compromised:
1. Go to railway.app → Account → API Tokens
2. Delete the compromised token
3. Create a new token
4. Update GitHub secret

### If VERCEL_TOKEN is compromised:
1. Go to vercel.com → Account Settings → Tokens
2. Delete the compromised token
3. Create a new token
4. Update GitHub secret

### If DATABASE_URL is compromised:
1. Update PostgreSQL user password
2. Update the connection string
3. Update GitHub secret
4. Restart database service

## Troubleshooting

### Workflow fails with "Secrets not available"
- Check: Secret name matches exactly (case-sensitive)
- Check: Secret is added to the repository, not organization
- Fix: Go to Settings → Secrets → recreate if needed

### Railway deployment fails
- Check: `RAILWAY_TOKEN` is valid and not expired
- Check: `DATABASE_URL` is correct format
- Fix: Regenerate token and test with `railway projects`

### Vercel deployment fails
- Check: `VERCEL_TOKEN` has appropriate permissions
- Check: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Fix: Run `vercel link` to verify IDs

### Database migrations fail
- Check: `DATABASE_URL` points to production database
- Check: User has CREATE/ALTER TABLE permissions
- Fix: Verify PostgreSQL user permissions

## References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Railway API Documentation](https://docs.railway.app/reference/api)
- [Vercel API Documentation](https://vercel.com/docs/cli)
- [Slack Webhook Documentation](https://api.slack.com/messaging/webhooks)
