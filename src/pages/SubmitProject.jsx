import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAndAnalyzeProject } from '../services/projectService'; // Nouveau service

const SubmitProject = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Veuillez décrire votre projet.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newProject = await createAndAnalyzeProject(description);
      // La redirection se fait vers la page de détail du projet nouvellement analysé
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Erreur lors de la création et analyse du projet:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Décrivez votre projet</h1>
      <p className="text-gray-600 mb-6">
        Fournissez une description de votre projet. Génie Public l'analysera pour en extraire un titre, un résumé, des mots-clés et les catégories d'aides pertinentes.
      </p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="sm:col-span-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description du projet *
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              name="description"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Ex: La commune de Plougonvelin souhaite rénover son éclairage public en installant des lampadaires LED basse consommation pour réduire sa facture énergétique de 50% et diminuer la pollution lumineuse..."
            />
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Analyse en cours...' : 'Analyser mon projet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitProject;
