import { Router, IRouter, Request, Response } from 'express';
import { pool, redisClient } from '../infrastructure/clients';

export const statsRouter: IRouter = Router();

const CACHE_KEY = 'public:stats:v1';
const CACHE_TTL_SECONDS = 60;

type PublicStats = {
  pioneers: number;
  groups: number;
  proposals: number;
  piTipped: number;
  generatedAt: string;
};

const safeCount = async (table: string): Promise<number> => {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    return result.rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
};

const safeSum = async (sql: string): Promise<number> => {
  try {
    const result = await pool.query(sql);
    const value = result.rows[0]?.total;
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
};

statsRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    if (redisClient.isOpen) {
      const cached = await redisClient.get(CACHE_KEY).catch(() => null);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    }

    const [pioneers, groups, proposals, piTipped] = await Promise.all([
      safeCount('users'),
      safeCount('groups'),
      safeCount('proposals'),
      safeSum(
        "SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM transactions WHERE status = 'completed'"
      )
    ]);

    const stats: PublicStats = {
      pioneers,
      groups,
      proposals,
      piTipped,
      generatedAt: new Date().toISOString()
    };

    if (redisClient.isOpen) {
      redisClient
        .setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(stats))
        .catch((err) => console.error('Stats cache write failed:', err));
    }

    res.setHeader('X-Cache', 'MISS');
    res.json(stats);
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});
