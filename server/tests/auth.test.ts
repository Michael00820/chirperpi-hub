import request, { createTestUser, generateTestToken, createAuthenticatedRequest } from './setup';

describe('Auth Routes', () => {
  describe('POST /api/auth/pi', () => {
    it('should authenticate user successfully with valid Pi token', async () => {
      const mockPiUser = {
        uid: 'pi-test-123',
        username: 'testuser',
        accessToken: 'valid-pi-token'
      };

      // Mock Pi Network API call
      jest.spyOn(require('../src/services/authService'), 'authenticateWithPi')
        .mockResolvedValue(mockPiUser);

      jest.spyOn(require('../src/services/authService'), 'loginUser')
        .mockResolvedValue({
          success: true,
          user: {
            id: 'user-1',
            piUserId: 'pi-test-123',
            username: 'testuser'
          },
          token: 'access-token-123'
        });

      const response = await request
        .post('/api/auth/pi')
        .send({
          accessToken: 'valid-pi-token',
          paymentId: 'payment-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 400 for missing access token', async () => {
      const response = await request
        .post('/api/auth/pi')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Access token is required');
    });

    it('should handle Pi authentication failure', async () => {
      jest.spyOn(require('../src/services/authService'), 'authenticateWithPi')
        .mockRejectedValue(new Error('Invalid Pi token'));

      const response = await request
        .post('/api/auth/pi')
        .send({
          accessToken: 'invalid-token'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/csrf-token', () => {
    it('should return CSRF token', async () => {
      const response = await request
        .get('/api/auth/csrf-token');

      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .get('/api/auth/verify');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.userId).toBe(user.id);
    });

    it('should reject invalid token', async () => {
      const response = await request
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject missing token', async () => {
      const response = await request
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh cookie', async () => {
      const user = await createTestUser();

      jest.spyOn(require('../src/services/authService'), 'verifyRefreshToken')
        .mockReturnValue({
          userId: user.id,
          piUserId: user.pi_user_id,
          username: user.username
        });

      jest.spyOn(require('../src/services/authService'), 'generateAccessToken')
        .mockReturnValue('new-access-token');

      const response = await request
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('new-access-token');
    });

    it('should reject without refresh token', async () => {
      const response = await request
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Refresh token required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      jest.spyOn(require('../src/services/authService'), 'deleteSession')
        .mockResolvedValue();

      const response = await authRequest
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});