/**
 * Health check and monitoring endpoints
 */

import { Router, IRouter, Request, Response } from 'express';
import { pool } from '../app';
import { authenticateToken } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

export const monitoringRouter: IRouter = Router();

/**
 * Public health check endpoint
 * Returns: DB status, uptime, version
 * No authentication required
 */
monitoringRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = !!dbResult.rows[0];
    
    const responseTime = Date.now() - startTime;

    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.SENTRY_RELEASE || 'chirperpi-hub@latest',
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        responseTime: `${responseTime}ms`
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed', error instanceof Error ? error : String(error), {
      requestId: req.id
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Admin health dashboard endpoint
 * Returns detailed system stats
 * Requires admin role
 */
monitoringRouter.get('/health/admin', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRoleResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user?.userId]
    );

    if (!userRoleResult.rows[0] || userRoleResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    // Fetch system stats
    const [
      _dbHealth,
      totalUsers,
      totalPosts,
      totalGroups,
      activeConnections,
      cacheStatus
    ] = await Promise.all([
      pool.query('SELECT NOW()'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM posts'),
      pool.query('SELECT COUNT(*) as count FROM groups'),
      pool.query('SELECT count FROM (SELECT COUNT(*) as count FROM pg_stat_activity WHERE pid <> pg_backend_pid()) t'),
      pool.query('SELECT 1').catch(() => ({ rows: [{ error: 'disconnected' }] }))
    ]);

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      version: process.env.SENTRY_RELEASE || 'chirperpi-hub@latest',
      database: {
        status: 'connected',
        activeConnections: activeConnections.rows[0]?.count || 0
      },
      cache: {
        status: cacheStatus.rows[0]?.error ? 'disconnected' : 'connected'
      },
      stats: {
        totalUsers: totalUsers.rows[0]?.count || 0,
        totalPosts: totalPosts.rows[0]?.count || 0,
        totalGroups: totalGroups.rows[0]?.count || 0
      },
      performance: {
        memoryUsage: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        },
        uptime: {
          days: Math.floor(uptime / 86400),
          hours: Math.floor((uptime % 86400) / 3600),
          minutes: Math.floor((uptime % 3600) / 60)
        }
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Admin health check failed', error instanceof Error ? error : String(error), {
      requestId: req.id,
      userId: req.user?.userId
    });

    res.status(500).json({
      error: 'Failed to fetch health stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
