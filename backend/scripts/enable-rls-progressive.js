/**
 * ACTIVATION RLS PROGRESSIVE - GÉNIE PUBLIC V4
 * Script pour activer RLS de manière sécurisée et progressive
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import process from 'process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../utils/supabaseClient.js';

console.log('🔒 ACTIVATION RLS PROGRESSIVE - GÉNIE PUBLIC V4');
console.log('===============================================');

// Configuration des tables par ordre de priorité
const TABLES_CONFIG = [
  {
    name: 'users',
    priority: 'CRITIQUE',
    description: 'Table des utilisateurs - données sensibles',
    policies: [
      {
        name: 'users_select_own',
        command: 'SELECT',
        definition: 'auth.uid() = id',
        description: 'Les utilisateurs ne peuvent voir que leurs propres données'
      },
      {
        name: 'users_update_own',
        command: 'UPDATE',
        definition: 'auth.uid() = id',
        description: 'Les utilisateurs ne peuvent modifier que leurs propres données'
      }
    ]
  },
  {
    name: 'organisations',
    priority: 'CRITIQUE',
    description: 'Table des organisations - données sensibles',
    policies: [
      {
        name: 'organisations_select_member',
        command: 'SELECT',
        definition: 'auth.uid() IN (SELECT user_id FROM users WHERE organisation_id = organisations.id)',
        description: 'Seuls les membres peuvent voir leur organisation'
      }
    ]
  },
  {
    name: 'projects',
    priority: 'ÉLEVÉE',
    description: 'Table des projets - isolation par utilisateur',
    policies: [
      {
        name: 'projects_select_own',
        command: 'SELECT',
        definition: 'auth.uid() = user_id',
        description: 'Les utilisateurs ne voient que leurs projets'
      },
      {
        name: 'projects_insert_own',
        command: 'INSERT',
        definition: 'auth.uid() = user_id',
        description: 'Les utilisateurs ne peuvent créer que leurs projets'
      },
      {
        name: 'projects_update_own',
        command: 'UPDATE',
        definition: 'auth.uid() = user_id',
        description: 'Les utilisateurs ne peuvent modifier que leurs projets'
      },
      {
        name: 'projects_delete_own',
        command: 'DELETE',
        definition: 'auth.uid() = user_id',
        description: 'Les utilisateurs ne peuvent supprimer que leurs projets'
      }
    ]
  },
  {
    name: 'projects_aides',
    priority: 'MOYENNE',
    description: 'Table de liaison projets-aides',
    policies: [
      {
        name: 'projects_aides_select_own',
        command: 'SELECT',
        definition: 'EXISTS (SELECT 1 FROM projects WHERE projects.id = projects_aides.project_id AND projects.user_id = auth.uid())',
        description: 'Accès via les projets de l\'utilisateur'
      }
    ]
  },
  {
    name: 'categories_aides_territoire',
    priority: 'FAIBLE',
    description: 'Table de référence - lecture seule',
    policies: [
      {
        name: 'categories_aides_select_all',
        command: 'SELECT',
        definition: 'true',
        description: 'Lecture libre pour tous les utilisateurs authentifiés'
      }
    ]
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkCurrentStatus() {
  console.log('\n📊 Vérification du statut actuel...');
  
  for (const tableConfig of TABLES_CONFIG) {
    try {
      const { data: _data, error } = await supabaseAdmin
        .from(tableConfig.name)
        .select('*')
        .limit(1);
        
      if (!error) {
        console.log(`  ❌ ${tableConfig.name}: RLS désactivé (${tableConfig.priority})`);
      } else if (error.message.includes('RLS') || error.message.includes('policy')) {
        console.log(`  ✅ ${tableConfig.name}: RLS activé`);
      } else {
        console.log(`  ⚠️  ${tableConfig.name}: Erreur - ${error.message}`);
      }
    } catch (error) {
      console.log(`  ❌ ${tableConfig.name}: Exception - ${error.message}`);
    }
  }
}

async function enableRLSForTable(tableConfig) {
  console.log(`\n🔒 Activation RLS pour: ${tableConfig.name}`);
  console.log(`   Priorité: ${tableConfig.priority}`);
  console.log(`   Description: ${tableConfig.description}`);
  
  try {
    // 1. Activer RLS sur la table
    console.log('   📝 Activation RLS...');
    
    // Note: Supabase ne permet pas d'exécuter directement ALTER TABLE via l'API
    // On doit utiliser une fonction SQL ou le faire manuellement
    console.log(`   ⚠️  COMMANDE À EXÉCUTER MANUELLEMENT:`);
    console.log(`   ALTER TABLE public.${tableConfig.name} ENABLE ROW LEVEL SECURITY;`);
    
    const proceed = await askQuestion('   ✅ RLS activé manuellement ? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('   ⏭️  Passage à la table suivante...');
      return false;
    }
    
    // 2. Créer les policies
    console.log('   📜 Création des policies...');
    
    for (const policy of tableConfig.policies) {
      console.log(`      - ${policy.name}: ${policy.description}`);
      console.log(`        COMMANDE: CREATE POLICY "${policy.name}" ON public.${tableConfig.name}`);
      console.log(`                  FOR ${policy.command} TO authenticated`);
      console.log(`                  USING (${policy.definition});`);
    }
    
    const policiesOk = await askQuestion('   ✅ Policies créées manuellement ? (y/N): ');
    if (policiesOk.toLowerCase() !== 'y') {
      console.log('   ⚠️  Attention: RLS activé mais policies manquantes!');
      return false;
    }
    
    // 3. Test de vérification
    console.log('   🧪 Test de vérification...');
    
    const { data, error } = await supabaseAdmin
      .from(tableConfig.name)
      .select('*')
      .limit(1);
      
    if (error && (error.message.includes('RLS') || error.message.includes('policy'))) {
      console.log('   ✅ RLS correctement activé et fonctionnel!');
      return true;
    } else if (!error) {
      console.log('   ⚠️  RLS semble ne pas être activé (accès toujours possible)');
      return false;
    } else {
      console.log(`   ❌ Erreur inattendue: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.error(`   ❌ Erreur lors de l'activation RLS: ${error.message}`);
    return false;
  }
}

async function generateSQLScript() {
  console.log('\n📝 Génération du script SQL complet...');
  
  const sqlLines = [
    '-- SCRIPT ACTIVATION RLS - GÉNIE PUBLIC V4',
    '-- Généré automatiquement par enable-rls-progressive.js',
    `-- Date: ${new Date().toLocaleString('fr-FR')}`,
    '',
    '-- ⚠️  ATTENTION: Testez ce script sur un environnement de développement d\'abord!',
    '-- ⚠️  Assurez-vous d\'avoir des sauvegardes avant d\'exécuter en production!',
    '',
    'BEGIN;',
    ''
  ];
  
  for (const tableConfig of TABLES_CONFIG) {
    sqlLines.push(`-- ${tableConfig.name.toUpperCase()} (Priorité: ${tableConfig.priority})`);
    sqlLines.push(`-- ${tableConfig.description}`);
    sqlLines.push(`ALTER TABLE public.${tableConfig.name} ENABLE ROW LEVEL SECURITY;`);
    sqlLines.push('');
    
    for (const policy of tableConfig.policies) {
      sqlLines.push(`-- ${policy.description}`);
      sqlLines.push(`CREATE POLICY "${policy.name}" ON public.${tableConfig.name}`);
      sqlLines.push(`  FOR ${policy.command} TO authenticated`);
      sqlLines.push(`  USING (${policy.definition});`);
      sqlLines.push('');
    }
    
    sqlLines.push('');
  }
  
  sqlLines.push('COMMIT;');
  sqlLines.push('');
  sqlLines.push('-- Vérification du statut RLS');
  sqlLines.push('SELECT schemaname, tablename, rowsecurity as rls_enabled');
  sqlLines.push('FROM pg_tables');
  sqlLines.push('WHERE schemaname = \'public\'');
  sqlLines.push('  AND tablename IN (\'users\', \'organisations\', \'projects\', \'projects_aides\', \'categories_aides_territoire\')');
  sqlLines.push('ORDER BY tablename;');
  
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const sqlPath = path.join(reportsDir, 'enable-rls-complete.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'));
  
  console.log(`✅ Script SQL généré: ${sqlPath}`);
  
  return sqlPath;
}

async function runProgressiveRLS() {
  try {
    console.log('🎯 ACTIVATION RLS PROGRESSIVE');
    console.log('============================');
    console.log('Ce script va vous guider pour activer RLS de manière sécurisée.');
    console.log('Vous pourrez choisir d\'activer table par table ou générer un script complet.');
    console.log('');
    
    // 1. Vérification du statut actuel
    await checkCurrentStatus();
    
    // 2. Choix du mode
    console.log('\n🔧 MODES DISPONIBLES:');
    console.log('1. Mode interactif (table par table avec validation)');
    console.log('2. Générer script SQL complet (recommandé pour production)');
    console.log('3. Annuler');
    
    const mode = await askQuestion('\nChoisissez un mode (1/2/3): ');
    
    if (mode === '1') {
      // Mode interactif
      console.log('\n🔄 MODE INTERACTIF SÉLECTIONNÉ');
      console.log('Vous allez activer RLS table par table avec validation.');
      
      const confirm = await askQuestion('\nContinuer ? (y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ Opération annulée.');
        rl.close();
        return;
      }
      
      let successCount = 0;
      
      for (const tableConfig of TABLES_CONFIG) {
        const success = await enableRLSForTable(tableConfig);
        if (success) {
          successCount++;
        }
        
        if (tableConfig.priority === 'CRITIQUE' && !success) {
          console.log('\n🚨 ATTENTION: Échec sur une table critique!');
          const continueAnyway = await askQuestion('Continuer malgré l\'échec ? (y/N): ');
          if (continueAnyway.toLowerCase() !== 'y') {
            break;
          }
        }
      }
      
      console.log(`\n✅ Activation terminée: ${successCount}/${TABLES_CONFIG.length} tables configurées`);
      
    } else if (mode === '2') {
      // Génération de script
      console.log('\n📝 MODE GÉNÉRATION SCRIPT SÉLECTIONNÉ');
      const sqlPath = await generateSQLScript();
      
      console.log('\n📋 INSTRUCTIONS:');
      console.log('1. Examinez le script généré');
      console.log('2. Testez-le sur un environnement de développement');
      console.log('3. Exécutez-le sur votre base de données Supabase');
      console.log('4. Vérifiez le bon fonctionnement de l\'application');
      console.log(`5. Re-exécutez simple-security-audit.js pour vérifier`);
      
    } else {
      console.log('❌ Opération annulée.');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'activation RLS:', error);
    rl.close();
    process.exit(1);
  }
}

// Exécution
runProgressiveRLS();
