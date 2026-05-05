import request, { createTestUser, createTestPost, createAuthenticatedRequest } from './setup';

describe('Posts API', () => {
  describe('POST /api/posts', () => {
    it('should create post for authenticated user', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const postData = {
        content: 'This is a test post',
        mediaUrls: ['https://example.com/image.jpg'],
        hashtags: ['test', 'post']
      };

      const response = await authRequest
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.userId).toBe(user.id);
      expect(response.body.mediaUrls).toEqual(postData.mediaUrls);
      expect(response.body.hashtags).toEqual(postData.hashtags);
    });

    it('should reject post creation without authentication', async () => {
      const response = await request
        .post('/api/posts')
        .send({ content: 'Test post' });

      expect(response.status).toBe(401);
    });

    it('should reject empty post content', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .post('/api/posts')
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Post must be 1-280 characters');
    });

    it('should reject post content over 280 characters', async () => {
      const user = await createTestUser();
      const authRequest = createAuthenticatedRequest(user.id);

      const longContent = 'a'.repeat(281);

      const response = await authRequest
        .post('/api/posts')
        .send({ content: longContent });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Post must be 1-280 characters');
    });
  });

  describe('GET /api/posts', () => {
    it('should get timeline with pagination', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestPost(user1.id, { content: 'Post 1' });
      await createTestPost(user2.id, { content: 'Post 2' });
      await createTestPost(user1.id, { content: 'Post 3' });

      const response = await request
        .get('/api/posts')
        .query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(response.body.posts.length).toBeLessThanOrEqual(2);
    });

    it('should filter by latest posts', async () => {
      const user = await createTestUser();

      await createTestPost(user.id, { content: 'Latest post' });

      const response = await request
        .get('/api/posts')
        .query({ filter: 'latest' });

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
    });
  });

  describe('GET /api/posts/trending', () => {
    it('should get trending posts', async () => {
      const user = await createTestUser();
      await createTestPost(user.id, { content: 'Trending post' });

      const response = await request
        .get('/api/posts/trending')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(Array.isArray(response.body.posts)).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request
        .get('/api/posts/trending')
        .query({ limit: 150 }); // Over max limit

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Limit must be between 1 and 100');
    });
  });

  describe('GET /api/posts/search', () => {
    it('should search posts by query', async () => {
      const user = await createTestUser();
      await createTestPost(user.id, { content: 'Searchable content here' });

      const response = await request
        .get('/api/posts/search')
        .query({ q: 'searchable', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should require search query', async () => {
      const response = await request
        .get('/api/posts/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Search query must be 1-100 characters');
    });
  });

  describe('GET /api/posts/:postId', () => {
    it('should get post by ID', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const response = await request
        .get(`/api/posts/${post.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(post.id);
      expect(response.body.content).toBe(post.content);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request
        .get('/api/posts/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');
    });
  });

  describe('PUT /api/posts/:postId', () => {
    it('should update own post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const authRequest = createAuthenticatedRequest(user.id);

      const updateData = { content: 'Updated content' };

      const response = await authRequest
        .put(`/api/posts/${post.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.content).toBe(updateData.content);
    });

    it('should reject updating others post', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const post = await createTestPost(user1.id);
      const authRequest = createAuthenticatedRequest(user2.id);

      const response = await authRequest
        .put(`/api/posts/${post.id}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/posts/:postId', () => {
    it('should delete own post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .delete(`/api/posts/${post.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject deleting others post', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const post = await createTestPost(user1.id);
      const authRequest = createAuthenticatedRequest(user2.id);

      const response = await authRequest
        .delete(`/api/posts/${post.id}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/posts/:postId/react', () => {
    it('should add reaction to post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .post(`/api/posts/${post.id}/react`)
        .send({ reactionType: 'like' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid reaction type', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const authRequest = createAuthenticatedRequest(user.id);

      const response = await authRequest
        .post(`/api/posts/${post.id}/react`)
        .send({ reactionType: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid reaction type');
    });
  });

  describe('DELETE /api/posts/:postId/react', () => {
    it('should remove reaction from post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const authRequest = createAuthenticatedRequest(user.id);

      // First add reaction
      await authRequest
        .post(`/api/posts/${post.id}/react`)
        .send({ reactionType: 'like' });

      // Then remove it
      const response = await authRequest
        .delete(`/api/posts/${post.id}/react`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});