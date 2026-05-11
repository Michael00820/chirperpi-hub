import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../infrastructure/clients';

export const addToBlacklist = async (token: string, expiresIn: number): Promise<void> => {
  try {
    await redisClient.setEx(`blacklist:${token}`, expiresIn, 'true');
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redisClient.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

export const checkTokenBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
  }

  next();
};
