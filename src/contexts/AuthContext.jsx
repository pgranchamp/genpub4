import { createContext, useState, useEffect, useContext } from 'react';
import { getMe, getStoredToken, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          setAuthToken(token);
          const userData = await getMe();
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
          localStorage.removeItem('authToken');
          setError('Session expirée. Veuillez vous reconnecter.');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (userData) => {
    if (userData.user && userData.organisations) {
      setUser({
        ...userData.user,
        organisations: userData.organisations
      });
    } else {
      setUser(userData.user);
    }
    return userData;
  };

  const signup = async (userData) => {
    if (userData.token) {
      setAuthToken(userData.token);
    }
    
    if (userData.user && userData.organisation) {
      setUser({
        ...userData.user,
        organisations: [userData.organisation]
      });
    } else {
      setUser(userData.user);
    }
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const clearError = () => {
    setError(null);
  };

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
