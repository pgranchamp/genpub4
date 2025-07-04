import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getMyOrganisation } from '../services/organisationService';

// Création du contexte d'organisation
const OrganisationContext = createContext();

// Hook personnalisé pour utiliser le contexte d'organisation
export const useOrganisation = () => {
  return useContext(OrganisationContext);
};

// Fournisseur du contexte d'organisation
export const OrganisationProvider = ({ children }) => {
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Refs pour la robustesse StrictMode
  const isMountedRef = useRef(true);
  const lastUserIdRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const organisationCacheRef = useRef(new Map());
  
  // ID unique pour debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  console.log(`[OrganisationContext-${instanceId.current}] 🏗️ Création instance OrganisationProvider`);

  // Fonction thread-safe pour les mises à jour d'état
  const safeSetState = useCallback((setter, value, stateName) => {
    if (isMountedRef.current) {
      console.log(`[OrganisationContext-${instanceId.current}] 🔄 ${stateName}:`, value);
      setter(value);
    } else {
      console.log(`[OrganisationContext-${instanceId.current}] ⚠️ ${stateName} ignoré (composant démonté)`);
    }
  }, []);

  const fetchOrganisation = useCallback(async (forceRefresh = false) => {
    const callId = Math.random().toString(36).substr(2, 9);
    const userId = user?.id;
    
    console.log(`[OrganisationContext-${instanceId.current}-${callId}] 🏢 fetchOrganisation appelé`);
    console.log(`[OrganisationContext-${instanceId.current}-${callId}] 📊 État: user=${!!user}, userId=${userId}, forceRefresh=${forceRefresh}`);
    
    if (!user || !userId) {
      console.log(`[OrganisationContext-${instanceId.current}-${callId}] 🚫 Pas d'utilisateur, reset organisation`);
      safeSetState(setOrganisation, null, 'setOrganisation');
      safeSetState(setLoading, false, 'setLoading');
      return;
    }

    // Vérifier le cache si pas de force refresh
    if (!forceRefresh && organisationCacheRef.current.has(userId)) {
      const cachedOrg = organisationCacheRef.current.get(userId);
      console.log(`[OrganisationContext-${instanceId.current}-${callId}] 💾 Utilisation du cache pour userId=${userId}`);
      safeSetState(setOrganisation, cachedOrg, 'setOrganisation');
      safeSetState(setLoading, false, 'setLoading');
      return cachedOrg;
    }

    safeSetState(setLoading, true, 'setLoading');
    
    try {
      console.log(`[OrganisationContext-${instanceId.current}-${callId}] 📡 Appel API getMyOrganisation...`);
      const startTime = Date.now();
      const orgData = await getMyOrganisation();
      const endTime = Date.now();
      
      if (!isMountedRef.current) {
        console.log(`[OrganisationContext-${instanceId.current}-${callId}] ⚠️ Composant démonté, abandon`);
        return;
      }
      
      console.log(`[OrganisationContext-${instanceId.current}-${callId}] ✅ Organisation récupérée en ${endTime - startTime}ms`);
      
      // Mettre en cache
      organisationCacheRef.current.set(userId, orgData);
      
      safeSetState(setOrganisation, orgData, 'setOrganisation');
      return orgData;
      
    } catch (err) {
      console.error(`[OrganisationContext-${instanceId.current}-${callId}] ❌ Erreur API:`, err);
      safeSetState(setOrganisation, null, 'setOrganisation');
    } finally {
      safeSetState(setLoading, false, 'setLoading');
    }
  }, [user?.id, safeSetState]); // Dépendance optimisée

  useEffect(() => {
    const userId = user?.id;
    
    console.log(`[OrganisationContext-${instanceId.current}] 🎯 useEffect déclenché`);
    console.log(`[OrganisationContext-${instanceId.current}] 📊 Comparaison: lastUserId=${lastUserIdRef.current}, currentUserId=${userId}`);
    
    // Éviter les appels redondants
    if (lastUserIdRef.current === userId) {
      console.log(`[OrganisationContext-${instanceId.current}] ⚠️ Même userId, appel ignoré`);
      return;
    }
    
    lastUserIdRef.current = userId;
    
    // Debounce pour éviter les appels multiples rapides
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`[OrganisationContext-${instanceId.current}] 🚀 Appel fetchOrganisation après debounce`);
        fetchOrganisation();
      }
    }, 100); // 100ms de debounce
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [user?.id, fetchOrganisation]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      console.log(`[OrganisationContext-${instanceId.current}] 🧹 Cleanup au démontage`);
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const isAnalysisPending = organisation?.website_url && !organisation?.key_elements;

  const value = {
    organisation,
    setOrganisation, // Exposer directement setOrganisation pour les mises à jour
    refreshOrganisation: () => fetchOrganisation(true), // Force refresh
    loading,
    hasOrganisation: !!organisation,
    isAnalysisPending, // Exposer le statut de l'analyse
  };

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
};

export default OrganisationContext;
