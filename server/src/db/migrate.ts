import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000
});

const migrationsDir = path.resolve(__dirname, '../../migrations');

const runMigrations = async () => {
  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Check if migration already applied
    const result = await pool.query(
      'SELECT id FROM _migrations WHERE filename = $1',
      [file]
    );
    if (result.rows.length > 0) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);

    // Record the migration as applied
    await pool.query(
      'INSERT INTO _migrations (filename) VALUES ($1)',
      [file]
    );
  }
};

runMigrations()
  .then(() => {
    console.log('Database migrations completed successfully.');
    return pool.end();
  })
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exit(1);
  });
