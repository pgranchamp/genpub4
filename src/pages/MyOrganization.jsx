import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { updateOrganisation } from '../services/api';

const MyOrganization = () => {
  const { user } = useAuth();
  const { organisation, refreshOrganisation } = useOrganisation();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'association',
    adresse_ligne1: '',
    code_postal: '',
    ville: '',
    siret: '',
    website_url: ''
  });
  
  const [keyElements, setKeyElements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Charger les données de l'organisation dans le formulaire
  useEffect(() => {
    if (organisation) {
      console.log("Organisation chargée dans le formulaire:", organisation);
      setFormData({
        name: organisation.name || '',
        type: organisation.type || 'association',
        adresse_ligne1: organisation.adresse_ligne1 || '',
        code_postal: organisation.code_postal || '',
        ville: organisation.ville || '',
        siret: organisation.siret || '',
        website_url: organisation.website_url || ''
      });

      if (organisation.key_elements) {
        try {
          // key_elements est stocké en tant que chaîne JSON, nous devons le parser
          const parsedElements = typeof organisation.key_elements === 'string' 
            ? JSON.parse(organisation.key_elements) 
            : organisation.key_elements;
          setKeyElements(parsedElements);
        } catch (e) {
          console.error("Erreur de parsing des key_elements:", e);
          setKeyElements({ error: "Format de données invalide" });
        }
      } else {
        setKeyElements(null);
      }
    }
  }, [organisation]);
  
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
    setSuccess(false);
    setError('');
    
    try {
      // Vérifier si l'organisation existe dans le contexte
      if (!organisation?.id) {
        // Si pas d'organisation dans le contexte, essayer de la récupérer depuis user.organisations
        if (!user?.organisations || user.organisations.length === 0) {
          throw new Error("Aucune organisation associée à cet utilisateur");
        }
        
        // Utiliser l'ID de la première organisation de l'utilisateur
        const orgId = user.organisations[0].id;
        console.log("ID de l'organisation récupéré depuis user.organisations[0].id:", orgId);
        
        await updateOrganisation(orgId, formData);
        await refreshOrganisation();
      } else {
        // Utiliser l'ID de l'organisation du contexte
        console.log("ID de l'organisation récupéré depuis le contexte:", organisation.id);
        
        await updateOrganisation(organisation.id, formData);
        await refreshOrganisation();
      }
      
      setSuccess(true);
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'organisation:", err);
      setError("Impossible de mettre à jour l'organisation. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-genie-navy mb-6 font-inter">Mon Organisation</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Les informations ont été mises à jour avec succès.</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-genie-navy font-inter">
            Nom de l'organisation
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 focus:ring-genie-blue focus:border-genie-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-inter font-normal"
            required
          />
        </div>
        
        <div>
          <label htmlFor="type" className="block text-sm font-bold text-genie-navy font-inter">
            Type de structure
          </label>
          <input
            type="text"
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 focus:ring-genie-blue focus:border-genie-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-inter font-normal"
          />
        </div>

        <div>
          <label htmlFor="adresse_ligne1" className="block text-sm font-bold text-genie-navy font-inter">
            Adresse
          </label>
          <input
            type="text"
            name="adresse_ligne1"
            id="adresse_ligne1"
            value={formData.adresse_ligne1}
            onChange={handleChange}
            className="mt-1 focus:ring-genie-blue focus:border-genie-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-inter font-normal"
          />
        </div>
        
        <div>
          <label htmlFor="siret" className="block text-sm font-bold text-genie-navy font-inter">
            SIRET (optionnel)
          </label>
          <input
            type="text"
            name="siret"
            id="siret"
            value={formData.siret}
            onChange={handleChange}
            className="mt-1 focus:ring-genie-blue focus:border-genie-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-inter font-normal"
          />
        </div>

        <div>
          <label htmlFor="website_url" className="block text-sm font-bold text-genie-navy font-inter">
            Site Web
          </label>
          <input
            type="text"
            name="website_url"
            id="website_url"
            value={formData.website_url}
            onChange={handleChange}
            className="mt-1 focus:ring-genie-blue focus:border-genie-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-inter font-normal"
          />
        </div>

        {keyElements && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-bold text-genie-navy mb-2">Analyse de l'organisation (par IA)</h2>
            {Object.entries(keyElements).map(([key, value]) => (
              <div key={key} className="mb-2">
                <p className="text-sm font-bold capitalize text-gray-600">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-800">{value.toString()}</p>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-genie-blue hover:bg-genie-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-genie-blue font-inter ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mise à jour...
              </>
            ) : (
              'Mettre à jour'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MyOrganization;
