import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import InviteForm from '../components/InviteForm';

/**
 * Page contenant le formulaire d'invite pour créer un projet
 * à partir d'une description libre
 */
const InvitePage = () => {
  const { isAuthenticated } = useAuth();
  const { currentOrganisation, loading: orgLoading } = useOrganisation();
  const navigate = useNavigate();

  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Rediriger vers la page de sélection d'organisation si aucune organisation n'est sélectionnée
  useEffect(() => {
    if (!orgLoading && !currentOrganisation) {
      navigate('/select-organisation');
    }
  }, [currentOrganisation, orgLoading, navigate]);

  if (!isAuthenticated || orgLoading || !currentOrganisation) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nouveau Projet</h1>
      
      <div className="mb-8">
        <p className="text-lg text-gray-700 mb-4">
          Décrivez votre projet ci-dessous et Génie Public vous aidera à le structurer et à trouver des financements adaptés.
        </p>
        <p className="text-gray-600">
          Notre intelligence artificielle analysera votre description pour :
        </p>
        <ul className="list-disc list-inside ml-4 mt-2 text-gray-600 space-y-1">
          <li>Reformuler votre projet de manière claire et structurée</li>
          <li>Extraire des mots-clés pertinents pour la recherche d'aides</li>
          <li>Vous suggérer des aides et subventions adaptées à votre projet</li>
        </ul>
      </div>
      
      <InviteForm />
    </div>
  );
};

export default InvitePage;
