/**
 * SECURITY AUDIT - GÉNIE PUBLIC V4
 * Script d'audit de sécurité complet pour la base de données
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

// Configuration de l'audit
const AUDIT_CONFIG = {
  tables: ['users', 'organisations', 'projects', 'projects_aides', 'categories_aides_territoire'],
  outputDir: path.join(__dirname, '../reports'),
  timestamp: new Date().toISOString()
};

// Niveaux de risque
const RISK_LEVELS = {
  LOW: 'FAIBLE',
  MEDIUM: 'MOYEN', 
  HIGH: 'ÉLEVÉ',
  CRITICAL: 'CRITIQUE'
};

class SecurityAuditor {
  constructor() {
    this.results = {
      timestamp: AUDIT_CONFIG.timestamp,
      summary: {},
      tables: {},
      policies: {},
      recommendations: [],
      riskLevel: RISK_LEVELS.LOW
    };
  }

  /**
   * Exécute l'audit complet de sécurité
   */
  async runFullAudit() {
    console.log('🔍 DÉMARRAGE AUDIT SÉCURITÉ GÉNIE PUBLIC V4');
    console.log('=====================================');
    
    try {
      // 1. Vérification de la connexion
      await this.checkConnection();
      
      // 2. Inventaire des tables
      await this.inventoryTables();
      
      // 3. Vérification RLS
      await this.checkRLSStatus();
      
      // 4. Inventaire des policies
      await this.inventoryPolicies();
      
      // 5. Test des permissions
      await this.testPermissions();
      
      // 6. Analyse des risques
      this.analyzeRisks();
      
      // 7. Génération des recommandations
      this.generateRecommendations();
      
      // 8. Sauvegarde du rapport
      await this.saveReport();
      
      // 9. Affichage du résumé
      this.displaySummary();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'audit:', error);
      process.exit(1);
    }
  }

  /**
   * Vérification de la connexion à Supabase
   */
  async checkConnection() {
    console.log('📡 Vérification connexion Supabase...');
    
    try {
      const { data: _data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) throw error;
      
      console.log('✅ Connexion Supabase OK');
      this.results.summary.connectionStatus = 'OK';
    } catch (error) {
      console.error('❌ Erreur connexion Supabase:', error.message);
      this.results.summary.connectionStatus = 'ERREUR';
      throw error;
    }
  }

  /**
   * Inventaire de toutes les tables
   */
  async inventoryTables() {
    console.log('📋 Inventaire des tables...');
    
    try {
      // Requête pour lister toutes les tables publiques
      const { data, error } = await supabaseAdmin.rpc('get_table_info');
      
      if (error) {
        // Fallback: utiliser les tables configurées
        console.log('⚠️  Utilisation de la liste de tables configurée');
        for (const tableName of AUDIT_CONFIG.tables) {
          this.results.tables[tableName] = {
            exists: true,
            rowCount: 'N/A'
          };
        }
      } else {
        // Traiter les résultats de la requête
        for (const table of data) {
          this.results.tables[table.table_name] = {
            exists: true,
            rowCount: table.row_count || 0
          };
        }
      }
      
      console.log(`✅ ${Object.keys(this.results.tables).length} tables inventoriées`);
    } catch (error) {
      console.error('❌ Erreur inventaire tables:', error.message);
      // Continuer avec les tables configurées
      for (const tableName of AUDIT_CONFIG.tables) {
        this.results.tables[tableName] = {
          exists: true,
          rowCount: 'N/A'
        };
      }
    }
  }

  /**
   * Vérification du statut RLS pour chaque table
   */
  async checkRLSStatus() {
    console.log('🔒 Vérification statut RLS...');
    
    for (const tableName of Object.keys(this.results.tables)) {
      try {
        // Tentative de requête pour détecter si RLS est actif
        const { data: _data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);
          
        // Si pas d'erreur, RLS est probablement désactivé ou policy permissive
        this.results.tables[tableName].rlsStatus = error ? 'ACTIF' : 'DÉSACTIVÉ';
        this.results.tables[tableName].rlsError = error?.message || null;
        
        console.log(`  ${tableName}: RLS ${this.results.tables[tableName].rlsStatus}`);
        
      } catch (error) {
        this.results.tables[tableName].rlsStatus = 'ERREUR';
        this.results.tables[tableName].rlsError = error.message;
        console.log(`  ${tableName}: ERREUR - ${error.message}`);
      }
    }
    
    console.log('✅ Vérification RLS terminée');
  }

  /**
   * Inventaire des policies de sécurité
   */
  async inventoryPolicies() {
    console.log('📜 Inventaire des policies...');
    
    try {
      // Tentative de récupération des policies via une requête système
      const { data, error } = await supabaseAdmin.rpc('get_policies_info');
      
      if (error) {
        console.log('⚠️  Impossible de récupérer les policies automatiquement');
        this.results.policies = {
          error: error.message,
          count: 0,
          details: {}
        };
      } else {
        this.results.policies = {
          count: data.length,
          details: {}
        };
        
        for (const policy of data) {
          if (!this.results.policies.details[policy.table_name]) {
            this.results.policies.details[policy.table_name] = [];
          }
          this.results.policies.details[policy.table_name].push({
            name: policy.policy_name,
            command: policy.command,
            roles: policy.roles
          });
        }
      }
      
      console.log(`✅ ${this.results.policies.count} policies inventoriées`);
    } catch (error) {
      console.error('❌ Erreur inventaire policies:', error.message);
      this.results.policies = {
        error: error.message,
        count: 0,
        details: {}
      };
    }
  }

  /**
   * Test des permissions d'accès
   */
  async testPermissions() {
    console.log('🧪 Test des permissions...');
    
    this.results.permissions = {};
    
    for (const tableName of Object.keys(this.results.tables)) {
      try {
        // Test lecture
        const { data: _readData, error: readError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);
          
        // Test écriture (simulation)
        const writeTest = readError ? 'BLOQUÉ' : 'AUTORISÉ';
        
        this.results.permissions[tableName] = {
          read: readError ? 'BLOQUÉ' : 'AUTORISÉ',
          write: writeTest,
          readError: readError?.message || null
        };
        
        console.log(`  ${tableName}: Lecture ${this.results.permissions[tableName].read}`);
        
      } catch (error) {
        this.results.permissions[tableName] = {
          read: 'ERREUR',
          write: 'ERREUR',
          error: error.message
        };
      }
    }
    
    console.log('✅ Test permissions terminé');
  }

  /**
   * Analyse des risques de sécurité
   */
  analyzeRisks() {
    console.log('⚠️  Analyse des risques...');
    
    let riskScore = 0;
    const risks = [];
    
    // Vérification RLS désactivé
    for (const [tableName, tableInfo] of Object.entries(this.results.tables)) {
      if (tableInfo.rlsStatus === 'DÉSACTIVÉ') {
        if (tableName === 'users' || tableName === 'organisations') {
          riskScore += 30; // Risque élevé pour tables sensibles
          risks.push(`RLS désactivé sur table sensible: ${tableName}`);
        } else {
          riskScore += 15; // Risque moyen pour autres tables
          risks.push(`RLS désactivé sur table: ${tableName}`);
        }
      }
    }
    
    // Vérification policies manquantes
    const tablesWithoutPolicies = Object.keys(this.results.tables).filter(
      tableName => !this.results.policies.details[tableName] || 
                   this.results.policies.details[tableName].length === 0
    );
    
    riskScore += tablesWithoutPolicies.length * 10;
    if (tablesWithoutPolicies.length > 0) {
      risks.push(`Tables sans policies: ${tablesWithoutPolicies.join(', ')}`);
    }
    
    // Détermination du niveau de risque global
    if (riskScore >= 50) {
      this.results.riskLevel = RISK_LEVELS.CRITICAL;
    } else if (riskScore >= 30) {
      this.results.riskLevel = RISK_LEVELS.HIGH;
    } else if (riskScore >= 15) {
      this.results.riskLevel = RISK_LEVELS.MEDIUM;
    } else {
      this.results.riskLevel = RISK_LEVELS.LOW;
    }
    
    this.results.summary.riskScore = riskScore;
    this.results.summary.risks = risks;
    
    console.log(`✅ Niveau de risque: ${this.results.riskLevel} (Score: ${riskScore})`);
  }

  /**
   * Génération des recommandations
   */
  generateRecommendations() {
    console.log('💡 Génération des recommandations...');
    
    const recommendations = [];
    
    // Recommandations RLS
    for (const [tableName, tableInfo] of Object.entries(this.results.tables)) {
      if (tableInfo.rlsStatus === 'DÉSACTIVÉ') {
        recommendations.push({
          priority: tableName === 'users' || tableName === 'organisations' ? 'CRITIQUE' : 'ÉLEVÉE',
          category: 'RLS',
          action: `Réactiver RLS sur la table ${tableName}`,
          command: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
        });
      }
    }
    
    // Recommandations policies
    const tablesWithoutPolicies = Object.keys(this.results.tables).filter(
      tableName => !this.results.policies.details[tableName] || 
                   this.results.policies.details[tableName].length === 0
    );
    
    for (const tableName of tablesWithoutPolicies) {
      recommendations.push({
        priority: 'MOYENNE',
        category: 'POLICIES',
        action: `Créer des policies pour la table ${tableName}`,
        command: `-- Créer policy SELECT/INSERT/UPDATE/DELETE pour ${tableName}`
      });
    }
    
    // Recommandations monitoring
    recommendations.push({
      priority: 'MOYENNE',
      category: 'MONITORING',
      action: 'Implémenter un système de logging sécurisé',
      command: 'Voir security-monitor.js'
    });
    
    this.results.recommendations = recommendations;
    console.log(`✅ ${recommendations.length} recommandations générées`);
  }

  /**
   * Sauvegarde du rapport d'audit
   */
  async saveReport() {
    console.log('💾 Sauvegarde du rapport...');
    
    try {
      // Créer le dossier reports s'il n'existe pas
      if (!fs.existsSync(AUDIT_CONFIG.outputDir)) {
        fs.mkdirSync(AUDIT_CONFIG.outputDir, { recursive: true });
      }
      
      // Sauvegarder le rapport JSON
      const reportPath = path.join(AUDIT_CONFIG.outputDir, 'security-audit-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      
      // Sauvegarder un résumé lisible
      const summaryPath = path.join(AUDIT_CONFIG.outputDir, 'security-audit-summary.txt');
      const summaryContent = this.generateTextSummary();
      fs.writeFileSync(summaryPath, summaryContent);
      
      console.log(`✅ Rapport sauvegardé: ${reportPath}`);
      console.log(`✅ Résumé sauvegardé: ${summaryPath}`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde rapport:', error.message);
    }
  }

  /**
   * Génération d'un résumé textuel
   */
  generateTextSummary() {
    const lines = [];
    lines.push('🔍 RAPPORT AUDIT SÉCURITÉ GÉNIE PUBLIC V4');
    lines.push('=====================================');
    lines.push(`Date: ${new Date(this.results.timestamp).toLocaleString('fr-FR')}`);
    lines.push(`Niveau de risque global: ${this.results.riskLevel}`);
    lines.push('');
    
    // Résumé tables
    lines.push('📊 RÉSUMÉ TABLES:');
    for (const [tableName, tableInfo] of Object.entries(this.results.tables)) {
      const status = tableInfo.rlsStatus === 'DÉSACTIVÉ' ? '❌' : '✅';
      lines.push(`  ${status} ${tableName}: RLS ${tableInfo.rlsStatus}`);
    }
    lines.push('');
    
    // Recommandations prioritaires
    lines.push('🚨 RECOMMANDATIONS PRIORITAIRES:');
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'CRITIQUE');
    const highRecs = this.results.recommendations.filter(r => r.priority === 'ÉLEVÉE');
    
    [...criticalRecs, ...highRecs].forEach((rec, index) => {
      lines.push(`  ${index + 1}. [${rec.priority}] ${rec.action}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Affichage du résumé dans la console
   */
  displaySummary() {
    console.log('\n🔍 RÉSUMÉ AUDIT SÉCURITÉ');
    console.log('========================');
    console.log(`📊 Tables analysées: ${Object.keys(this.results.tables).length}`);
    console.log(`🔒 Niveau de risque: ${this.results.riskLevel}`);
    console.log(`💡 Recommandations: ${this.results.recommendations.length}`);
    
    // Affichage des risques critiques
    const criticalRisks = this.results.summary.risks?.filter(risk => 
      risk.includes('users') || risk.includes('organisations')
    ) || [];
    
    if (criticalRisks.length > 0) {
      console.log('\n🚨 RISQUES CRITIQUES:');
      criticalRisks.forEach(risk => console.log(`  ❌ ${risk}`));
    }
    
    console.log('\n📋 Prochaines étapes:');
    console.log('  1. Examiner le rapport détaillé: backend/reports/security-audit-report.json');
    console.log('  2. Implémenter les recommandations prioritaires');
    console.log('  3. Exécuter rls-checker.js pour plus de détails RLS');
    console.log('  4. Configurer security-monitor.js pour le monitoring');
    
    console.log('\n✅ Audit terminé avec succès!');
  }
}

// Exécution du script
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new SecurityAuditor();
  auditor.runFullAudit().catch(console.error);
}

export { SecurityAuditor };
