/**
 * RLS CHECKER - GÉNIE PUBLIC V4
 * Script spécialisé pour vérifier Row Level Security
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

class RLSChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      rlsStatus: {},
      policies: {},
      recommendations: []
    };
  }

  /**
   * Exécute la vérification RLS complète
   */
  async runRLSCheck() {
    console.log('🔒 VÉRIFICATION RLS - GÉNIE PUBLIC V4');
    console.log('====================================');
    
    try {
      // 1. Vérification RLS via requêtes système
      await this.checkRLSSystemTables();
      
      // 2. Test pratique des permissions
      await this.testRLSPractical();
      
      // 3. Inventaire des policies
      await this.inventoryPoliciesDetailed();
      
      // 4. Génération des recommandations
      this.generateRLSRecommendations();
      
      // 5. Affichage des résultats
      this.displayResults();
      
      // 6. Sauvegarde du rapport
      await this.saveRLSReport();
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification RLS:', error);
      process.exit(1);
    }
  }

  /**
   * Vérification RLS via les tables système PostgreSQL
   */
  async checkRLSSystemTables() {
    console.log('📊 Vérification RLS via tables système...');
    
    try {
      // Requête pour vérifier l'état RLS de toutes les tables
      const rlsQuery = `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled,
          CASE 
            WHEN rowsecurity THEN 'ACTIVÉ'
            ELSE 'DÉSACTIVÉ'
          END as rls_status
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `;
      
      const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
        query: rlsQuery
      });
      
      if (rlsError) {
        console.log('⚠️  Impossible d\'exécuter la requête système, utilisation méthode alternative');
        await this.checkRLSAlternative();
      } else {
        for (const table of rlsData) {
          this.results.rlsStatus[table.tablename] = {
            schema: table.schemaname,
            rlsEnabled: table.rls_enabled,
            status: table.rls_status,
            method: 'SYSTÈME'
          };
          console.log(`  ${table.tablename}: ${table.rls_status}`);
        }
      }
      
    } catch (error) {
      console.log('⚠️  Erreur requête système, utilisation méthode alternative');
      console.log(`Détail erreur: ${error.message}`);
      await this.checkRLSAlternative();
    }
  }

  /**
   * Méthode alternative pour vérifier RLS
   */
  async checkRLSAlternative() {
    console.log('🔄 Vérification RLS par méthode alternative...');
    
    const tables = ['users', 'organisations', 'projects', 'projects_aides', 'categories_aides_territoire'];
    
    for (const tableName of tables) {
      try {
        // Test d'accès direct pour détecter RLS
        const { data: _data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);
          
        this.results.rlsStatus[tableName] = {
          schema: 'public',
          rlsEnabled: !!error,
          status: error ? 'ACTIVÉ (détecté)' : 'DÉSACTIVÉ (détecté)',
          method: 'DÉTECTION',
          error: error?.message || null
        };
        
        console.log(`  ${tableName}: ${this.results.rlsStatus[tableName].status}`);
        
      } catch (error) {
        this.results.rlsStatus[tableName] = {
          schema: 'public',
          rlsEnabled: null,
          status: 'ERREUR',
          method: 'DÉTECTION',
          error: error.message
        };
      }
    }
  }

  /**
   * Test pratique des permissions RLS
   */
  async testRLSPractical() {
    console.log('🧪 Test pratique des permissions RLS...');
    
    for (const [tableName, _tableInfo] of Object.entries(this.results.rlsStatus)) {
      try {
        // Test SELECT
        const { data: selectData, error: selectError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);
          
        // Test INSERT (simulation)
        let insertTest = 'NON_TESTÉ';
        if (!selectError) {
          // Si SELECT fonctionne, RLS est probablement désactivé
          insertTest = 'PROBABLEMENT_AUTORISÉ';
        } else if (selectError.message.includes('RLS') || selectError.message.includes('policy')) {
          insertTest = 'BLOQUÉ_PAR_RLS';
        }
        
        this.results.rlsStatus[tableName].practicalTest = {
          select: selectError ? 'BLOQUÉ' : 'AUTORISÉ',
          insert: insertTest,
          selectError: selectError?.message || null,
          dataCount: selectData?.length || 0
        };
        
        console.log(`  ${tableName}: SELECT ${this.results.rlsStatus[tableName].practicalTest.select}`);
        
      } catch (error) {
        this.results.rlsStatus[tableName].practicalTest = {
          select: 'ERREUR',
          insert: 'ERREUR',
          error: error.message
        };
      }
    }
  }

  /**
   * Inventaire détaillé des policies
   */
  async inventoryPoliciesDetailed() {
    console.log('📜 Inventaire détaillé des policies...');
    
    try {
      // Requête pour récupérer toutes les policies
      const policiesQuery = `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `;
      
      const { data: policiesData, error: policiesError } = await supabaseAdmin.rpc('exec_sql', {
        query: policiesQuery
      });
      
      if (policiesError) {
        console.log('⚠️  Impossible de récupérer les policies via requête système');
        this.results.policies = {
          error: policiesError.message,
          method: 'ERREUR'
        };
      } else {
        this.results.policies = {
          method: 'SYSTÈME',
          count: policiesData.length,
          byTable: {}
        };
        
        for (const policy of policiesData) {
          if (!this.results.policies.byTable[policy.tablename]) {
            this.results.policies.byTable[policy.tablename] = [];
          }
          
          this.results.policies.byTable[policy.tablename].push({
            name: policy.policyname,
            permissive: policy.permissive,
            roles: policy.roles,
            command: policy.cmd,
            condition: policy.qual,
            withCheck: policy.with_check
          });
        }
        
        console.log(`✅ ${policiesData.length} policies trouvées`);
        
        // Affichage par table
        for (const [tableName, policies] of Object.entries(this.results.policies.byTable)) {
          console.log(`  ${tableName}: ${policies.length} policy(ies)`);
          policies.forEach(policy => {
            console.log(`    - ${policy.name} (${policy.command})`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur inventaire policies:', error.message);
      this.results.policies = {
        error: error.message,
        method: 'ERREUR'
      };
    }
  }

  /**
   * Génération des recommandations RLS
   */
  generateRLSRecommendations() {
    console.log('💡 Génération des recommandations RLS...');
    
    const recommendations = [];
    
    // Analyse par table
    for (const [tableName, tableInfo] of Object.entries(this.results.rlsStatus)) {
      // RLS désactivé
      if (!tableInfo.rlsEnabled) {
        const priority = (tableName === 'users' || tableName === 'organisations') ? 'CRITIQUE' : 'ÉLEVÉE';
        recommendations.push({
          priority,
          category: 'RLS_ACTIVATION',
          table: tableName,
          action: `Activer RLS sur la table ${tableName}`,
          sql: `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`,
          reason: 'Table sensible sans protection RLS'
        });
      }
      
      // Policies manquantes
      const tablePolicies = this.results.policies.byTable?.[tableName] || [];
      if (tableInfo.rlsEnabled && tablePolicies.length === 0) {
        recommendations.push({
          priority: 'ÉLEVÉE',
          category: 'POLICIES_MANQUANTES',
          table: tableName,
          action: `Créer des policies pour la table ${tableName}`,
          sql: `-- Exemple de policy pour ${tableName}\nCREATE POLICY "${tableName}_policy" ON public.${tableName}\n  FOR ALL TO authenticated\n  USING (user_id = auth.uid());`,
          reason: 'RLS activé mais aucune policy définie'
        });
      }
      
      // Policies trop permissives
      if (tablePolicies.length > 0) {
        const permissivePolicies = tablePolicies.filter(p => !p.condition || p.condition === 'true');
        if (permissivePolicies.length > 0) {
          recommendations.push({
            priority: 'MOYENNE',
            category: 'POLICIES_PERMISSIVES',
            table: tableName,
            action: `Revoir les policies permissives sur ${tableName}`,
            sql: `-- Revoir les policies: ${permissivePolicies.map(p => p.name).join(', ')}`,
            reason: 'Policies sans conditions restrictives'
          });
        }
      }
    }
    
    this.results.recommendations = recommendations;
    console.log(`✅ ${recommendations.length} recommandations générées`);
  }

  /**
   * Affichage des résultats
   */
  displayResults() {
    console.log('\n🔒 RÉSULTATS VÉRIFICATION RLS');
    console.log('=============================');
    
    // Résumé par table
    const tablesCount = Object.keys(this.results.rlsStatus).length;
    const rlsEnabled = Object.values(this.results.rlsStatus).filter(t => t.rlsEnabled).length;
    const rlsDisabled = tablesCount - rlsEnabled;
    
    console.log(`📊 Tables analysées: ${tablesCount}`);
    console.log(`✅ RLS activé: ${rlsEnabled}`);
    console.log(`❌ RLS désactivé: ${rlsDisabled}`);
    
    // Détail par table
    console.log('\n📋 DÉTAIL PAR TABLE:');
    for (const [tableName, tableInfo] of Object.entries(this.results.rlsStatus)) {
      const status = tableInfo.rlsEnabled ? '✅' : '❌';
      const policiesCount = this.results.policies.byTable?.[tableName]?.length || 0;
      console.log(`  ${status} ${tableName}: ${tableInfo.status} (${policiesCount} policies)`);
    }
    
    // Recommandations critiques
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'CRITIQUE');
    if (criticalRecs.length > 0) {
      console.log('\n🚨 ACTIONS CRITIQUES:');
      criticalRecs.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.action}`);
        console.log(`     SQL: ${rec.sql}`);
      });
    }
    
    console.log('\n📋 Prochaines étapes:');
    console.log('  1. Examiner le rapport détaillé: backend/reports/rls-check-report.json');
    console.log('  2. Exécuter les commandes SQL recommandées');
    console.log('  3. Tester les permissions après activation RLS');
    console.log('  4. Créer les policies appropriées');
  }

  /**
   * Sauvegarde du rapport RLS
   */
  async saveRLSReport() {
    console.log('💾 Sauvegarde du rapport RLS...');
    
    try {
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Rapport JSON détaillé
      const reportPath = path.join(reportsDir, 'rls-check-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      
      // Script SQL des recommandations
      const sqlPath = path.join(reportsDir, 'rls-recommendations.sql');
      const sqlContent = this.generateSQLScript();
      fs.writeFileSync(sqlPath, sqlContent);
      
      console.log(`✅ Rapport RLS sauvegardé: ${reportPath}`);
      console.log(`✅ Script SQL généré: ${sqlPath}`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde rapport RLS:', error.message);
    }
  }

  /**
   * Génération du script SQL des recommandations
   */
  generateSQLScript() {
    const lines = [];
    lines.push('-- SCRIPT SQL - RECOMMANDATIONS RLS');
    lines.push('-- Généré automatiquement par rls-checker.js');
    lines.push(`-- Date: ${new Date().toLocaleString('fr-FR')}`);
    lines.push('');
    lines.push('-- ⚠️  ATTENTION: Testez ces commandes sur un environnement de développement d\'abord!');
    lines.push('');
    
    // Grouper par priorité
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'CRITIQUE');
    const highRecs = this.results.recommendations.filter(r => r.priority === 'ÉLEVÉE');
    const mediumRecs = this.results.recommendations.filter(r => r.priority === 'MOYENNE');
    
    if (criticalRecs.length > 0) {
      lines.push('-- 🚨 ACTIONS CRITIQUES (À FAIRE EN PREMIER)');
      lines.push('-- ==========================================');
      criticalRecs.forEach(rec => {
        lines.push(`-- ${rec.action}`);
        lines.push(rec.sql);
        lines.push('');
      });
    }
    
    if (highRecs.length > 0) {
      lines.push('-- ⚠️  ACTIONS PRIORITAIRES');
      lines.push('-- ========================');
      highRecs.forEach(rec => {
        lines.push(`-- ${rec.action}`);
        lines.push(rec.sql);
        lines.push('');
      });
    }
    
    if (mediumRecs.length > 0) {
      lines.push('-- 💡 AMÉLIORATIONS RECOMMANDÉES');
      lines.push('-- ==============================');
      mediumRecs.forEach(rec => {
        lines.push(`-- ${rec.action}`);
        lines.push(rec.sql);
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }
}

// Exécution du script
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new RLSChecker();
  checker.runRLSCheck().catch(console.error);
}

export { RLSChecker };
