/**
 * CHECK CONFIG - GÉNIE PUBLIC V4
 * Script de vérification de la configuration avant audit
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

console.log('🔧 VÉRIFICATION CONFIGURATION - GÉNIE PUBLIC V4');
console.log('===============================================');

// Vérifier l'existence du fichier .env
const envPath = path.join(__dirname, '../.env');
const envExists = fs.existsSync(envPath);

console.log(`📁 Fichier .env: ${envExists ? '✅ Trouvé' : '❌ Manquant'}`);

if (!envExists) {
  console.log('\n🚨 PROBLÈME DÉTECTÉ:');
  console.log('Le fichier .env est manquant dans le dossier backend/');
  console.log('\n📋 SOLUTION:');
  console.log('1. Copiez le fichier .env.example vers .env:');
  console.log('   cp .env.example .env');
  console.log('2. Modifiez .env avec vos vraies valeurs Supabase');
  console.log('3. Re-exécutez: npm run security:all');
  process.exit(1);
}

// Vérifier les variables d'environnement requises
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n🔑 Variables d\'environnement:');
let allConfigured = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  const isConfigured = value && !value.includes('your-') && !value.includes('your_');
  
  console.log(`  ${varName}: ${isConfigured ? '✅ Configuré' : '❌ Manquant/Exemple'}`);
  
  if (!isConfigured) {
    allConfigured = false;
  }
}

if (!allConfigured) {
  console.log('\n🚨 PROBLÈME DÉTECTÉ:');
  console.log('Certaines variables d\'environnement ne sont pas configurées.');
  console.log('\n📋 SOLUTION:');
  console.log('1. Ouvrez le fichier backend/.env');
  console.log('2. Remplacez les valeurs d\'exemple par vos vraies valeurs Supabase:');
  console.log('   - SUPABASE_URL: URL de votre projet Supabase');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY: Clé service_role de Supabase');
  console.log('3. Re-exécutez: npm run security:all');
  process.exit(1);
}

// Test de connexion basique
console.log('\n🔌 Test de connexion Supabase...');

try {
  // Import dynamique pour éviter les erreurs si la config est mauvaise
  const { supabaseAdmin } = await import('../utils/supabaseClient.js');
  
  // Test simple
  const { data: _data, error } = await supabaseAdmin
    .from('users')
    .select('count')
    .limit(1);
    
  if (error) {
    console.log(`  ❌ Erreur de connexion: ${error.message}`);
    console.log('\n📋 VÉRIFICATIONS:');
    console.log('1. URL Supabase correcte?');
    console.log('2. Clé service_role correcte?');
    console.log('3. Accès réseau à Supabase autorisé?');
  } else {
    console.log('  ✅ Connexion Supabase réussie');
  }
  
} catch (error) {
  console.log(`  ❌ Erreur de connexion: ${error.message}`);
}

console.log('\n✅ Vérification terminée!');
console.log('\nSi tout est ✅, vous pouvez maintenant exécuter:');
console.log('  npm run security:all');
