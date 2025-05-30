/**
 * Service de gestion des projets
 * Gère les opérations liées aux projets
 */

import { API_BASE_URL, fetchWithAuth } from './httpClient';

/**
 * Récupère tous les projets de l'utilisateur
 * @returns {Promise<Array>} Liste des projets
 * @throws {Error} Si la récupération échoue
 */
export const getProjects = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects`);
    return response.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    throw error;
  }
};

/**
 * Récupère un projet par son ID
 * @param {string|number} projectId - L'ID du projet
 * @returns {Promise<Object>} Le projet
 * @throws {Error} Si la récupération échoue
 */
export const getProject = async (projectId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau projet
 * @param {Object} projectData - Les données du projet
 * @param {string|number} organisationId - L'ID de l'organisation
 * @returns {Promise<Object>} Le projet créé
 * @throws {Error} Si la création échoue
 */
export const createProject = async (projectData, organisationId) => {
  try {
    // Ajouter l'ID de l'organisation aux données du projet
    const dataWithOrg = {
      ...projectData,
      organisation_id: organisationId
    };
    
    const response = await fetchWithAuth(`${API_BASE_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(dataWithOrg)
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création du projet:', error);
    throw error;
  }
};

/**
 * Met à jour un projet
 * @param {string|number} projectId - L'ID du projet
 * @param {Object} projectData - Les données à mettre à jour
 * @returns {Promise<Object>} Le projet mis à jour
 * @throws {Error} Si la mise à jour échoue
 */
export const updateProject = async (projectId, projectData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(projectData)
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Crée un projet à partir d'une invitation
 * @param {string} description - La description du projet
 * @param {string|number} organisationId - L'ID de l'organisation
 * @returns {Promise<Object>} Le projet créé
 * @throws {Error} Si la création échoue
 */
export const createProjectFromInvite = async (description, organisationId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/from-invite`, {
      method: 'POST',
      body: JSON.stringify({
        description,
        organisation_id: organisationId
      })
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création du projet depuis l\'invite:', error);
    throw error;
  }
};

/**
 * Récupère les aides associées à un projet
 * @param {string|number} projectId - L'ID du projet
 * @returns {Promise<Array>} Liste des aides
 * @throws {Error} Si la récupération échoue
 */
export const getProjectAides = async (projectId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/aides`);
    return response.data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des aides du projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Associe une aide à un projet
 * @param {string|number} projectId - L'ID du projet
 * @param {Object} aideData - Les données de l'aide
 * @returns {Promise<Object>} Résultat de l'opération
 * @throws {Error} Si l'association échoue
 */
export const linkAideToProject = async (projectId, aideData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/aides`, {
      method: 'POST',
      body: JSON.stringify(aideData)
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'association de l'aide au projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Gestion des fichiers joints aux projets
 */

/**
 * Télécharge un fichier pour un projet
 * @param {string|number} projectId - L'ID du projet
 * @param {File} file - Le fichier à télécharger
 * @returns {Promise<Object>} Résultat de l'opération
 * @throws {Error} Si le téléchargement échoue
 */
export const uploadProjectFile = async (projectId, file) => {
  try {
    const token = localStorage.getItem('authToken');
    
    // Utiliser FormData pour envoyer le fichier
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
        // Ne pas définir Content-Type ici, il sera automatiquement défini avec le boundary pour le multipart/form-data
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de l'upload du fichier pour le projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Récupère les fichiers d'un projet
 * @param {string|number} projectId - L'ID du projet
 * @returns {Promise<Array>} Liste des fichiers
 * @throws {Error} Si la récupération échoue
 */
export const getProjectFiles = async (projectId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/files`);
    return response.data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des fichiers du projet ${projectId}:`, error);
    throw error;
  }
};

/**
 * Supprime un fichier d'un projet
 * @param {string|number} projectId - L'ID du projet
 * @param {string|number} fileId - L'ID du fichier
 * @returns {Promise<Object>} Résultat de l'opération
 * @throws {Error} Si la suppression échoue
 */
export const deleteProjectFile = async (projectId, fileId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE'
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la suppression du fichier ${fileId} du projet ${projectId}:`, error);
    throw error;
  }
};
