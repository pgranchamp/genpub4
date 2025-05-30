/**
 * Client HTTP pour les requêtes API
 * Fournit des fonctions de base pour les requêtes HTTP avec authentification
 */

// URL de base du backend Express
export const API_BASE_URL = 'http://localhost:3000';

// Gestion du token d'authentification
let authToken = null;

/**
 * Définit le token d'authentification et le stocke dans le localStorage
 * @param {string} token - Le token JWT
 */
export const setAuthToken = (token) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

/**
 * Récupère le token d'authentification stocké dans le localStorage
 * @returns {string|null} Le token JWT ou null si non trouvé
 */
export const getStoredToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Supprime le token d'authentification du localStorage et de la mémoire
 */
export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
};

/**
 * Effectue une requête HTTP avec authentification
 * @param {string} url - L'URL de la requête
 * @param {Object} options - Les options de la requête fetch
 * @returns {Promise<Object>} La réponse JSON
 * @throws {Error} Si la requête échoue
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = authToken || getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  
  return await response.json();
};
