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
      const { error } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('tablename', table)
        .single();
        
      if (error) {
        console.log(`⚠️  ${table}: Erreur lors de la vérification - ${error.message}`);
        rlsStatus[table] = 'error';
        continue;
      }
      
      // Vérifier si RLS est activé via une requête système
      const { data: rlsData, error: rlsError } = await supabase.rpc('check_rls_status', {
        table_name: table
      });
      
      if (rlsError) {
        // Méthode alternative : tenter un accès direct
        const { error: accessError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (accessError && accessError.message.includes('row-level security')) {
          console.log(`🔒 ${table}: RLS activé`);
          rlsStatus[table] = 'enabled';
        } else {
          console.log(`🔓 ${table}: RLS désactivé`);
          rlsStatus[table] = 'disabled';
        }
      } else {
        const status = rlsData ? 'enabled' : 'disabled';
        console.log(`${status === 'enabled' ? '🔒' : '🔓'} ${table}: RLS ${status === 'enabled' ? 'activé' : 'désactivé'}`);
        rlsStatus[table] = status;
      }
      
    } catch (err) {
      console.log(`❌ ${table}: Erreur - ${err.message}`);
      rlsStatus[table] = 'error';
    }
  }
  
  return rlsStatus;
}

async function disableRLS() {
  console.log('\n🔙 ROLLBACK RLS - DÉSACTIVATION\n');
  console.log('================================\n');
  
  const results = {
    disabled: [],
    alreadyDisabled: [],
    errors: [],
    timestamp: new Date().toISOString()
  };
  
  // Vérifier le statut actuel
  const currentStatus = await checkRLSStatus();
  
  console.log('\n🔧 Désactivation RLS...\n');
  
  for (const table of MAIN_TABLES) {
    try {
      if (currentStatus[table] === 'disabled') {
        console.log(`✅ ${table}: RLS déjà désactivé`);
        results.alreadyDisabled.push(table);
        continue;
      }
      
      if (currentStatus[table] === 'error') {
        console.log(`⚠️  ${table}: Ignoré (erreur de vérification)`);
        results.errors.push({ table, error: 'Erreur de vérification du statut' });
        continue;
      }
      
      // Désactiver RLS via SQL direct
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        // Méthode alternative si la fonction RPC n'existe pas
        console.log(`⚠️  ${table}: Impossible de désactiver via RPC - ${error.message}`);
        console.log(`📝 ${table}: Commande SQL à exécuter manuellement:`);
        console.log(`   ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
        results.errors.push({ table, error: error.message, sqlCommand: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;` });
      } else {
        console.log(`✅ ${table}: RLS désactivé avec succès`);
        results.disabled.push(table);
      }
      
    } catch (err) {
      console.log(`❌ ${table}: Erreur - ${err.message}`);
      results.errors.push({ table, error: err.message });
    }
  }
  
  return results;
}

async function generateRollbackReport(results) {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'rls-rollback-report.json');
  const summaryPath = path.join(reportDir, 'rls-rollback-summary.txt');
  
  // Rapport JSON détaillé
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Résumé texte
  const summary = `
RAPPORT DE ROLLBACK RLS - ${new Date().toLocaleString('fr-FR')}
=========================================================

📊 RÉSUMÉ:
- Tables avec RLS désactivé: ${results.disabled.length}
- Tables déjà désactivées: ${results.alreadyDisabled.length}  
- Tables en erreur: ${results.errors.length}

✅ TABLES RLS DÉSACTIVÉ:
${results.disabled.map(table => `  - ${table}`).join('\n') || '  Aucune'}

🔓 TABLES DÉJÀ DÉSACTIVÉES:
${results.alreadyDisabled.map(table => `  - ${table}`).join('\n') || '  Aucune'}

❌ ERREURS:
${results.errors.map(err => `  - ${err.table}: ${err.error}`).join('\n') || '  Aucune'}

📝 COMMANDES SQL MANUELLES (si nécessaire):
${results.errors.filter(err => err.sqlCommand).map(err => `  ${err.sqlCommand}`).join('\n') || '  Aucune'}

🔄 POUR RÉACTIVER RLS:
  npm run security:enable-rls

📋 POUR VÉRIFIER LE STATUT:
  npm run security:simple
`;
  
  fs.writeFileSync(summaryPath, summary);
  
  return { reportPath, summaryPath };
}

async function main() {
  try {
    console.log('🔙 SCRIPT DE ROLLBACK RLS');
    console.log('========================\n');
    
    // Test de connexion
    console.log('📡 Test de connexion Supabase...');
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      throw new Error(`Connexion échouée: ${error.message}`);
    }
    console.log('✅ Connexion Supabase OK\n');
    
    // Désactiver RLS
    const results = await disableRLS();
    
    // Générer le rapport
    const { reportPath, summaryPath } = await generateRollbackReport(results);
    
    console.log('\n📊 RÉSUMÉ DU ROLLBACK');
    console.log('=====================');
    console.log(`✅ Tables RLS désactivé: ${results.disabled.length}`);
    console.log(`🔓 Tables déjà désactivées: ${results.alreadyDisabled.length}`);
    console.log(`❌ Tables en erreur: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  ACTIONS MANUELLES REQUISES:');
      results.errors.forEach(err => {
        if (err.sqlCommand) {
          console.log(`📝 Exécuter dans Supabase SQL Editor:`);
          console.log(`   ${err.sqlCommand}`);
        }
      });
    }
    
    console.log('\n💾 Rapports générés:');
    console.log(`✅ Rapport détaillé: ${reportPath}`);
    console.log(`✅ Résumé: ${summaryPath}`);
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier que l\'application fonctionne: npm run dev');
    console.log('2. Exécuter un audit: npm run security:simple');
    console.log('3. Pour réactiver RLS plus tard: npm run security:enable-rls');
    
    console.log('\n✅ Rollback terminé avec succès!');
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU ROLLBACK:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
