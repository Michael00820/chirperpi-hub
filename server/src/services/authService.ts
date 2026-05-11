import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import axios from 'axios';
import { PiUser, AuthPayload, AuthResponse, SessionData } from '../../../shared/src/auth';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

export class AuthService {
  static async authenticateWithPi(accessToken: string, _paymentId?: string): Promise<PiUser> {
    try {
      const platformApiUrl = process.env.PI_PLATFORM_API_URL || 'https://api.pi.network/v2';
      const response = await axios.get(`${platformApiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Pi-App-Id': process.env.PI_API_KEY || ''
        }
      });
      const data = response.data;
      return {
        uid: data.uid,
        username: data.username,
        accessToken
      };
    } catch (error) {
      throw new Error('Pi Network authentication failed');
    }
  }

  static generateAccessToken(payload: AuthPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
  }

  static generateRefreshToken(payload: AuthPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as AuthPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static generateJWT(payload: AuthPayload): string {
    return this.generateAccessToken(payload);
  }

  static verifyJWT(token: string): AuthPayload {
    return this.verifyAccessToken(token);
  }

  static async createSession(sessionId: string, data: SessionData): Promise<void> {
    await redisClient.setEx(`session:${sessionId}`, 24 * 60 * 60, JSON.stringify(data));
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await redisClient.del(`session:${sessionId}`);
  }

  // Mock database functions - replace with actual DB queries
  static async findOrCreateUser(piUser: PiUser): Promise<any> {
    // In a real app, query the database
    // For now, return a mock user object
    return {
      id: 'user-uuid',
      piUserId: piUser.uid,
      username: piUser.username,
      displayName: piUser.username,
      avatarUrl: null,
      verificationStatus: 'verified' // Assume verified for Pi users
    };
  }

  static async loginUser(piUser: PiUser): Promise<AuthResponse> {
    try {
      const user = await this.findOrCreateUser(piUser);

      const payload: AuthPayload = {
        userId: user.id,
        piUserId: piUser.uid,
        username: piUser.username
      };

      const token = this.generateJWT(payload);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          verificationStatus: user.verificationStatus
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }
}