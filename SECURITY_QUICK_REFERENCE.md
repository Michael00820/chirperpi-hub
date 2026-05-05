# ChirperPi Hub - Security Quick Reference

## Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate all three at once
node -e "console.log('JWT_SECRET='+require('crypto').randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET='+require('crypto').randomBytes(32).toString('hex')); console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('hex'))"
```

---

## Environment Setup

### Development
```bash
# Copy example to .env
cp .env.example .env

# Edit with development values
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:password@localhost:5432/chirperpi
REDIS_URL=redis://localhost:6379
```

### Production
```bash
# Copy example to .env
cp .env.example .env

# Edit with production values
NODE_ENV=production
CLIENT_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/chirperpi
REDIS_URL=redis://:password@prod-redis:6379
SENTRY_DSN=https://your-key@sentry.io/project-id
```

---

## Deployment

### Pre-Deployment Checks
```bash
# Install dependencies
npm ci

# Run TypeScript check
npm run build

# Run migrations
npm run migrate

# Start server (test)
NODE_ENV=production npm start
```

### Docker Deployment
```bash
# Build image
docker build -f server/Dockerfile -t chirperpi-server:latest .

# Run container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e CLIENT_URL=https://your-domain.com \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=<your-secret> \
  -e JWT_REFRESH_SECRET=<your-refresh-secret> \
  -e SESSION_SECRET=<your-session-secret> \
  chirperpi-server:latest
```

---

## Security Testing

### Test Token Refresh
```bash
# Get CSRF token
curl -X GET http://localhost:3001/api/auth/csrf-token

# Login with Pi
curl -X POST http://localhost:3001/api/auth/pi \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"accessToken":"<pi-token>"}'

# Note: Save the refreshToken from response cookies

# Refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Cookie: refreshToken=<token>" \
  -H "X-CSRF-Token: <token>"
```

### Test Rate Limiting
```bash
# Send 101 requests in quick succession
for i in {1..101}; do
  curl -X GET http://localhost:3001/api/posts \
    -H "Authorization: Bearer <token>"
done

# Should get rate limit error on request 101
```

### Test Input Validation
```bash
# Invalid username (too short)
curl -X POST http://localhost:3001/api/users/search \
  -d '{"username":"ab"}' \
  -H "Content-Type: application/json"

# Returns: {"error":"Validation failed","details":[...]}
```

### Test CSRF Protection
```bash
# POST without CSRF token
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content":"Hello"}'

# Returns: 403 Forbidden (missing CSRF token)
```

---

## Monitoring Commands

### View Logs
```bash
# Development
npm run dev

# Production (Docker)
docker logs <container-id> -f

# Sentry dashboard
# https://sentry.io/projects/<org>/<project>/
```

### Check Rate Limits
```bash
# Install jq for JSON parsing
npm install -g jq

# Make a request and check headers
curl -v http://localhost:3001/api/posts \
  -H "Authorization: Bearer <token>" 2>&1 | grep -i ratelimit

# Output:
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: 1704067200
```

### Check Security Headers
```bash
# View all security headers
curl -I https://your-domain.com | grep -E "^(Strict-Transport|Content-Security|X-Frame|X-Content)"

# Expected output:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

---

## Common Issues & Solutions

