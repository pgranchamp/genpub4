-- COMMANDES DE ROLLBACK RLS - 07/07/2025 14:19:36
-- ================================================================
-- ATTENTION: Ces commandes désactivent RLS sur toutes les tables
-- Exécuter dans l'ordre dans Supabase SQL Editor
-- ================================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organisations DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects_aides DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories_aides_territoire DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- POUR RÉACTIVER RLS PLUS TARD:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- ================================================================
