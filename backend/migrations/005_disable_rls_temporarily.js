const { neon } = require('@neondatabase/serverless');

async function up() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Désactivation temporaire de RLS sur users et organisations...');
  
  // Désactiver RLS temporairement pour débugger
  await sql`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.organisations DISABLE ROW LEVEL SECURITY`;
  
  console.log('RLS désactivé temporairement');
}

async function down() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Réactivation de RLS...');
  
  await sql`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY`;
  
  console.log('RLS réactivé');
}

module.exports = { up, down };
