# ChirperPi Hub - Security Hardening Guide

## Overview
This document outlines the security measures implemented in ChirperPi Hub for production deployment.

---

## 1. Server Security

### 1.1 Helmet.js with Content Security Policy (CSP)

**File**: `server/src/app.ts`

Helmet.js provides secure HTTP headers:

- **Content Security Policy (CSP)**: Prevents injection attacks
  - Restricts scripts to self + unsafe-inline (for React development)
  - Restricts styles to self + unsafe-inline
  - Images from self, data URIs, and HTTPS
  - Connections only to self and CLIENT_URL

- **HSTS (HTTP Strict-Transport-Security)**: 
  - 1-year max age, includes subdomains, preload enabled
  - Forces HTTPS in all future connections

- **Frameguard**: Prevents clickjacking attacks (`X-Frame-Options: DENY`)
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Legacy XSS protection header
- **Referrer-Policy**: Limits referrer information

### 1.2 Trust Proxy Configuration

**Setting**: `app.set('trust proxy', 1)`

- Essential when running behind reverse proxy (load balancer, Docker, K8s, etc.)
- Ensures correct IP addresses for rate limiting and logging
- Properly sets `X-Forwarded-*` headers in production

### 1.3 CORS Configuration

**Restrictions**:
- Origin: Limited to `CLIENT_URL` environment variable (e.g., `http://localhost:5173`)
- Credentials: Allowed for sessions and cookies
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-CSRF-Token

**Production Setup**: Always set CLIENT_URL to your frontend domain, never use `*`

---

## 2. Rate Limiting

**File**: `server/src/app.ts`

### 2.1 General API Rate Limiting
- **Limit**: 100 requests per minute per IP
- **Applied To**: All `/api/*` routes
- **Headers**: Standard RateLimit-* headers included

### 2.2 Strict Authentication Rate Limiting
- **Limit**: 10 requests per minute per IP
- **Applied To**: 
  - `/api/auth/pi` - Pi Network authentication
  - `/api/auth/refresh` - Token refresh
  - `/api/auth/logout` - Logout

**Purpose**: Prevents brute force attacks on authentication endpoints

---

## 3. Authentication & Token Security

### 3.1 JWT Token Expiry Strategy

**File**: `server/src/services/authService.ts`

- **Access Token**: 15-minute expiry
  - Used for API requests
  - Short-lived to limit exposure if compromised
  - `Authorization: Bearer <access_token>`

- **Refresh Token**: 7-day expiry
  - Stored in httpOnly cookie
  - Used to obtain new access tokens
  - More secure than localStorage (XSS-proof)

### 3.2 Token Refresh Flow

**Endpoint**: `POST /api/auth/refresh`

```javascript
// Client-side
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Send httpOnly cookie
});
const { token, expiresIn } = await response.json();
// Use new token for API calls
```

**Refresh Token Cookie Settings**:
- `httpOnly: true` - Not accessible via JavaScript (XSS protection)
- `secure: true` (production only) - Only sent over HTTPS
- `sameSite: 'strict'` - CSRF protection
- `maxAge: 7 days` - Expires after 7 days

### 3.3 Token Blacklist for Logout

**Files**:
- `server/src/middleware/tokenBlacklistMiddleware.ts`
- `server/src/routes/auth.ts`

**Implementation**:
1. On logout, access token is added to Redis blacklist
2. Blacklist entry expires after token's remaining lifetime
3. `authenticateToken` middleware checks blacklist before allowing access
4. Prevents token reuse after logout

**Blacklist Storage**: Redis with automatic expiration (TTL)

### 3.4 CSRF Protection

**Files**:
- `server/src/app.ts` - csurf middleware
- `server/src/routes/auth.ts` - GET `/api/auth/csrf-token`

**Configuration**:
- `cookie: false` - Tokens stored in session/request, not cookies
- `ignoreMethods: ['GET', 'HEAD', 'OPTIONS']` - Only protect state-changing requests
- Client retrieves token via `GET /api/auth/csrf-token`
- Token sent in `X-CSRF-Token` header or form field

