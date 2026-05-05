import request, { createTestUser, createAuthenticatedRequest } from './setup';

describe('Users API', () => {
  describe('GET /api/users/search', () => {
    it('should search users by query', async () => {
      await createTestUser({ username: 'searchuser', display_name: 'Search User' });

      const response = await request
        .get('/api/users/search')
        .query({ q: 'search', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should require search query', async () => {
      const response = await request
        .get('/api/users/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Search query must be 1-100 characters');
    });

    it('should paginate search results', async () => {
      await createTestUser({ username: 'user1', display_name: 'User 1' });
      await createTestUser({ username: 'user2', display_name: 'User 2' });

      const response = await request
        .get('/api/users/search')
        .query({ q: 'user', page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/users/:username', () => {
    it('should get user profile by username', async () => {
      const user = await createTestUser({ username: 'testprofile', display_name: 'Test Profile' });

      const response = await request
        .get(`/api/users/${user.username}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(user.username);
      expect(response.body.displayName).toBe(user.display_name);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request
        .get('/api/users/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/users/:username/posts', () => {
    it('should get user posts with pagination', async () => {
      const user = await createTestUser();

      const response = await request
        .get(`/api/users/${user.username}/posts`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(Array.isArray(response.body.posts)).toBe(true);
    });

    it('should validate pagination parameters', async () => {
      const user = await createTestUser();

      const response = await request
        .get(`/api/users/${user.username}/posts`)
        .query({ page: 0 }); // Invalid page

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Page must be a positive integer');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        website: 'https://example.com'
      };

      const response = await authRequest
        .put('/api/users/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe(updateData.displayName);
      expect(response.body.bio).toBe(updateData.bio);
    });

    it('should reject invalid display name', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .put('/api/users/profile')
        .send({ displayName: '' }); // Empty display name

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Display name must be 1-100 characters');
    });

    it('should reject invalid bio length', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const longBio = 'a'.repeat(501); // Over 500 characters

      const response = await authRequest
        .put('/api/users/profile')
        .send({ bio: longBio });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Bio must be 500 characters or less');
    });

    it('should reject invalid avatar URL', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .put('/api/users/profile')
        .send({ avatarUrl: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Avatar URL must be a valid URL');
    });

    it('should reject invalid website URL', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .put('/api/users/profile')
        .send({ website: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Website URL must be valid');
    });
  });

  describe('POST /api/users/:userId/follow', () => {
    it('should follow user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const authRequest = createAuthenticatedRequest(user1.id);

      const response = await authRequest
        .post(`/api/users/${user2.id}/follow`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject following non-existent user', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .post('/api/users/non-existent-id/follow');

      expect(response.status).toBe(500); // Service error for follow failure
    });
  });

  describe('DELETE /api/users/:userId/follow', () => {
    it('should unfollow user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const authRequest = createAuthenticatedRequest(user1.id);

      // First follow
      await authRequest
        .post(`/api/users/${user2.id}/follow`);

      // Then unfollow
      const response = await authRequest
        .delete(`/api/users/${user2.id}/follow`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});