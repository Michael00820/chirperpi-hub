import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/authService';
import { PiAuthRequest, AuthResponse } from '../../../shared/src/auth';
import { authenticateToken } from '../middleware/authMiddleware';
import { addToBlacklist } from '../middleware/tokenBlacklistMiddleware';
import { handleValidationErrors } from '../middleware/validators';
import jwt from 'jsonwebtoken';

const router = Router();

// Pi Network authentication endpoint
router.post(
  '/pi',
  body('accessToken').isString().notEmpty().withMessage('Access token is required'),
  handleValidationErrors,
  async (req: Request, res: Response<AuthResponse>) => {
  try {
    const { accessToken, paymentId }: PiAuthRequest = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Authenticate with Pi Network
    const piUser = await AuthService.authenticateWithPi(accessToken, paymentId);

    // Login or register user
    const authResponse = await AuthService.loginUser(piUser);

    if (authResponse.success && authResponse.token) {
      // Generate refresh token
      const refreshToken = AuthService.generateRefreshToken({
        userId: authResponse.user!.id,
        piUserId: piUser.uid,
        username: piUser.username
      });

      // Store session in Redis
      const sessionId = req.sessionID!;
      await AuthService.createSession(sessionId, {
        userId: authResponse.user!.id,
        piUserId: piUser.uid,
        username: piUser.username,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        ...authResponse,
        expiresIn: 15 * 60 * 1000 // 15 minutes in milliseconds
      });
    }

    res.json(authResponse);
  } catch (error) {
    console.error('Pi authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Pi Network authentication failed'
    });
  }
});

// CSRF token endpoint
router.get('/csrf-token', (req: Request, res: Response) => {
  try {
    const token = req.csrfToken()
    res.json({ csrfToken: token })
  } catch (error) {
    console.error('CSRF token generation error:', error)
    res.status(500).json({ error: 'Unable to generate CSRF token' })
  }
})

// Verify token endpoint
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Refresh token endpoint
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = AuthService.verifyRefreshToken(refreshToken);
    const newAccessToken = AuthService.generateAccessToken({
      userId: decoded.userId,
      piUserId: decoded.piUserId,
      username: decoded.username
    });

    res.json({
      success: true,
      token: newAccessToken,
      expiresIn: 15 * 60 * 1000 // 15 minutes in milliseconds
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Get token expiry time from decoded token
    if (token) {
      try {
        const decoded = jwt.decode(token) as any;
        const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 15 * 60;
        
        // Add token to blacklist
        await addToBlacklist(token, Math.max(expiresIn, 1));
      } catch (e) {
        console.error('Error decoding token for blacklist:', e);
      }
    }

    const sessionId = req.sessionID!;
    await AuthService.deleteSession(sessionId);
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export { router as authRouter };