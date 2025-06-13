/**
 * Service OpenAI - Façade
 * 
 * Ce module agit comme une interface publique pour les différentes fonctionnalités
 * d'analyse basées sur OpenAI. Il appelle les points de terminaison de l'API backend
 * pour effectuer les analyses.
 */

const API_BASE_URL = '/api'; // Assuming a proxy is set up in vite.config.js

import { getStoredToken } from './httpClient';

const post = async (endpoint, body) => {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(error.message);
  }

  return response.json();
};

// Note: These functions now need to be called from an async context.

// Analyse de projet
export const reformulateProjectInstitutional = (projectDescription, keyElements) => {
  return post('/project-analysis/reformulate', { projectDescription, keyElements });
};

export const extractProjectKeywords = (projectDescription, keyElements) => {
  return post('/project-analysis/keywords', { projectDescription, keyElements });
};

export const selectAidCategories = (projectDescription, reformulation, keywords, categoriesList) => {
  return post('/project-analysis/categories', { projectDescription, reformulation, keywords, categoriesList });
};

// TODO: Implémenter les appels API pour les autres services si nécessaire
// Par exemple, pour analyzeOrganizationWebsite, filterAidesPass1, filterAidesPass2
// qui ne sont pas encore migrés vers le backend.

// Pour l'instant, on exporte des fonctions vides pour éviter de casser les imports existants.
export const analyzeOrganizationWebsite = async () => {
  console.warn("analyzeOrganizationWebsite n'est pas encore migré vers l'API backend.");
  return Promise.resolve({});
};

// Ces fonctions sont maintenant obsolètes car la logique est sur le backend.
export const filterAidesFromAPI = async () => {
  console.warn("filterAidesFromAPI est déprécié. Utilisez la nouvelle route /api/aides/search-and-filter.");
  return Promise.resolve([]);
};

export const filterAidesPass1 = async () => {
  console.warn("filterAidesPass1 est déprécié.");
  return Promise.resolve([]);
};

export const filterAidesPass2 = async () => {
  console.warn("filterAidesPass2 est déprécié.");
  return Promise.resolve([]);
};

// Fonctions dépréciées mais nécessaires pour la compatibilité des imports
export const reformulateProjectV2 = async () => {
  console.warn("reformulateProjectV2 est déprécié.");
  return Promise.resolve({});
};
export const generateKeywords = async () => {
  console.warn("generateKeywords est déprécié.");
  return Promise.resolve([]);
};
export const analyserProjetEtAides = async () => {
  console.warn("analyserProjetEtAides est déprécié.");
  return Promise.resolve({ projet: {} });
};
export const reformulateProject = async () => {
  console.warn("reformulateProject est déprécié.");
  return Promise.resolve({});
};
