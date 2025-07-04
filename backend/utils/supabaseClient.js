/**
 * Utilitaire pour interagir avec l'API Supabase en utilisant le client JS officiel
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import process from 'node:process';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.');
}

// Client Supabase configuré avec la clé de service pour les opérations privilégiées
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