**Frontend Usage**:
```javascript
// 1. Get CSRF token
const csrfResponse = await fetch('/api/auth/csrf-token');
const { csrfToken } = await csrfResponse.json();

// 2. Include in POST/PUT/PATCH/DELETE requests
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ content: 'Hello world' })
});
```

---

## 4. Input Validation & Sanitization

### 4.1 XSS Prevention via Sanitization

**File**: `server/src/middleware/sanitizeMiddleware.ts`

- Automatically sanitizes all request bodies, query params, and route params
- Uses `xss` library to strip malicious HTML/JavaScript
- Applied before route handlers receive data
- Trims whitespace

### 4.2 Input Validation with express-validator

**File**: `server/src/middleware/validators.ts`

**Purpose**: Validates input types, lengths, and formats before processing

**Key Validators**:

| Field | Constraints | Purpose |
|-------|-------------|---------|
| username | 3-32 chars, alphanumeric + underscore | Prevent injection, enforce format |
| displayName | 1-100 chars | Limit storage, prevent DoS |
| bio | 0-500 chars | Database column size limit |
| password | 8-128 chars, uppercase + lowercase + number + special | Password strength |
| email | Valid email format, normalized | Standard email validation |
| postContent | 1-280 chars | Application constraint |
| commentContent | 1-500 chars | Application constraint |
| groupName | 1-100 chars | Database constraint |
| pi_amount | 0.01-1000 | Transaction limits |
| page | Positive integer | Pagination safety |
| limit | 1-100 | Prevent large result sets |
| search_query | 1-100 chars | Search optimization |

**Usage in Routes**:
```typescript
import { Router } from 'express';
import { validatePostContent, handleValidationErrors } from '../middleware/validators';

const router = Router();

router.post('/', 
  validatePostContent,
  handleValidationErrors,
  async (req, res) => {
    // req.body.content is now validated and sanitized
  }
);
```

### 4.3 Database Query Parameterization

**All queries use parameterized statements** (verified in services):

```typescript
// ✅ SECURE - Parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE username = $1',
  [username]
);

// ❌ DANGEROUS - String concatenation (NEVER DO THIS)
const result = await pool.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

---

## 5. Session Security

**File**: `server/src/app.ts`

### Session Configuration
- **Store**: Redis (distributed sessions, survives server restarts)
- **Secret**: Uses `JWT_SECRET` or `SESSION_SECRET`
- **httpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only sent over HTTPS in production
- **sameSite**: 'lax' - Prevents CSRF token leakage
- **maxAge**: 24 hours

---

## 6. Request Body Limits

**File**: `server/src/app.ts`

```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

- Prevents large payload DoS attacks
- Reasonable limit for file uploads via base64/multipart
- Adjust down for stricter constraints

---

## 7. Environment Variables

**File**: `.env.example`

All sensitive configuration via environment variables:

```bash
# Generated secrets (never hardcoded)
JWT_SECRET=<generate-with-crypto-randomBytes>
JWT_REFRESH_SECRET=<generate-with-crypto-randomBytes>
SESSION_SECRET=<generate-with-crypto-randomBytes>

# API Keys
PI_API_KEY=<from-pi-network-dashboard>
PINATA_API_KEY=<from-pinata-dashboard>

# URLs (environment-specific)
CLIENT_URL=https://your-domain.com
DATABASE_URL=postgresql://prod-connection-string
REDIS_URL=redis://prod-redis:6379
```

**Generation**: Use secure random:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 8. Database Security

### 8.1 Connection Pooling

**File**: `server/src/app.ts`

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Connection pool size
  idleTimeoutMillis: 30000,     // Close idle connections
  connectionTimeoutMillis: 2000 // Fail fast on connection issues
});
```

### 8.2 Parameterized Queries

All database interactions use parameterized queries (verified in codebase).

### 8.3 Input Length Validation

Validators enforce length limits matching database schema:

```typescript
// Validator
export const validateBio = body('bio')
  .optional()
  .trim()
  .isLength({ max: 500 })
  .withMessage('Bio must be 500 characters or less');

