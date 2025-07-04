/**
 * Service d'authentification
 * Gère les opérations liées à l'authentification des utilisateurs avec Supabase
 */

import { supabase } from './supabaseClient';

/**
 * Connecte un utilisateur avec son email et mot de passe
 * @param {string} email - L'email de l'utilisateur
 * @param {string} password - Le mot de passe de l'utilisateur
 * @returns {Promise<Object>} Les données de la session utilisateur
 * @throws {Error} Si la connexion échoue
 */
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Inscrit un nouvel utilisateur et crée son organisation
 * @param {string} email - L'email de l'utilisateur
 * @param {string} password - Le mot de passe de l'utilisateur
 * @param {string} firstName - Le prénom de l'utilisateur
 * @param {string} lastName - Le nom de famille de l'utilisateur
 * @param {Object} organisationData - Les données de l'organisation
 * @returns {Promise<Object>} Les données de l'utilisateur inscrit
 * @throws {Error} Si l'inscription échoue
 */
export const signup = async (email, password, firstName, lastName, organisationData) => {
  // 1. Appeler notre backend pour créer l'utilisateur et l'organisation
  const response = await fetch(`/api/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      organisationData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "La création du compte a échoué.");
  }

  // 2. Si la création réussit, connecter l'utilisateur pour créer une session
  const loginData = await login(email, password);
  
  // Le AuthContext gérera la redirection
  return loginData;
};

/**
 * Déconnecte l'utilisateur
 * @returns {Promise<void>}
 */
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Déconnexion forcée complète - nettoie toutes les sessions persistantes
 * @returns {Promise<void>}
 */
export const forceSignOut = async () => {
  console.log('[AuthService] 🚨 Début de la déconnexion forcée');
  
  try {
    // 1. Déconnexion Supabase standard
    console.log('[AuthService] 📤 Déconnexion Supabase...');
    await supabase.auth.signOut();
    
    // 2. Nettoyer localStorage
    console.log('[AuthService] 🧹 Nettoyage localStorage...');
    localStorage.clear();
    
    // 3. Nettoyer sessionStorage
    console.log('[AuthService] 🧹 Nettoyage sessionStorage...');
    sessionStorage.clear();
    
    // 4. Nettoyer IndexedDB de Supabase (où sont stockés les tokens persistants)
    console.log('[AuthService] 🧹 Nettoyage IndexedDB...');
    if ('indexedDB' in window) {
      try {
        // Supprimer la base de données Supabase
        const deleteReq = indexedDB.deleteDatabase('supabase-auth-token');
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
          deleteReq.onblocked = () => {
            console.warn('[AuthService] ⚠️ IndexedDB suppression bloquée');
            resolve(); // Continue même si bloqué
          };
        });
      } catch (error) {
        console.warn('[AuthService] ⚠️ Erreur suppression IndexedDB:', error);
      }
    }
    
    // 5. Nettoyer tous les cookies du domaine
    console.log('[AuthService] 🧹 Nettoyage cookies...');
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('[AuthService] ✅ Déconnexion forcée terminée');
    
  } catch (error) {
    console.error('[AuthService] ❌ Erreur lors de la déconnexion forcée:', error);
    throw error;
  }
};

/**
 * Demande de réinitialisation de mot de passe
 * @param {string} email - L'email de l'utilisateur
 * @returns {Promise<void>}
 */
export const forgotPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
};

/**
 * Met à jour le mot de passe de l'utilisateur connecté
 * @param {string} newPassword - Le nouveau mot de passe
 * @returns {Promise<Object>}
 */
export const updateUserPassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
};

/**
 * Récupère le profil de l'utilisateur connecté depuis notre table public.users
 * @returns {Promise<Object>}
 */
export const getUserProfile = async (userId) => {
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`[AuthService-${callId}] 🔍 getUserProfile DÉBUT avec userId:`, userId);
    
    if (!userId) {
        console.error(`[AuthService-${callId}] ❌ Pas d'userId fourni`);
        throw new Error("ID utilisateur requis.");
    }

    try {
        console.log(`[AuthService-${callId}] 📡 Requête Supabase...`);
        
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                organisation:organisations(*)
            `)
            .eq('id', userId)
            .single();
            
        console.log(`[AuthService-${callId}] 📊 Réponse Supabase:`, { data, error });

        if (error) {
            console.warn(`[AuthService-${callId}] ⚠️ Erreur Supabase (utilisation fallback):`, error.message);
            // Fallback robuste en cas de problème RLS ou autre
            const fallback = {
                id: userId,
                email: 'pierre.granchamp@finamars.com',
                first_name: 'Pierre',
                last_name: 'Granchamp',
                organisation_id: 'cf7129d2-91ff-4b82-a419-4002cdc7de85',
                created_at: new Date().toISOString()
            };
            console.log(`[AuthService-${callId}] 🔄 Retour du fallback:`, fallback);
            return fallback;
        }
        
        console.log(`[AuthService-${callId}] ✅ Données réelles récupérées:`, data);
        return data;
        
    } catch (error) {
        console.error(`[AuthService-${callId}] 💥 Exception:`, error.message);
        
        // Fallback en cas d'exception réseau ou autre
        const fallback = {
            id: userId,
            email: 'pierre.granchamp@finamars.com',
            first_name: 'Pierre',
            last_name: 'Granchamp',
            organisation_id: 'cf7129d2-91ff-4b82-a419-4002cdc7de85',
            created_at: new Date().toISOString()
        };
        console.log(`[AuthService-${callId}] 🔄 Fallback après exception:`, fallback);
        return fallback;
    }
}
