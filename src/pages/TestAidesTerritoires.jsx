import { useState, useEffect } from 'react';
import { getCategoriesList, searchAidesTerritoires } from '../services/aidesService'; // Ajuster les imports si nécessaire

const TestAidesTerritoires = () => {
  // États pour les champs du formulaire
  const [perimeter, setPerimeter] = useState(''); // Pour le code INSEE
  const [organizationType, setOrganizationType] = useState('private-sector'); // Slug par défaut
  const [categoryIds, setCategoryIds] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10); // 0 pour "tous" (pas de limit envoyé)
  const [orderBy, setOrderBy] = useState('relevance'); // Par défaut à relevance

  // États pour les résultats et le chargement
  const [availableCategories, setAvailableCategories] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestUrl, setRequestUrl] = useState('');
  const [rawJsonResponse, setRawJsonResponse] = useState(null); // Pour stocker la réponse brute

  // Charger les catégories au montagecd 
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catsData = await getCategoriesList(); 
        // La fonction getCategoriesList retourne un tableau de groupes, chaque groupe ayant des catégories.
        // Nous devons aplatir cela et s'assurer que chaque catégorie a un id et un nom (categorie).
        const allCats = catsData.reduce((acc, group) => {
          if (group.categories && Array.isArray(group.categories)) {
            group.categories.forEach(cat => {
              if (cat && cat.id && cat.categorie) {
                acc.push({ id: cat.id, nom: cat.categorie });
              }
            });
          }
          return acc;
        }, []);
        setAvailableCategories(allCats || []);
      } catch (err) {
        console.error("Erreur chargement catégories:", err);
        setError("Erreur chargement catégories.");
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setCategoryIds(selectedOptions.slice(0, 2)); // Limiter à 2 catégories
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setRequestUrl('');

    const paramsToLog = {}; // Pour construire l'URL de débogage
    const paramsForApi = {}; // Pour l'appel réel à searchAidesTerritoires

    // Gestion organizationType
    if (organizationType) { // Si un type est sélectionné (pas l'option "Tout type")
      paramsToLog.organization_type_slugs = organizationType; // Pour le log, on garde le slug simple
      paramsForApi.organization_type_slugs = [organizationType]; // Pour l'API, on envoie un tableau
    }

    // Gestion categories
    if (categoryIds.length > 0) {
      paramsToLog.category_ids = categoryIds.join(','); // Pour le log, une chaîne
      paramsForApi.category_ids = categoryIds; // Pour l'API, un tableau
    }
    
    paramsToLog.order_by = orderBy;
    paramsForApi.order_by = orderBy;

    // Gestion itemsPerPage (limit)
    const numItemsPerPage = parseInt(itemsPerPage, 10);
    if (numItemsPerPage > 0) {
      paramsToLog.itemsPerPage = numItemsPerPage; // Pour le log
      paramsForApi.itemsPerPage = numItemsPerPage; // Sera transformé en 'limit' par rechercherAidesOptimisees
    }
    // Si 0 ou NaN, on n'ajoute rien, donc pas de 'limit' envoyé

    // Gestion perimeter
    if (perimeter.trim()) {
      paramsToLog['perimeter_codes[]'] = perimeter.trim(); // Pour le log, pour montrer le format final
      paramsForApi.perimeter_codes = [perimeter.trim()]; // Pour l'API, un tableau
    }
    
    const queryParamsForDisplay = new URLSearchParams();
    Object.keys(paramsToLog).forEach(key => {
        if (Array.isArray(paramsToLog[key])) { // Devrait pas arriver avec paramsToLog
            paramsToLog[key].forEach(value => queryParamsForDisplay.append(key, value));
        } else if (paramsToLog[key] !== undefined && paramsToLog[key] !== null) {
            queryParamsForDisplay.append(key, paramsToLog[key]);
        }
    });
    setRequestUrl(`/api/proxy/aides-territoires/aids?${queryParamsForDisplay.toString()}`);

    try {
      const results = await searchAidesTerritoires(paramsForApi);
      setSearchResults(results); // Contient { count, results: [...] }
      setRawJsonResponse(results); // Stocker la réponse brute pour le téléchargement
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Page de Test API Aides Territoires</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6 bg-slate-50 p-6 rounded-lg shadow">
        {/* Champ Perimeter Code */}
        <div>
          <label htmlFor="perimeter" className="block text-sm font-medium text-gray-700">Code INSEE Périmètre (sera envoyé comme "perimeter_codes[]"):</label>
          <input type="text" id="perimeter" value={perimeter} onChange={(e) => setPerimeter(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" placeholder="Ex: 75056 ou 83039"/>
        </div>

        {/* Champ Organization Type Slug */}
        <div>
          <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700">Type d'organisation (slug Aides Territoires):</label>
          <select id="organizationType" value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
            <option value="">Tout type (ne pas filtrer)</option> 
            <option value="private-sector">Entreprise privée (private-sector)</option>
            <option value="association">Association (association)</option>
            <option value="commune">Commune (commune)</option>
            <option value="epci">EPCI (epci)</option>
            <option value="department">Département (department)</option>
            <option value="region">Région (region)</option>
            <option value="public-org">Établissement public / Collectivité d'outre-mer (public-org)</option>
            <option value="public-cies">Entreprise publique locale (public-cies)</option>
            <option value="private-person">Particulier (private-person)</option>
            <option value="farmer">Agriculteur (farmer)</option>
          </select>
        </div>

        {/* Champ Catégories (sélection multiple limitée à 2) */}
        <div>
          <label htmlFor="categories" className="block text-sm font-medium text-gray-700">Catégories (choisir jusqu'à 2):</label>
          <select id="categories" multiple value={categoryIds} onChange={handleCategoryChange} size="8" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
            {availableCategories.length === 0 && <option disabled>Chargement des catégories...</option>}
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nom} (ID: {cat.id})</option>
            ))}
          </select>
        </div>
        
        {/* Champ Items Per Page */}
        <div>
          <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700">Nombre d'aides par page (0 pour défaut API):</label>
          <input type="number" id="itemsPerPage" value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value,10))} min="0" max="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
        </div>

        {/* Champ Order By */}
        <div>
          <label htmlFor="orderBy" className="block text-sm font-medium text-gray-700">Trier par:</label>
          <select id="orderBy" value={orderBy} onChange={(e) => setOrderBy(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
            <option value="relevance">Pertinence (relevance)</option>
            <option value="publication_date">Date de publication (publication_date)</option>
            <option value="submission_deadline">Date limite de soumission (submission_deadline)</option>
          </select>
        </div>

        <button type="submit" disabled={isLoading} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Chargement...' : 'Lancer la recherche'}
        </button>
      </form>

      {requestUrl && (
        <div className="my-6 p-4 bg-gray-100 rounded-lg shadow">
          <h3 className="font-semibold text-gray-800">URL de la requête envoyée au proxy backend:</h3>
          <code className="block text-sm text-gray-600 break-all bg-gray-200 p-2 rounded mt-1">{requestUrl}</code>
          <p className="text-xs text-gray-500 mt-1 italic">Note: Le proxy backend transmettra ces paramètres à l'API Aides Territoires.</p>
        </div>
      )}

      {error && <div className="my-4 p-3 bg-red-100 text-red-700 rounded-md shadow">{error}</div>}

      {searchResults && (
        <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Résultats de la recherche</h2>
          <div className="p-3 bg-blue-50 rounded-md mb-3">
            <p className="text-blue-800"><span className="font-semibold">Nombre total d'aides correspondantes (count API):</span> {searchResults.count !== undefined ? searchResults.count : 'N/A'}</p>
            <p className="text-blue-800"><span className="font-semibold">Nombre d'aides dans cette page (results.length):</span> {searchResults.results?.length || 0}</p>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {searchResults.results?.map(aide => (
              <li key={aide.id || aide.url} className="text-gray-700">
                {aide.name || 'Aide sans titre'} (ID: {aide.id || 'N/A'})
                {aide.url && (
                  <a href={aide.url.startsWith('/') ? `https://aides-territoires.beta.gouv.fr${aide.url}` : aide.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800 hover:underline">
                    Voir détail
                  </a>
                )}
              </li>
            ))}
          </ul>
          {rawJsonResponse && (
            <button
              onClick={() => {
                const jsonString = JSON.stringify(rawJsonResponse, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = 'aides-territoires-results.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
              }}
              className="mt-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600"
            >
              Télécharger JSON des résultats
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TestAidesTerritoires;
