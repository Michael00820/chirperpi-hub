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

const migrationsDir = path.resolve(__dirname, '../migrations');

const runMigrations = async () => {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
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
