/**
 * Client HTTP pour les requêtes API
 * Fournit des fonctions de base pour les requêtes HTTP avec authentification
 */

// Plus besoin de API_BASE_URL ici, les appels seront relatifs au domaine courant.
// La configuration du proxy Vite gérera la redirection en développement.

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
 * Effectue une requête HTTP avec authentification vers notre propre backend.
 * @param {string} path - Le chemin de l'API (ex: '/api/proxy/some-route')
 * @param {Object} options - Les options de la requête fetch
 * @returns {Promise<Object>} La réponse JSON
 * @throws {Error} Si la requête échoue
 */
export const fetchWithAuth = async (path, options = {}) => {
  const token = authToken || getStoredToken();
  const headers = { ...options.headers }; // Initialiser avec les headers optionnels

  // Ne pas définir Content-Type si le corps est FormData, le navigateur s'en charge.
  // Sinon, le définir par défaut à application/json si un corps est présent et n'est pas FormData.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Si Content-Type est application/json et que le corps n'est pas FormData,
  // s'assurer que le corps est stringifié s'il ne l'est pas déjà.
  // Note: projectService.js s'occupe déjà de JSON.stringify pour les corps non-FormData.
  // Cette logique est donc simplifiée ici.

  // En production sur Vercel, fetch(path) fonctionnera car le frontend et l'API sont sur le même domaine.
  // En développement, le proxy Vite interceptera les requêtes vers 'path' (si configuré pour /api/*).
  const response = await fetch(path, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  
  return await response.json();
};
