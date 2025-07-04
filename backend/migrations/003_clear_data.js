/* globals process */
import { supabaseAdmin } from '../utils/supabaseClient.js';
import 'dotenv/config';

const clearData = async () => {
  console.log('Running migration: Clearing all data from tables...');
  try {
    // The order is important to respect foreign key constraints
    console.log('Deleting from projects_aides...');
    await supabaseAdmin.from('projects_aides').delete().neq('id', 0); // neq is a trick to delete all

    console.log('Deleting from projects_files...');
    await supabaseAdmin.from('projects_files').delete().neq('id', 0);

    console.log('Deleting from projects...');
    await supabaseAdmin.from('projects').delete().neq('id', 0);

    console.log('Deleting from users...');
    await supabaseAdmin.from('users').delete().neq('id', 0);

    console.log('Deleting from organisations...');
    await supabaseAdmin.from('organisations').delete().neq('id', 0);

    console.log('Migration successful: All data cleared.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

clearData();
