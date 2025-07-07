/**
 * SIMPLE SECURITY AUDIT - GÉNIE PUBLIC V4
 * Version simplifiée qui fonctionne immédiatement
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../utils/supabaseClient.js';

console.log('🔍 AUDIT SÉCURITÉ SIMPLE - GÉNIE PUBLIC V4');
console.log('==========================================');

const results = {
  timestamp: new Date().toISOString(),
  tables: {},
  summary: {},
  recommendations: []
};

// Tables à analyser
const TABLES = ['users', 'organisations', 'projects', 'projects_aides', 'categories_aides_territoire'];

async function runSimpleAudit() {
  try {
    console.log('📡 Test de connexion Supabase...');
    
    // Test de connexion
    const { data: _testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.log('❌ Erreur de connexion:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ Connexion Supabase OK');
    
    // Test de chaque table
    console.log('\n📋 Test d\'accès aux tables...');
    
    for (const tableName of TABLES) {
      console.log(`\n🔍 Test table: ${tableName}`);
      
      try {
        // Test SELECT
        const selectStart = Date.now();
        const { data: selectData, error: selectError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(3);
        const selectTime = Date.now() - selectStart;
        
        // Test COUNT
        const countStart = Date.now();
        const { count, error: countError } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        const countTime = Date.now() - countStart;
        
        results.tables[tableName] = {
          exists: true,
          select: {
            success: !selectError,
            error: selectError?.message || null,
            responseTime: selectTime,
            sampleRecords: selectData?.length || 0
          },
          count: {
            success: !countError,
            error: countError?.message || null,
            responseTime: countTime,
            totalRecords: count || 0
          }
        };
        
        // Analyse du statut
        if (!selectError && !countError) {
          console.log(`  ✅ Accès autorisé - ${count || 0} enregistrements`);
          results.tables[tableName].status = 'ACCESSIBLE';
          results.tables[tableName].rlsStatus = 'DÉSACTIVÉ';
        } else if (selectError?.message?.includes('RLS') || selectError?.message?.includes('policy')) {
          console.log(`  🔒 Accès bloqué par RLS (sécurisé)`);
          results.tables[tableName].status = 'RLS_PROTECTED';
          results.tables[tableName].rlsStatus = 'ACTIVÉ';
        } else {
          console.log(`  ❌ Erreur: ${selectError?.message || countError?.message}`);
          results.tables[tableName].status = 'ERROR';
          results.tables[tableName].rlsStatus = 'INCONNU';
        }
        
      } catch (error) {
        console.log(`  ❌ Exception: ${error.message}`);
        results.tables[tableName] = {
          exists: false,
          error: error.message,
          status: 'ERROR'
        };
      }
    }
    
    // Analyse des résultats
    console.log('\n📊 ANALYSE DES RÉSULTATS');
    console.log('========================');
    
    const accessibleTables = Object.entries(results.tables).filter(([, info]) => info.status === 'ACCESSIBLE');
    const protectedTables = Object.entries(results.tables).filter(([, info]) => info.status === 'RLS_PROTECTED');
    const errorTables = Object.entries(results.tables).filter(([, info]) => info.status === 'ERROR');
    
    console.log(`📋 Tables analysées: ${TABLES.length}`);
    console.log(`✅ Tables accessibles: ${accessibleTables.length}`);
    console.log(`🔒 Tables protégées par RLS: ${protectedTables.length}`);
    console.log(`❌ Tables en erreur: ${errorTables.length}`);
    
    results.summary = {
      totalTables: TABLES.length,
      accessibleTables: accessibleTables.length,
      protectedTables: protectedTables.length,
      errorTables: errorTables.length
    };
    
    // Génération des recommandations
    console.log('\n💡 RECOMMANDATIONS');
    console.log('==================');
    
    if (accessibleTables.length > 0) {
      console.log('\n🚨 CRITIQUE - Tables sans protection RLS:');
      accessibleTables.forEach(([tableName]) => {
        console.log(`  ❌ ${tableName}: RLS désactivé`);
        results.recommendations.push({
          priority: 'CRITIQUE',
          table: tableName,
          issue: 'RLS désactivé',
          action: `Activer RLS: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
          risk: 'Accès non contrôlé aux données'
        });
      });
    }
    
    if (protectedTables.length > 0) {
      console.log('\n✅ Tables correctement protégées:');
      protectedTables.forEach(([tableName]) => {
        console.log(`  🔒 ${tableName}: RLS activé`);
      });
    }
    
    if (errorTables.length > 0) {
      console.log('\n⚠️  Tables à vérifier:');
      errorTables.forEach(([tableName, info]) => {
        console.log(`  ❓ ${tableName}: ${info.error}`);
        results.recommendations.push({
          priority: 'MOYENNE',
          table: tableName,
          issue: 'Erreur d\'accès',
          action: 'Vérifier l\'existence et les permissions de la table',
          risk: 'Table potentiellement manquante ou mal configurée'
        });
      });
    }
    
    // Évaluation du niveau de risque global
    let riskLevel = 'FAIBLE';
    if (accessibleTables.length >= 3) {
      riskLevel = 'CRITIQUE';
    } else if (accessibleTables.length >= 1) {
      riskLevel = 'ÉLEVÉ';
    } else if (errorTables.length > 0) {
      riskLevel = 'MOYEN';
    }
    
    results.summary.riskLevel = riskLevel;
    
    console.log(`\n🎯 NIVEAU DE RISQUE GLOBAL: ${riskLevel}`);
    
    // Sauvegarde du rapport
    console.log('\n💾 Sauvegarde du rapport...');
    
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, 'simple-security-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Résumé textuel
    const summaryLines = [
      '🔍 RAPPORT AUDIT SÉCURITÉ SIMPLE',
      '================================',
      `Date: ${new Date(results.timestamp).toLocaleString('fr-FR')}`,
      `Niveau de risque: ${riskLevel}`,
      '',
      '📊 RÉSUMÉ:',
      `- Tables analysées: ${results.summary.totalTables}`,
      `- Tables accessibles (RLS désactivé): ${results.summary.accessibleTables}`,
      `- Tables protégées (RLS activé): ${results.summary.protectedTables}`,
      `- Tables en erreur: ${results.summary.errorTables}`,
      '',
      '🚨 ACTIONS PRIORITAIRES:',
      ...results.recommendations
        .filter(r => r.priority === 'CRITIQUE')
        .map(r => `- ${r.table}: ${r.action}`),
      '',
      '📋 PROCHAINES ÉTAPES:',
      '1. Activer RLS sur les tables non protégées',
      '2. Créer des policies appropriées',
      '3. Tester les permissions après activation',
      '4. Configurer le monitoring de sécurité'
    ];
    
    const summaryPath = path.join(reportsDir, 'simple-security-summary.txt');
    fs.writeFileSync(summaryPath, summaryLines.join('\n'));
    
    console.log(`✅ Rapport détaillé: ${reportPath}`);
    console.log(`✅ Résumé: ${summaryPath}`);
    
    console.log('\n🎯 PROCHAINES ÉTAPES RECOMMANDÉES:');
    console.log('1. Examiner les rapports générés');
    console.log('2. Activer RLS sur les tables non protégées');
    console.log('3. Créer des policies de sécurité appropriées');
    console.log('4. Re-exécuter cet audit pour vérifier');
    
    console.log('\n✅ Audit terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  }
}

// Exécution
runSimpleAudit();
