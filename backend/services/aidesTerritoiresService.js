/**
 * Service de gestion des aides et de l'API Aides Territoires
 * Ce service s'exécute côté backend.
 */

import fetch from 'node-fetch';
import process from 'process';

const AIDES_TERRITOIRES_API_BASE = 'https://aides-territoires.beta.gouv.fr/api';

let aidesToken = null;
let aidesTokenExpiry = null;

const getAidesToken = async () => {
  const now = new Date();
  if (aidesToken && aidesTokenExpiry && now < aidesTokenExpiry) {
    console.log('[Backend] Utilisation du token Aides Territoires mis en cache.');
    return aidesToken;
  }

  console.log('[Backend] Le token est manquant, invalide ou expiré. Obtention d\'un nouveau token...');
  
  if (!process.env.AIDES_TERRITOIRES_API_KEY) {
    console.error('[Backend] Erreur critique: AIDES_TERRITOIRES_API_KEY n\'est pas défini dans les variables d\'environnement.');
    throw new Error('La clé API pour Aides Territoires n\'est pas configurée.');
  }

  try {
    const response = await fetch(`${AIDES_TERRITOIRES_API_BASE}/connexion/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_API_KEY,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Backend] Échec de l'obtention du token Aides Territoires. Statut: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Impossible d'obtenir le token Aides Territoires. Statut: ${response.status}`);
    }

    const data = await response.json();
    if (!data.token) {
        console.error('[Backend] La réponse de l\'API de connexion ne contient pas de token.');
        throw new Error('Réponse invalide de l\'API de connexion Aides Territoires.');
    }

    aidesToken = data.token;
    // Expiration dans 23 heures pour forcer un renouvellement avant l'expiration réelle de 24h
    aidesTokenExpiry = new Date(new Date().getTime() + 23 * 60 * 60 * 1000); 
    console.log('[Backend] Nouveau token Aides Territoires obtenu avec succès.');
    return aidesToken;

  } catch (error) {
    console.error('[Backend] Erreur lors de la tentative d\'obtention du token:', error);
    // Réinitialiser pour forcer une nouvelle tentative au prochain appel
    aidesToken = null;
    aidesTokenExpiry = null;
    // Propager l'erreur pour que l'appelant sache que l'opération a échoué
    throw error;
  }
};

/**
 * Recherche des aides dans l'API Aides Territoires
 * @param {Object} params - Les paramètres de recherche
 * @returns {Promise<Array>} Un tableau agrégé des aides
 */
export const searchAidesTerritoires = async (params = {}) => {
  console.log('[Backend][searchAidesTerritoires] Début de la recherche avec params:', JSON.stringify(params));
  const MAX_TOTAL_RESULTS_TO_FETCH = 300;
  let allResults = [];
  
  const queryParams = new URLSearchParams();
  for (const key in params) {
    if (Array.isArray(params[key])) {
      params[key].forEach(value => queryParams.append(`${key}[]`, value));
    } else {
      queryParams.append(key, params[key]);
    }
  }
  
  let urlToFetch = `${AIDES_TERRITOIRES_API_BASE}/aids/?${queryParams.toString()}`;

  try {
    const token = await getAidesToken();
    let pageCount = 0;
    do {
      pageCount++;
      console.log(`[Backend][searchAidesTerritoires] Récupération page ${pageCount}, URL: ${urlToFetch}`);
      
      const response = await fetch(urlToFetch, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Backend][searchAidesTerritoires] Erreur API Aides Territoires: ${response.status}`, errorBody);
        throw new Error(`Erreur de l'API Aides Territoires: ${response.status}`);
      }
      
      const pageData = await response.json();
      allResults = allResults.concat(pageData.results);
      
      urlToFetch = pageData.next && allResults.length < MAX_TOTAL_RESULTS_TO_FETCH ? pageData.next : null;

    } while (urlToFetch);

    console.log(`[Backend][searchAidesTerritoires] Recherche terminée. Total récupéré: ${allResults.length} aides.`);
    return allResults;

  } catch (error) {
    console.error('[Backend][searchAidesTerritoires] Erreur majeure:', error);
    throw error;
  }
};
