import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

let redisConnectPromise: Promise<unknown> | null = null;

export const getRedis = async (): Promise<RedisClientType> => {
  if (!redisClient.isOpen && !redisConnectPromise) {
    redisConnectPromise = redisClient.connect().catch((err) => {
      redisConnectPromise = null;
      throw err;
    });
  }
  if (redisConnectPromise) {
    await redisConnectPromise;
  }
  return redisClient;
};

// Eagerly connect so consumers that use redisClient directly (legacy paths) work.
getRedis().catch((err) => console.error('Initial Redis connect failed:', err));
