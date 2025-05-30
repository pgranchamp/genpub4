/**
 * Utilitaire pour interagir avec l'API REST de Supabase
 */
const axios = require('axios');
require('dotenv').config();

// Configuration de base pour les requêtes Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client axios configuré pour Supabase avec la clé anonyme (pour les requêtes publiques)
const supabaseClient = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json'
  }
});

// Client axios configuré pour Supabase avec la clé de service (pour les opérations privilégiées)
const supabaseAdminClient = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});

/**
 * Exécute une requête vers l'API Supabase avec le client standard (clé anonyme)
 * @param {string} method - Méthode HTTP (GET, POST, PATCH, DELETE)
 * @param {string} endpoint - Endpoint de l'API (ex: 'users')
 * @param {Object} data - Données à envoyer (pour POST, PATCH)
 * @param {Object} params - Paramètres de requête (pour GET)
 * @param {string} authToken - Token JWT optionnel pour les requêtes authentifiées
 * @returns {Promise} - Promesse avec la réponse
 */
const supabaseRequest = async (method, endpoint, data = null, params = {}, authToken = null) => {
  try {
    console.log(`Requête Supabase (${method} ${endpoint}):`, { data, params });
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await supabaseClient({
      method,
      url: endpoint,
      data,
      params,
      headers
    });

    console.log(`Réponse Supabase (${method} ${endpoint}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Erreur Supabase (${method} ${endpoint}):`, error.response?.data || error.message);
    console.error(`Détails de l'erreur:`, error);
    throw error;
  }
};

/**
 * Exécute une requête vers l'API Supabase avec le client admin (clé de service)
 * @param {string} method - Méthode HTTP (GET, POST, PATCH, DELETE)
 * @param {string} endpoint - Endpoint de l'API (ex: 'users')
 * @param {Object} data - Données à envoyer (pour POST, PATCH)
 * @param {Object} params - Paramètres de requête (pour GET)
 * @returns {Promise} - Promesse avec la réponse
 */
const supabaseAdminRequest = async (method, endpoint, data = null, params = {}) => {
  try {
    console.log(`Requête Supabase Admin (${method} ${endpoint}):`, { data, params });
    
    const response = await supabaseAdminClient({
      method,
      url: endpoint,
      data,
      params
    });

    console.log(`Réponse Supabase Admin (${method} ${endpoint}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Erreur Supabase Admin (${method} ${endpoint}):`, error.response?.data || error.message);
    console.error(`Détails de l'erreur:`, error);
    throw error;
  }
};

module.exports = {
  supabaseRequest,
  supabaseAdminRequest
};
