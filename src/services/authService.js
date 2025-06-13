/**
 * Service d'authentification
 * Gère les opérations liées à l'authentification des utilisateurs
 */

import { fetchWithAuth, setAuthToken } from './httpClient';

/**
 * Connecte un utilisateur avec son email et mot de passe
 * @param {string} email - L'email de l'utilisateur
 * @param {string} password - Le mot de passe de l'utilisateur
 * @returns {Promise<Object>} Les données de l'utilisateur connecté
 * @throws {Error} Si la connexion échoue
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
    
    const data = await response.json();
    
    if (data.success && data.data.token) {
      setAuthToken(data.data.token);
      return {
        authToken: data.data.token,
        user: data.data.user,
        organisations: data.data.organisations
      };
    } else {
      throw new Error('Format de réponse invalide');
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  }
};

/**
 * Inscrit un nouvel utilisateur
 * @param {string} email - L'email de l'utilisateur
 * @param {string} password - Le mot de passe de l'utilisateur
 * @param {string} firstName - Le prénom de l'utilisateur
 * @param {string} lastName - Le nom de famille de l'utilisateur
 * @param {Object} organisation - Les données de l'organisation
 * @returns {Promise<Object>} Les données de l'utilisateur inscrit
 * @throws {Error} Si l'inscription échoue
 */
export const signup = async (email, password, firstName, lastName, organisation) => {
  try {
    const response = await fetch(`/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName,
        last_name: lastName,
        organisation
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Détails de l\'erreur de validation:', errorData.details);
      throw new Error(errorData.error || 'Signup failed');
    }
    
    const data = await response.json();
    
    if (data.success && data.data.token) {
      setAuthToken(data.data.token);
      return {
        authToken: data.data.token,
        user: data.data.user,
        organisation: data.data.organisation
      };
    } else {
      throw new Error('Format de réponse invalide');
    }
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    throw error;
  }
};

/**
 * Demande de réinitialisation de mot de passe
 * @param {string} email - L'email de l'utilisateur
 * @returns {Promise<Object>} Confirmation de l'envoi de l'email
 * @throws {Error} Si la demande échoue
 */
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Forgot password request failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    throw error;
  }
};

/**
 * Réinitialise le mot de passe d'un utilisateur
 * @param {string} email - L'email de l'utilisateur
 * @param {string} reset_code - Le code de réinitialisation
 * @param {string} new_password - Le nouveau mot de passe
 * @returns {Promise<Object>} Confirmation de la réinitialisation
 * @throws {Error} Si la réinitialisation échoue
 */
export const resetPassword = async (email, reset_code, new_password) => {
  try {
    const response = await fetch(`/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        reset_code, 
        new_password 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Password reset failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    throw error;
  }
};

/**
 * Récupère les informations de l'utilisateur connecté
 * @returns {Promise<Object>} Les données de l'utilisateur
 * @throws {Error} Si la récupération échoue
 */
export const getMe = async () => {
  try {
    const response = await fetchWithAuth(`/api/auth/me`);
    return {
      user: response.data.user,
      organisations: response.data.organisations
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error);
    throw error;
  }
};