// Database schema
ALTER TABLE profiles ADD COLUMN bio VARCHAR(500);
```

---

## 9. Logging & Monitoring

### 9.1 Sentry Integration

**File**: `server/src/sentry.ts`

- Captures errors and exceptions
- Tracks performance metrics
- Environment-tagged for filtering (dev/staging/prod)
- Sensitive data filtering (payment tokens, passwords)

### 9.2 Rate Limit Headers

All rate-limited endpoints return standard headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1704067200
```

---

## 10. Production Deployment Checklist

### Before Going Live

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS URLs for `CLIENT_URL` and `SERVER_URL`
- [ ] Generate unique, strong secrets:
  - JWT_SECRET
  - JWT_REFRESH_SECRET
  - SESSION_SECRET
- [ ] Configure database with SSL/TLS
- [ ] Set up Redis with password authentication
- [ ] Enable Sentry monitoring
- [ ] Configure backup strategy
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable HSTS preload in browser security headers
- [ ] Test CSRF protection on all state-changing endpoints
- [ ] Verify rate limits don't block legitimate traffic
- [ ] Test token refresh flow
- [ ] Test logout revokes tokens
- [ ] Verify helmet CSP headers don't block resources
- [ ] Enable HTTPS strict mode

### Ongoing Security

- [ ] Monitor Sentry for new error patterns
- [ ] Review rate limit metrics
- [ ] Audit API logs for suspicious patterns
- [ ] Regularly rotate secrets (quarterly minimum)
- [ ] Keep dependencies updated
- [ ] Run OWASP security scanners periodically
- [ ] Penetration test before major releases

---

## 11. Common Security Vulnerabilities Addressed

| OWASP Top 10 | Mitigation |
|--------------|-----------|
| SQL Injection | Parameterized queries throughout |
| Authentication | JWT + refresh tokens + token blacklist + rate limiting |
| Sensitive Data | HTTPS enforced, httpOnly cookies, input sanitization |
| XML External Entities | Express.json only (no XML parsing) |
| Broken Access Control | authenticateToken middleware on protected routes |
| Security Misconfiguration | Helmet.js, CSP headers, trust proxy |
| XSS | XSS sanitization middleware, httpOnly cookies |
| Insecure Deserialization | JWT tokens (no unsafe deserialization) |
| Using Components with Known Vulns | Regular npm audit, dependency updates |
| Insufficient Logging | Sentry integration, error tracking |

---

## 12. API Security Summary

### Public Endpoints (No Auth Required)
- `GET /api/posts/:id` - View single post
- `GET /api/users/:username` - View profile
- `GET /api/auth/csrf-token` - Get CSRF token
- `POST /api/auth/pi` - Pi Network login

### Protected Endpoints (Auth Required)
- `POST /api/posts` - Create post
- `PUT /api/users/profile` - Update profile
- `POST /api/posts/:id/like` - Like post
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout (blacklist token)

### Rate Limited Endpoints
- **Auth** (10 req/min): `/api/auth/pi`, `/api/auth/refresh`, `/api/auth/logout`
- **All API** (100 req/min): All `/api/*` routes

---

## 13. Reference Implementation

### Adding Security to New Routes

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { validatePostContent, handleValidationErrors } from '../middleware/validators';
import csurf from 'csurf';

const router = Router();

// Public endpoint (validated input, no auth)
router.get('/search', [
  validateSearchQuery,
  validateLimit,
  handleValidationErrors
], async (req, res) => {
  const { q, limit } = req.query;
  // q and limit are validated and sanitized
});

// Protected endpoint (auth required, input validated, CSRF protected)
router.post('/',
  authenticateToken,
  [validatePostContent, handleValidationErrors],
  async (req, res) => {
    const userId = req.user!.userId;
    const { content } = req.body;
    // User authenticated, input validated, CSRF token verified
  }
);

export { router };
```

---

## Questions?

For security concerns or potential vulnerabilities, refer to:
- OWASP Top 10: https://owasp.org/Top10/
- Express.js Security: https://expressjs.com/en/advanced/best-practice-security.html
- Node.js Security: https://nodejs.org/en/docs/guides/security/
