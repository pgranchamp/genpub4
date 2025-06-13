/**
 * Service de gestion des organisations
 * Gère les opérations liées aux organisations
 */

import { fetchWithAuth } from './httpClient'; // API_BASE_URL supprimé

/**
 * Crée une nouvelle organisation
 * @param {Object} organisationData - Les données de l'organisation
 * @returns {Promise<Object>} L'organisation créée
 * @throws {Error} Si la création échoue
 */
export const createOrganisation = async (organisationData) => {
  // Utiliser un chemin relatif
  return await fetchWithAuth(`/api/organisations`, {
    method: 'POST',
    body: JSON.stringify(organisationData)
  });
};

/**
 * Récupère toutes les organisations de l'utilisateur
 * @returns {Promise<Array>} Liste des organisations
 * @throws {Error} Si la récupération échoue
 */
export const getOrganisations = async () => {
  // Utiliser un chemin relatif
  return await fetchWithAuth(`/api/organisations`);
};

/**
 * Récupère une organisation par son ID
 * @param {string|number} organisationId - L'ID de l'organisation
 * @returns {Promise<Object>} L'organisation
 * @throws {Error} Si la récupération échoue
 */
export const getOrganisation = async (organisationId) => {
  // Utiliser un chemin relatif
  return await fetchWithAuth(`/api/organisations/${organisationId}`);
};

/**
 * Met à jour une organisation
 * @param {string|number} organisationId - L'ID de l'organisation
 * @param {Object} data - Les données à mettre à jour
 * @returns {Promise<Object>} L'organisation mise à jour
 * @throws {Error} Si la mise à jour échoue
 */
export const updateOrganisation = async (organisationId, data) => {
  try {
    console.log(`Tentative de mise à jour de l'organisation ${organisationId} avec les données:`, data);
    
    if (!organisationId) {
      throw new Error("ID d'organisation non valide");
    }
    
    // Envoyer les données telles quelles, sans mapping
    // Le backend s'attend à recevoir les noms de champs du formulaire (nom, adresse, etc.)
    console.log(`Envoi des données au backend:`, data);
    
    // Appel à l'API pour mettre à jour l'organisation
    // Utiliser un chemin relatif
    const response = await fetchWithAuth(`/api/organisations/${organisationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    
    console.log(`Organisation mise à jour avec succès:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'organisation ${organisationId}:`, error);
    throw error;
  }
};

/**
 * Associe un utilisateur à une organisation
 * @param {string|number} userId - L'ID de l'utilisateur
 * @param {string|number} organisationId - L'ID de l'organisation
 * @returns {Promise<Object>} Résultat de l'opération
 * @throws {Error} Si l'association échoue
 */
export const updateUserOrganisation = async (userId, organisationId) => {
  try {
    // Utiliser un chemin relatif
    const response = await fetchWithAuth(`/api/users/${userId}/organisation`, {
      method: 'PATCH',
      body: JSON.stringify({ organisation_id: organisationId })
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'association de l'organisation ${organisationId} à l'utilisateur ${userId}:`, error);
    throw error;
  }
};

/**
 * Récupère l'organisation principale de l'utilisateur connecté
 * @returns {Promise<Object>} L'organisation de l'utilisateur
 * @throws {Error} Si la récupération échoue
 */
export const getMyOrganisation = async () => {
  // Utiliser un chemin relatif. Le backend déterminera l'utilisateur via son token.
  const response = await fetchWithAuth(`/api/organisations/me`);
  return response.data; // La route backend devrait retourner directement l'objet organisation
};

export const getOrganisationStatus = async () => {
  try {
    const response = await fetchWithAuth('/api/organisations/me/status');
    return response;
  } catch (error) {
    console.error('Erreur lors de la récupération du statut de l\'organisation:', error);
    throw error;
  }
};
