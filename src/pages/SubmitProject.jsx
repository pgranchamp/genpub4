import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../services/api';

const SubmitProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    location: '',
    start_date: '',
    end_date: '',
    category: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation basique
      if (!formData.title || !formData.description) {
        throw new Error('Le titre et la description sont obligatoires');
      }

      // Création du projet
      const newProject = await createProject(formData);
      
      // Redirection vers la page de détails du projet
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Erreur lors de la création du projet:', err);
      setError(err.message || 'Une erreur est survenue lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouveau Projet</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Titre du projet *
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="title"
                id="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Décrivez votre projet en détail. Cette description sera utilisée pour la recherche d'aides.
            </p>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
              Budget estimé (€)
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="budget"
                id="budget"
                value={formData.budget}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Catégorie
            </label>
            <div className="mt-1">
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Sélectionnez une catégorie</option>
                <option value="environnement">Environnement</option>
                <option value="numerique">Numérique</option>
                <option value="mobilite">Mobilité</option>
                <option value="education">Éducation</option>
                <option value="culture">Culture</option>
                <option value="sante">Santé</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Localisation
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="location"
                id="location"
                value={formData.location}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Ville, département ou région"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="start_date"
                id="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
              Date de fin
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="end_date"
                id="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
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
              {loading ? 'Création en cours...' : 'Créer le projet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitProject;
