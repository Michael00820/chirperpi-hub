import express from 'express';
import cors from 'cors';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import ConnectRedis from 'connect-redis';
import rateLimit from 'express-rate-limit';
import { pool, redisClient, getRedis } from './infrastructure/clients';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { postsRouter } from './routes/posts';
import { groupsRouter } from './routes/groups';
import { notificationsRouter } from './routes/notifications';
import { transactionsRouter } from './routes/transactions';
import proposalRouter from './routes/proposals';
import { messagingRouter } from './routes/messaging';
import { exploreRouter } from './routes/explore';
import { errorHandler } from './middleware/errorHandler';
import { sanitizeRequest } from './middleware/sanitizeMiddleware';
import { checkTokenBlacklist } from './middleware/tokenBlacklistMiddleware';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './sentry';
import { requestIdMiddleware } from './middleware/requestIdMiddleware';
import { requestLoggingMiddleware } from './middleware/requestLoggingMiddleware';
import { rateLimitHeadersMiddleware } from './middleware/rateLimitHeadersMiddleware';
import { monitoringRouter } from './routes/monitoring';
import { statsRouter } from './routes/stats';
import { PostService } from './services/postService';

dotenv.config();

export { pool, redisClient };

// Ensure Redis is connected before session store is initialized below.
getRedis().catch((err) => console.error('Redis connect failed:', err));

initSentry();

export const app: import('express').Application = express();

// Trust proxy - important for production behind reverse proxy
app.set('trust proxy', 1);

// Sentry request handler - must be first
app.use(sentryRequestHandler());

// Security headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  })
);
app.use('/api/transactions/webhook', express.raw({ type: 'application/json', limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(sanitizeRequest);
app.use(checkTokenBlacklist);

// Request tracking middleware
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);

// Rate limit headers middleware
app.use(rateLimitHeadersMiddleware());

const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET (or JWT_SECRET) must be set in production');
  }
  console.warn('SESSION_SECRET not set — using insecure dev fallback. Do not use in production.');
}

app.use(
  session({
    store: new ConnectRedis({ client: redisClient }),
    secret: sessionSecret || 'dev-only-insecure-fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

const csrfMiddleware = csurf({
  cookie: false,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
}) as any;

// Routes that legitimately bypass CSRF: payment webhook (HMAC-verified) and
// auth endpoints used before a CSRF cookie is established (Pi sign-in,
// refresh, logout, verify).
const CSRF_BYPASS_PREFIXES = [
  '/api/transactions/webhook',
  '/api/auth/pi',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify'
];

app.use((req, res, next) => {
  if (CSRF_BYPASS_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  return csrfMiddleware(req, res, next);
});

// General API rate limiting (100 requests per minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for auth endpoints (10 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/proposals', proposalRouter);
app.use('/api/messaging', messagingRouter);
app.use('/api/explore', exploreRouter);

// Monitoring and health check routes
app.use('/api', monitoringRouter);
app.use('/api', statsRouter);

app.get('/api/timeline', async (req, res) => {
  try {
    const filter = (req.query.filter as string) || 'latest';
    const cursor = req.query.cursor as string;
    const timeline = await PostService.getTimeline(filter as any, cursor, (req.user as any)?.userId);
    res.json(timeline);
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Sentry error handler - must be before custom error handler
app.use(sentryErrorHandler());

// Custom error handler
app.use(errorHandler);
