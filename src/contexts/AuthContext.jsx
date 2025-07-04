import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { getUserProfile, forceSignOut } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs pour la robustesse StrictMode
  const subscriptionRef = useRef(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // ID unique pour debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  console.log(`[AuthContext-${instanceId.current}] 🏗️ Création instance AuthProvider`);

  useEffect(() => {
    // S'assurer que le composant est marqué comme monté
    isMountedRef.current = true;
    
    // Fonction de gestion d'état thread-safe
    const safeSetState = (setter, value, stateName) => {
      if (isMountedRef.current) {
        console.log(`[AuthContext-${instanceId.current}] 🔄 ${stateName}:`, value);
        setter(value);
      } else {
        console.log(`[AuthContext-${instanceId.current}] ⚠️ ${stateName} ignoré (composant démonté)`);
      }
    };

    // Fonction pour vérifier la session actuelle sans créer de subscription
    const checkCurrentSession = async () => {
      console.log(`[AuthContext-${instanceId.current}] 🔍 Vérification session existante`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await getUserProfile(session.user.id);
          safeSetState(setUser, profile, 'setUser');
          safeSetState(setError, null, 'setError');
        } else {
          safeSetState(setUser, null, 'setUser');
        }
      } catch (error) {
        console.error(`[AuthContext-${instanceId.current}] ❌ Erreur vérification session:`, error);
        safeSetState(setError, error.message, 'setError');
        safeSetState(setUser, null, 'setUser');
      } finally {
        safeSetState(setLoading, false, 'setLoading');
      }
    };

    // Éviter les multiples créations de subscription (StrictMode)
    if (isInitializedRef.current) {
      console.log(`[AuthContext-${instanceId.current}] ⚠️ Subscription existe déjà, vérification session seulement`);
      checkCurrentSession();
      return;
    }
    
    isInitializedRef.current = true;
    console.log(`[AuthContext-${instanceId.current}] 🚀 useEffect DÉMARRÉ (première fois)`);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext-${instanceId.current}] 📡 onAuthStateChange:`, event, session ? 'avec session' : 'sans session');
        
        if (!isMountedRef.current) {
          console.log(`[AuthContext-${instanceId.current}] ⚠️ Événement ignoré (composant démonté)`);
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          console.log(`[AuthContext-${instanceId.current}] ✅ Traitement SIGNED_IN`);
          try {
            const profile = await getUserProfile(session.user.id);
            safeSetState(setUser, profile, 'setUser');
            safeSetState(setError, null, 'setError');
          } catch (error) {
            console.error(`[AuthContext-${instanceId.current}] ❌ Erreur getUserProfile:`, error);
            safeSetState(setError, error.message, 'setError');
            safeSetState(setUser, null, 'setUser');
          } finally {
            safeSetState(setLoading, false, 'setLoading');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log(`[AuthContext-${instanceId.current}] 🚪 Traitement SIGNED_OUT`);
          safeSetState(setUser, null, 'setUser');
          safeSetState(setError, null, 'setError');
          safeSetState(setLoading, false, 'setLoading');
        } else if (event === 'INITIAL_SESSION') {
          console.log(`[AuthContext-${instanceId.current}] 🎯 Traitement INITIAL_SESSION`);
          if (session) {
            try {
              const profile = await getUserProfile(session.user.id);
              safeSetState(setUser, profile, 'setUser');
              safeSetState(setError, null, 'setError');
            } catch (error) {
              console.error(`[AuthContext-${instanceId.current}] ❌ Erreur profil initial:`, error);
              safeSetState(setError, error.message, 'setError');
              safeSetState(setUser, null, 'setUser');
            }
          } else {
            console.log(`[AuthContext-${instanceId.current}] 🚫 Pas de session initiale`);
            safeSetState(setUser, null, 'setUser');
          }
          safeSetState(setLoading, false, 'setLoading');
        } else {
          console.log(`[AuthContext-${instanceId.current}] ❓ Autre événement:`, event);
          safeSetState(setLoading, false, 'setLoading');
        }
      }
    );

    subscriptionRef.current = subscription;
    console.log(`[AuthContext-${instanceId.current}] 📞 Subscription créée et stockée`);
    
    return () => {
      console.log(`[AuthContext-${instanceId.current}] 🧹 Cleanup démarré`);
      isMountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        console.log(`[AuthContext-${instanceId.current}] ✅ Subscription nettoyée`);
      }
    };
  }, []); // Dependency array vide = une seule exécution

  const logout = async () => {
    try {
      console.log('[AuthContext] 🚪 Début logout standard');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setError(null);
      console.log('[AuthContext] ✅ Logout standard terminé');
    } catch (error) {
      console.error('[AuthContext] ❌ Erreur lors de la déconnexion:', error);
      setError(error.message);
    }
  };

  const forceLogout = async () => {
    try {
      console.log('[AuthContext] 🚨 Début forceLogout');
      await forceSignOut();
      setUser(null);
      setError(null);
      console.log('[AuthContext] ✅ ForceLogout terminé, redirection...');
      // Forcer un rechargement complet de la page pour nettoyer tous les états
      window.location.href = '/';
    } catch (error) {
      console.error('[AuthContext] ❌ Erreur lors de la déconnexion forcée:', error);
      setError(error.message);
      // En cas d'erreur, forcer quand même la redirection
      window.location.href = '/';
    }
  };

  const value = {
    user,
    loading,
    error,
    setError,
    isAuthenticated: !!user,
    logout,
    forceLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