### JWT Secret Not Set
```bash
# Error: Cannot read property 'split' of undefined
# Solution: Set JWT_SECRET in .env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### CORS Error
```bash
# Error: CORS policy: No 'Access-Control-Allow-Origin'
# Solution: Check CLIENT_URL matches frontend domain
# In .env:
CLIENT_URL=https://your-frontend-domain.com
```

### Rate Limited
```bash
# Error: Too many requests from this IP
# Solution: Wait 1 minute or check if legitimate (first 100 requests)
# For testing: Use VPN or wait for rate limit window to reset
```

### Token Blacklist Not Working
```bash
# Error: Can use token after logout
# Solution: Ensure Redis is running and connected
# Check: redis-cli ping (should return PONG)
```

### Session Not Persisting
```bash
# Error: User logged out after refresh
# Solution: Ensure Redis connection in .env
# Check: redis-cli -u $REDIS_URL ping
```

---

## Maintenance Tasks

### Daily
- Monitor Sentry for new errors
- Check API response times

### Weekly
- Review rate limit metrics
- Audit access logs

### Monthly
- Check dependency updates (`npm audit`)
- Update security patches

### Quarterly
- Rotate JWT_SECRET and JWT_REFRESH_SECRET
- Run security scan (OWASP ZAP)
- Review/update validator rules

### Annually
- Penetration test
- Full security audit
- Update CORS, CSP, HSTS policies

---

## Scaling Considerations

### Session Affinity
- Ensure sticky sessions for load balancers (token blacklist in Redis)
- Redis Cluster for multi-instance deployments

### Rate Limiting
- In Docker Swarm/K8s, use distributed rate limiter
- Consider Redis-based rate limiting for multi-instance

### Database Connections
- Adjust pool.max for production load
- Use connection pooler (PgBouncer) for many instances

### Token Refresh
- Refresh tokens can be rate-limited per user
- Consider implementing refresh token rotation

---

## Certificate Management

### Let's Encrypt (Free SSL)
```bash
# Using Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renew
sudo certbot renew --dry-run
```

### Production HTTPS Setup
```bash
# In nginx.conf
server {
  listen 443 ssl http2;
  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
}
```

---

## Backup Strategy

### Daily Backup
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress and upload
gzip backup-$(date +%Y%m%d).sql
aws s3 cp backup-*.sql.gz s3://your-bucket/backups/
```

### Restore from Backup
```bash
# Download and restore
aws s3 cp s3://your-bucket/backups/backup-20260504.sql.gz .
gunzip backup-20260504.sql.gz
psql $DATABASE_URL < backup-20260504.sql
```

---

## Health Checks

### API Health
```bash
# Check if server is running
curl -X GET http://localhost:3001/health 2>/dev/null || echo "Server down"

# Check database connection
curl -X GET http://localhost:3001/api/posts -H "Authorization: Bearer <token>" \
  | jq '.[] | .id' | head -1
```

### Redis Health
```bash
# Check Redis connection
redis-cli ping

# Check used memory
redis-cli info memory | grep used_memory_human
```

### Database Health
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Emergency Response

### Compromised Secret
1. Generate new SECRET (see Generate Secrets section)
2. Update .env immediately
3. Restart all server instances
4. Notify users to re-authenticate
5. Audit access logs for suspicious activity

### DDoS Attack
1. Check rate limiting working (should block requests)
2. Consider WAF (Cloudflare, AWS WAF)
3. Scale horizontally (add more instances)
4. Check database performance

### Database Corruption
1. Restore from most recent backup
2. Run migrations: `npm run migrate`
3. Verify data integrity
4. Review error logs for cause

### Token Blacklist Failed
1. Check Redis connection
2. Restart Redis if needed
3. Clear expired blacklist entries
4. Restart server

---

## Security Checklist - Pre-Production

- [ ] All .env variables set with production values
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are unique, strong, and different
- [ ] DATABASE_URL uses SSL/TLS connection
- [ ] REDIS_URL includes password authentication
- [ ] SENTRY_DSN configured for error tracking
- [ ] CLIENT_URL matches exact frontend domain
- [ ] NODE_ENV=production set
- [ ] HTTPS certificate obtained and installed
- [ ] Firewall rules configured (allow 443, 3001 internally)
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured
- [ ] Rate limiting tested and reasonable
- [ ] Security headers verified (curl -I https://domain)
- [ ] CSRF protection tested on POST endpoints
- [ ] Token refresh tested and working
- [ ] Logout tested and token invalidated
- [ ] Input validation tested with invalid data
- [ ] Database connection pooling configured
- [ ] Redis connection tested
- [ ] Sentry errors visible and alerts working

---

## Quick Commands

```bash
# Check server status
curl -X GET http://localhost:3001/health

# Verify security headers
curl -I https://your-domain.com | grep -E "^(Strict|Content-Security|X-Frame)"

# Check dependencies for vulnerabilities
npm audit

# Run linter
npm run lint

# Build for production
npm run build

# Start server
NODE_ENV=production npm start

# Run migrations
npm run migrate

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Check Redis
redis-cli ping

# View logs (Docker)
docker logs <container-id> -f

# Scale to 3 instances (Docker Compose)
docker-compose up -d --scale server=3
```

---

## Support

For detailed documentation, see:
- `SECURITY.md` - Full security guide
- `VALIDATORS_USAGE_GUIDE.md` - Input validation guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps
- `.env.example` - All configuration variables

