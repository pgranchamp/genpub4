/**
 * Client HTTP pour les requêtes API
 * Fournit des fonctions de base pour les requêtes HTTP avec authentification Supabase
 */

/**
 * Récupère le token d'authentification Supabase
 * @returns {Promise<string|null>} Le token JWT Supabase ou null si non trouvé
 */
export const getSupabaseToken = async () => {
  try {
    // Essayer de récupérer le token depuis le localStorage directement
    const keys = Object.keys(localStorage).filter(key => key.includes('supabase.auth.token'));
    if (keys.length > 0) {
      const authData = JSON.parse(localStorage.getItem(keys[0]) || '{}');
      return authData?.access_token || null;
    }
    
    // Fallback : essayer avec une clé générique
    const genericKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
    if (genericKey) {
      const authData = JSON.parse(localStorage.getItem(genericKey) || '{}');
      return authData?.access_token || null;
    }
    
    return null;
  } catch (error) {
    console.warn('Erreur lors de la récupération du token:', error);
    return null;
  }
};

/**
 * Effectue une requête HTTP avec authentification Supabase vers notre propre backend.
 * @param {string} path - Le chemin de l'API (ex: '/api/organisations/me')
 * @param {Object} options - Les options de la requête fetch
 * @returns {Promise<Object>} La réponse JSON
 * @throws {Error} Si la requête échoue
 */
export const fetchWithAuth = async (path, options = {}) => {
  const token = await getSupabaseToken();
  const headers = { ...options.headers }; // Initialiser avec les headers optionnels

  // Ne pas définir Content-Type si le corps est FormData, le navigateur s'en charge.
  // Sinon, le définir par défaut à application/json si un corps est présent et n'est pas FormData.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // En production sur Vercel, fetch(path) fonctionnera car le frontend et l'API sont sur le même domaine.
  // En développement, le proxy Vite interceptera les requêtes vers 'path' (si configuré pour /api/*).
  const response = await fetch(path, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  
  return await response.json();
};

// Fonctions de compatibilité (non utilisées avec Supabase mais gardées pour éviter les erreurs)
export const setAuthToken = () => {};
export const getStoredToken = () => null;
export const clearAuthToken = () => {};
