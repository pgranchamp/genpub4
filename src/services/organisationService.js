/**
 * Service de gestion des organisations
 * Gère les opérations liées aux organisations
 */

import { API_BASE_URL, fetchWithAuth } from './httpClient';

/**
 * Crée une nouvelle organisation
 * @param {Object} organisationData - Les données de l'organisation
 * @returns {Promise<Object>} L'organisation créée
 * @throws {Error} Si la création échoue
 */
export const createOrganisation = async (organisationData) => {
  return await fetchWithAuth(`${API_BASE_URL}/organisations`, {
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
  return await fetchWithAuth(`${API_BASE_URL}/organisations`);
};

/**
 * Récupère une organisation par son ID
 * @param {string|number} organisationId - L'ID de l'organisation
 * @returns {Promise<Object>} L'organisation
 * @throws {Error} Si la récupération échoue
 */
export const getOrganisation = async (organisationId) => {
  return await fetchWithAuth(`${API_BASE_URL}/organisations/${organisationId}`);
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
    const response = await fetchWithAuth(`${API_BASE_URL}/organisations/${organisationId}`, {
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
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}/organisation`, {
      method: 'PATCH',
      body: JSON.stringify({ organisation_id: organisationId })
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'association de l'organisation ${organisationId} à l'utilisateur ${userId}:`, error);
    throw error;
  }
};
