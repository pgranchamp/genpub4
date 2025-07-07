import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import process from 'process';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Client Supabase avec clé service (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables principales à vérifier
const MAIN_TABLES = [
  'users',
  'organisations', 
  'projects',
  'projects_aides',
  'categories_aides_territoire'
];

async function checkRLSStatus() {
  console.log('🔍 Vérification du statut RLS des tables...\n');
  
  const rlsStatus = {};
  
  for (const table of MAIN_TABLES) {
    try {
      // Méthode simple : tenter un accès direct
      const { error: accessError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (accessError && accessError.message.includes('row-level security')) {
        console.log(`🔒 ${table}: RLS activé`);
        rlsStatus[table] = 'enabled';
      } else if (accessError) {
        console.log(`❌ ${table}: Erreur - ${accessError.message}`);
        rlsStatus[table] = 'error';
      } else {
        console.log(`🔓 ${table}: RLS désactivé`);
        rlsStatus[table] = 'disabled';
      }
      
    } catch (err) {
      console.log(`❌ ${table}: Erreur - ${err.message}`);
      rlsStatus[table] = 'error';
    }
  }
  
  return rlsStatus;
}

async function generateSQLCommands() {
  console.log('\n📝 GÉNÉRATION DES COMMANDES SQL DE ROLLBACK\n');
  console.log('===========================================\n');
  
  const sqlCommands = [];
  
  for (const table of MAIN_TABLES) {
    const disableCommand = `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`;
    sqlCommands.push(disableCommand);
    console.log(`📝 ${table}: ${disableCommand}`);
  }
  
  return sqlCommands;
}

async function generateRollbackReport(currentStatus, sqlCommands) {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    currentStatus,
    sqlCommands,
    tablesWithRLS: Object.entries(currentStatus).filter(([, status]) => status === 'enabled').map(([table]) => table),
    tablesWithoutRLS: Object.entries(currentStatus).filter(([, status]) => status === 'disabled').map(([table]) => table),
    tablesWithErrors: Object.entries(currentStatus).filter(([, status]) => status === 'error').map(([table]) => table)
  };
  
  const reportPath = path.join(reportDir, 'rls-rollback-simple.json');
  const sqlPath = path.join(reportDir, 'disable-rls-commands.sql');
  const summaryPath = path.join(reportDir, 'rls-rollback-simple-summary.txt');
  
  // Rapport JSON détaillé
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Fichier SQL avec toutes les commandes
  const sqlContent = `-- COMMANDES DE ROLLBACK RLS - ${new Date().toLocaleString('fr-FR')}
-- ================================================================
-- ATTENTION: Ces commandes désactivent RLS sur toutes les tables
-- Exécuter dans l'ordre dans Supabase SQL Editor
-- ================================================================

${sqlCommands.join('\n')}

-- ================================================================
-- POUR RÉACTIVER RLS PLUS TARD:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- ================================================================
`;
  
  fs.writeFileSync(sqlPath, sqlContent);
  
  // Résumé texte
  const summary = `
RAPPORT DE ROLLBACK RLS SIMPLE - ${new Date().toLocaleString('fr-FR')}
==============================================================

📊 STATUT ACTUEL:
- Tables avec RLS activé: ${results.tablesWithRLS.length}
- Tables avec RLS désactivé: ${results.tablesWithoutRLS.length}  
- Tables en erreur: ${results.tablesWithErrors.length}

🔒 TABLES AVEC RLS ACTIVÉ:
${results.tablesWithRLS.map(table => `  - ${table}`).join('\n') || '  Aucune'}

🔓 TABLES AVEC RLS DÉSACTIVÉ:
${results.tablesWithoutRLS.map(table => `  - ${table}`).join('\n') || '  Aucune'}

❌ TABLES EN ERREUR:
${results.tablesWithErrors.map(table => `  - ${table}`).join('\n') || '  Aucune'}

📝 FICHIER SQL GÉNÉRÉ:
  ${sqlPath}

🎯 INSTRUCTIONS DE ROLLBACK:
1. Ouvrir Supabase Dashboard > SQL Editor
2. Copier/coller le contenu du fichier SQL généré
3. Exécuter les commandes une par une ou toutes ensemble
4. Vérifier avec: npm run security:simple

🔄 POUR RÉACTIVER RLS PLUS TARD:
  Utiliser: npm run security:enable-rls
`;
  
  fs.writeFileSync(summaryPath, summary);
  
  return { reportPath, sqlPath, summaryPath };
}

async function main() {
  try {
    console.log('🔙 SCRIPT DE ROLLBACK RLS SIMPLE');
    console.log('================================\n');
    
    // Test de connexion
    console.log('📡 Test de connexion Supabase...');
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      throw new Error(`Connexion échouée: ${error.message}`);
    }
    console.log('✅ Connexion Supabase OK\n');
    
    // Vérifier le statut RLS
    const currentStatus = await checkRLSStatus();
    
    // Générer les commandes SQL
    const sqlCommands = await generateSQLCommands();
    
    // Générer le rapport
    const { reportPath, sqlPath, summaryPath } = await generateRollbackReport(currentStatus, sqlCommands);
    
    console.log('\n📊 RÉSUMÉ');
    console.log('=========');
    
    const tablesWithRLS = Object.entries(currentStatus).filter(([, status]) => status === 'enabled');
    const tablesWithoutRLS = Object.entries(currentStatus).filter(([, status]) => status === 'disabled');
    const tablesWithErrors = Object.entries(currentStatus).filter(([, status]) => status === 'error');
    
    console.log(`🔒 Tables avec RLS activé: ${tablesWithRLS.length}`);
    console.log(`🔓 Tables avec RLS désactivé: ${tablesWithoutRLS.length}`);
    console.log(`❌ Tables en erreur: ${tablesWithErrors.length}`);
    
    if (tablesWithRLS.length > 0) {
      console.log('\n🚨 ROLLBACK NÉCESSAIRE pour:');
      tablesWithRLS.forEach(([table]) => console.log(`  - ${table}`));
    }
    
    console.log('\n💾 Fichiers générés:');
    console.log(`✅ Rapport détaillé: ${reportPath}`);
    console.log(`📝 Commandes SQL: ${sqlPath}`);
    console.log(`✅ Résumé: ${summaryPath}`);
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    if (tablesWithRLS.length > 0) {
      console.log('1. Ouvrir Supabase Dashboard > SQL Editor');
      console.log(`2. Copier/coller le contenu de: ${sqlPath}`);
      console.log('3. Exécuter les commandes SQL');
      console.log('4. Vérifier avec: npm run security:simple');
    } else {
      console.log('✅ Aucun rollback nécessaire - RLS déjà désactivé sur toutes les tables');
      console.log('1. Vérifier que l\'application fonctionne: npm run dev');
      console.log('2. Pour réactiver RLS plus tard: npm run security:enable-rls');
    }
    
    console.log('\n✅ Script terminé avec succès!');
    
  } catch (error) {
    console.error('\n❌ ERREUR:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
