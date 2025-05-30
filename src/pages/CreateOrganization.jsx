import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createOrganisation, updateUserOrganisation } from '../services/api';

const CreateOrganization = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nom: '',
    type: 'association',
    adresse: '',
    siret: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!user) {
        throw new Error("Vous devez être connecté pour créer une organisation");
      }
      
      // Créer l'organisation
      const newOrg = await createOrganisation(formData);
      
      // Associer l'organisation à l'utilisateur
      await updateUserOrganisation(user.id, newOrg.id);
      
      // Rediriger vers la page des projets
      navigate('/dashboard/projects');
    } catch (err) {
      console.error("Erreur lors de la création de l'organisation:", err);
      setError("Impossible de créer l'organisation. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Créer votre organisation</h1>
      
      <p className="mb-6 text-gray-600">
        Avant de pouvoir créer des projets, vous devez d'abord créer une organisation.
        Veuillez remplir les informations ci-dessous pour commencer.
      </p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
            Nom de l'organisation *
          </label>
          <input
            type="text"
            name="nom"
            id="nom"
            value={formData.nom}
            onChange={handleChange}
            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Type de structure *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          >
            <option value="association">Association</option>
            <option value="entreprise">Entreprise</option>
            <option value="collectivite">Collectivité</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="adresse" className="block text-sm font-medium text-gray-700">
            Adresse *
          </label>
          <textarea
            id="adresse"
            name="adresse"
            rows={3}
            value={formData.adresse}
            onChange={handleChange}
            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        
        <div>
          <label htmlFor="siret" className="block text-sm font-medium text-gray-700">
            SIRET (optionnel)
          </label>
          <input
            type="text"
            name="siret"
            id="siret"
            value={formData.siret}
            onChange={handleChange}
            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                Création en cours...
              </>
            ) : (
              'Créer mon organisation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrganization;
