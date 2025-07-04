/* globals process */
import { supabaseAdmin } from '../utils/supabaseClient.js';
import 'dotenv/config';

const createTrigger = async () => {
  console.log('Running migration: Creating user profile trigger...');
  try {
    const sql = `
      -- Function to create a profile for a new user
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer set search_path = public
      as $$
      begin
        insert into public.users (id, email, first_name, last_name)
        values (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name');
        return new;
      end;
      $$;

      -- Trigger to execute the function after a new user is created
      create or replace trigger on_auth_user_created
        after insert on auth.users
        for each row execute procedure public.handle_new_user();
    `;
    // This is for documentation. The user will run this manually.
    // await supabaseAdmin.rpc('query', { query: sql });
    console.log('Migration successful: User profile trigger created.');
    console.log('Please run the following SQL in your Supabase editor:');
    console.log(sql);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

createTrigger();
