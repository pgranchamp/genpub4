import { useState } from 'react';
import { searchAidesTerritoires } from '../services/aidesService';

const TestCurl = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [requestUrl, setRequestUrl] = useState('');

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setRequestUrl('');

    const params = {
      perimeter_codes: ['83'],
      organization_type_slugs: ['private-person'],
      category_ids: ['20'],
    };

    // Build display URL
    const queryParamsForDisplay = new URLSearchParams();
    queryParamsForDisplay.append('perimeter_codes[]', params.perimeter_codes[0]);
    queryParamsForDisplay.append('organization_type_slugs[]', params.organization_type_slugs[0]);
    queryParamsForDisplay.append('category_ids[]', params.category_ids[0]);
    setRequestUrl(`/api/proxy/aides-territoires/aids?${queryParamsForDisplay.toString()}`);

    try {
      const searchResults = await searchAidesTerritoires(params);
      console.log('Search results received in component:', searchResults);
      setResults(searchResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('Rendering with results state:', results);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Page de Test pour imiter le Curl</h1>
      <p className="mb-4">
        Cette page teste l'appel à l'API avec les paramètres exacts de la commande curl fournie :
      </p>
      <ul className="list-disc list-inside bg-gray-100 p-4 rounded-md mb-4">
        <li>perimeter_codes[]: 83</li>
        <li>organization_type_slugs[]: private-person</li>
        <li>category_ids[]: 20</li>
      </ul>
      <button
        onClick={handleTest}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Chargement...' : 'Lancer le test'}
      </button>

      {requestUrl && (
        <div className="my-6 p-4 bg-gray-100 rounded-lg shadow">
          <h3 className="font-semibold text-gray-800">URL de la requête envoyée au proxy backend:</h3>
          <code className="block text-sm text-gray-600 break-all bg-gray-200 p-2 rounded mt-1">{requestUrl}</code>
        </div>
      )}

      {error && <div className="my-4 p-3 bg-red-100 text-red-700 rounded-md shadow">{error}</div>}

      {results && (
        <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Résultats</h2>
          <div className="p-3 bg-blue-50 rounded-md mb-3">
            <p className="text-blue-800">
              <span className="font-semibold">Nombre total d'aides (count API):</span> {results.count !== undefined ? results.count : 'N/A'}
            </p>
            <p className="text-blue-800">
              <span className="font-semibold">Nombre d'aides dans cette page (results.length):</span> {results.results?.length || 0}
            </p>
          </div>
          <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestCurl;
