/* globals process */
import { query as queryNeon } from '../utils/neonClient.js';
import 'dotenv/config';

const simplifyDbSchema = async () => {
  console.log('Running migration: Simplifying database schema...');
  try {
    const sql = `
      -- Step 1: Add organisation_id to users table
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

      -- Step 2: Add user_id to projects table
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

      -- Step 3: Drop the users_organisations table
      DROP TABLE IF EXISTS users_organisations;

      -- Step 4: Drop the projects_users table
      DROP TABLE IF EXISTS projects_users;
    `;
    await queryNeon(sql);
    console.log('Migration successful: Database schema simplified.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

simplifyDbSchema();
