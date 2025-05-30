import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { createProject } from '../services/api';

const DashboardHome = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { organisation } = useOrganisation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Créer un nouveau projet avec la description fournie
      const projectData = {
        title: `Projet du ${new Date().toLocaleDateString()}`,
        description: prompt,
        summary: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      };

      const response = await createProject(projectData, organisation?.id);
      console.log('Projet créé:', response);
      console.log('ID du projet:', response.id, 'Type:', typeof response.id);
      
      // Rediriger vers la page du projet
      navigate(`/projects/${response.id}`);
    } catch (err) {
      console.error('Erreur lors de la création du projet:', err);
      setError('Impossible de créer le projet. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invite de commande</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Présentez-vous succinctement : nom de votre organisation, type de structure (asso, entreprise, collectivité, autre), votre zone géographique ainsi que le projet que vous avez en tête, en quelques mots.
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={6}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Décrivez votre projet ici..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              </>
            ) : (
              'Envoyer à Génie Public'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DashboardHome;
