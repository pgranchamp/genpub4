import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import * as api from '../services/api';

/**
 * Composant de formulaire pour soumettre une description libre de projet
 * et la traiter avec OpenAI
 */
const InviteForm = () => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { organisation } = useOrganisation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Veuillez saisir une description de votre projet');
      return;
    }
    
    if (!organisation?.id) {
      setError('Aucune organisation sélectionnée');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Appeler l'API pour traiter la description avec OpenAI et créer le projet
      await api.createProjectFromInvite(description, organisation.id);
      
      // Rediriger vers la page des projets
      navigate('/projects');
    } catch (error) {
      console.error('Erreur lors de la soumission du projet:', error);
      setError(error.message || 'Une erreur est survenue lors de la soumission du projet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Décrivez votre projet</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label 
            htmlFor="description" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Décrivez librement votre projet, ses objectifs, son contexte...
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre projet ici..."
            className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-sm text-gray-500">
            Soyez aussi précis que possible pour obtenir les meilleures suggestions d'aides.
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Traitement en cours...
              </span>
            ) : (
              "Envoyer à Génie Public"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InviteForm;
