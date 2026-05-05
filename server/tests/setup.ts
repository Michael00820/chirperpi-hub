import { TestDatabase } from './testDatabase';
import { app } from '../src/app';
import { pool } from '../src/app';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/authService';

export let testDb: TestDatabase;
export let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  // Use SQLite for tests
  testDb = new TestDatabase(':memory:');
  await testDb.connect();
  await testDb.runMigrations();

  // Override the pool to use our test database
  (global as any).__testDb = testDb;

  // Create test app
  request = supertest(app);
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  // Clear all tables before each test
  await testDb.clearAllTables();

  // Insert test data if needed
  await setupTestData();
});

async function setupTestData() {
  // Create test users
  await testDb.run(`
    INSERT INTO users (id, pi_user_id, username, display_name, email, avatar_url, bio, created_at, updated_at)
    VALUES
      ('user-1', 'pi-1', 'testuser1', 'Test User 1', 'test1@example.com', 'https://example.com/avatar1.jpg', 'Bio 1', datetime('now'), datetime('now')),
      ('user-2', 'pi-2', 'testuser2', 'Test User 2', 'test2@example.com', 'https://example.com/avatar2.jpg', 'Bio 2', datetime('now'), datetime('now'))
  `);

  // Create test profiles
  await testDb.run(`
    INSERT INTO profiles (user_id, display_name, bio, avatar_url, website, location, created_at, updated_at)
    VALUES
      ('user-1', 'Test User 1', 'Bio 1', 'https://example.com/avatar1.jpg', 'https://example.com', 'Location 1', datetime('now'), datetime('now')),
      ('user-2', 'Test User 2', 'Bio 2', 'https://example.com/avatar2.jpg', 'https://example.com', 'Location 2', datetime('now'), datetime('now'))
  `);
}

// Test helpers
export const createTestUser = async (overrides: Partial<any> = {}) => {
  const user = {
    id: `user-${Date.now()}`,
    pi_user_id: `pi-${Date.now()}`,
    username: `testuser${Date.now()}`,
    display_name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    ...overrides
  };

  await testDb.run(`
    INSERT INTO users (id, pi_user_id, username, display_name, email, avatar_url, bio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [user.id, user.pi_user_id, user.username, user.display_name, user.email, user.avatar_url, user.bio]);

  await testDb.run(`
    INSERT INTO profiles (user_id, display_name, bio, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [user.id, user.display_name, user.bio, user.avatar_url]);

  return user;
};

export const createTestPost = async (userId: string, overrides: Partial<any> = {}) => {
  const post = {
    id: `post-${Date.now()}`,
    user_id: userId,
    content: 'Test post content',
    media_urls: JSON.stringify([]),
    hashtags: JSON.stringify([]),
    is_pinned: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };

  await testDb.run(`
    INSERT INTO posts (id, user_id, content, media_urls, hashtags, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [post.id, post.user_id, post.content, post.media_urls, post.hashtags, post.is_pinned, post.created_at, post.updated_at]);

  return post;
};

export const generateTestToken = (userId: string, piUserId: string = 'pi-test', username: string = 'testuser') => {
  return jwt.sign(
    { userId, piUserId, username },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '15m' }
  );
};

export const createAuthenticatedRequest = (userId: string) => {
  const token = generateTestToken(userId);
  return request.set('Authorization', `Bearer ${token}`);
};