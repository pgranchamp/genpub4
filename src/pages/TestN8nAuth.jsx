import React, { useState } from 'react';
import { projectService } from '../services/projectService';

const TestN8nAuth = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testProjectAnalyzer = async () => {
    setLoading(true);
    setResult('Test en cours...');
    
    try {
      // Créer un projet de test
      const testProject = {
        description: 'Test de sécurisation n8n - Projet de développement durable pour une commune'
      };
      
      const response = await projectService.createProject(testProject);
      
      if (response.success) {
        setResult(`✅ Test réussi ! Projet créé avec ID: ${response.data.id}\nL'authentification n8n fonctionne correctement.`);
      } else {
        setResult(`❌ Erreur: ${response.error}`);
      }
    } catch (error) {
      setResult(`❌ Erreur de test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test d'authentification n8n</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Test du workflow project-analyzer</h2>
        <p className="text-gray-600 mb-4">
          Ce test vérifie que l'authentification Bearer token fonctionne correctement 
          avec le workflow n8n project-analyzer.
        </p>
        
        <button
          onClick={testProjectAnalyzer}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Test en cours...' : 'Tester project-analyzer'}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <h3 className="font-semibold mb-2">Résultat du test :</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>
      
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration n8n requise</h3>
        <p className="text-yellow-700 text-sm">
          Pour que ce test fonctionne, vous devez configurer l'authentification Header Auth 
          dans n8n pour le webhook project-analyzer :
        </p>
        <ul className="list-disc list-inside text-yellow-700 text-sm mt-2">
          <li>Type : Header Auth</li>
          <li>Header Name : Authorization</li>
          <li>Header Value : Bearer VOTRE_TOKEN_ICI</li>
        </ul>
      </div>
    </div>
  );
};

export default TestN8nAuth;
