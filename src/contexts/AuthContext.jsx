import { createContext, useState, useEffect, useContext } from 'react';
import { getMe, getStoredToken, setAuthToken } from '../services/api';

// Création du contexte d'authentification
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  return useContext(AuthContext);
};

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          setAuthToken(token);
          const userData = await getMe();
          // Mettre à jour l'utilisateur avec les organisations
          if (userData.user && userData.organisations) {
            setUser({
              ...userData.user,
              organisations: userData.organisations
            });
          } else {
            setUser(userData.user);
          }
        } catch (err) {
          console.error('Erreur lors de la vérification de l\'authentification:', err);
          // Si le token est invalide, on le supprime
          localStorage.removeItem('authToken');
          setError('Session expirée. Veuillez vous reconnecter.');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Fonction de connexion
  const login = async (userData) => {
    // Mettre à jour l'utilisateur avec les organisations
    if (userData.user && userData.organisations) {
      // Ajouter les organisations à l'utilisateur pour qu'elles soient disponibles dans le contexte d'organisation
      setUser({
        ...userData.user,
        organisations: userData.organisations
      });
    } else {
      setUser(userData.user);
    }
    return userData;
  };

  // Fonction d'inscription
  const signup = async (userData) => {
    // Mettre à jour l'utilisateur avec les organisations
    if (userData.user && userData.organisation) {
      // Ajouter l'organisation à l'utilisateur pour qu'elle soit disponible dans le contexte d'organisation
      setUser({
        ...userData.user,
        organisations: [userData.organisation]
      });
    } else {
      setUser(userData.user);
    }
    return userData;
  };

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  // Fonction pour effacer les erreurs
  const clearError = () => {
    setError(null);
  };

  // Valeur du contexte
  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
