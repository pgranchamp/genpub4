/**
 * Service de gestion des aides et de l'API Aides Territoires
 * Ce service s'exécute côté backend.
 */

import fetch from 'node-fetch';

const AIDES_TERRITOIRES_API_BASE = 'https://aides-territoires.beta.gouv.fr/api';

let aidesToken = null;
let aidesTokenExpiry = null;

const getAidesToken = async () => {
  const now = new Date();
  if (aidesToken && aidesTokenExpiry && aidesTokenExpiry > now) {
    return aidesToken;
  }

  console.log('[Backend] Obtention d\'un nouveau token Aides Territoires...');
  const response = await fetch(`${AIDES_TERRITOIRES_API_BASE}/connexion/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Impossible d\'obtenir le token Aides Territoires');
  }

  const data = await response.json();
  aidesToken = data.token;
  aidesTokenExpiry = new Date(new Date().getTime() + 23 * 60 * 60 * 1000); // 23 heures
  console.log('[Backend] Nouveau token obtenu.');
  return aidesToken;
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
