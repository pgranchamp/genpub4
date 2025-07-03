/* globals process */
import { query as queryNeon } from '../utils/neonClient.js';
import 'dotenv/config';

const alterJobsTable = async () => {
  console.log('Running migration: Adding batches_completed to jobs table...');
  try {
    const sql = `
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS batches_completed INTEGER DEFAULT 0;
    `;
    await queryNeon(sql);
    console.log('Migration successful: "batches_completed" column added or already exists.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

alterJobsTable();
