import { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

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

  useEffect(() => {
    const loadOrganisation = async () => {
      // Vérifier si l'utilisateur a des organisations
      if (user?.organisations && user.organisations.length > 0) {
        try {
          // Utiliser la première organisation de la liste
          const firstOrg = user.organisations[0];
          setOrganisation(firstOrg);
        } catch (err) {
          console.error("Erreur lors du chargement de l'organisation:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    if (user) {
      loadOrganisation();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Fonction pour mettre à jour l'organisation dans le contexte
  const updateOrganisationContext = (orgData) => {
    setOrganisation(orgData);
  };

  const value = {
    organisation,
    setOrganisation: updateOrganisationContext,
    loading,
    hasOrganisation: !!organisation
  };

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
};

export default OrganisationContext;
