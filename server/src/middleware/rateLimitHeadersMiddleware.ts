/**
 * Rate limit headers middleware
 * Adds X-RateLimit-* headers to all API responses
 * Tracks request count per user/IP for a time window
 */

import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../app';

interface RateLimitConfig {
  maxRequests: number; // requests per window
  windowMs: number;    // time window in milliseconds
}

// Default: 100 requests per 15 minutes per IP/user
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000 // 15 minutes
};

/**
 * Get rate limit key (user ID if authenticated, otherwise IP)
 */
const getRateLimitKey = (req: Request): string => {
  if (req.user?.userId) {
    return `ratelimit:user:${req.user.userId}`;
  }
  return `ratelimit:ip:${req.ip || 'unknown'}`;
};

/**
 * Rate limit headers middleware
 */
export const rateLimitHeadersMiddleware = (config: RateLimitConfig = DEFAULT_CONFIG) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimitKey(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get or create rate limit data
      const data = await redisClient.get(key);
      let requestCount = 0;
      let windowStartTime = now;

      if (data) {
        const parsed = JSON.parse(data);
        // If we're still in the same window
        if (parsed.windowStart > windowStart) {
          requestCount = parsed.count;
          windowStartTime = parsed.windowStart;
        }
      }

      // Increment counter
      requestCount++;

      // Store updated data
      const resetTime = windowStartTime + config.windowMs;
      await redisClient.set(
        key,
        JSON.stringify({ count: requestCount, windowStart: windowStartTime }),
        {
          EX: Math.ceil((resetTime - now) / 1000) // Expire after window
        }
      );

      // Calculate remaining requests
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetEpoch = Math.floor(resetTime / 1000);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetEpoch.toString());

      // If limit exceeded, return 429
      if (requestCount > config.maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: Math.ceil((resetTime - now) / 1000)
        });
      }

      next();
    } catch (error) {
      // If Redis fails, continue without rate limiting
      console.error('Rate limit middleware error:', error);
      res.setHeader('X-RateLimit-Limit', DEFAULT_CONFIG.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', DEFAULT_CONFIG.maxRequests.toString());
      next();
    }
  };
};
