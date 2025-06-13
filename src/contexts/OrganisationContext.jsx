import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getMyOrganisation } from '../services/api'; // Importer la nouvelle fonction API

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

  const fetchOrganisation = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const orgData = await getMyOrganisation(); // Appel API pour récupérer les données complètes
        setOrganisation(orgData);
        return orgData; // Retourner les données fraîches
      } catch (err) {
        console.error("Erreur lors du chargement de l'organisation depuis l'API:", err);
        // Si l'utilisateur n'a pas encore d'organisation, ce n'est pas une erreur fatale
        setOrganisation(null);
      } finally {
        setLoading(false);
      }
    } else {
      // Pas d'utilisateur, pas d'organisation
      setOrganisation(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganisation();
  }, [fetchOrganisation]);

  const isAnalysisPending = organisation?.website_url && !organisation?.key_elements;

  const value = {
    organisation,
    setOrganisation, // Exposer directement setOrganisation pour les mises à jour
    refreshOrganisation: fetchOrganisation, // Fournir une fonction pour rafraîchir les données
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
