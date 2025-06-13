import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject } from '../services';
import ChatInterface from '../components/ChatInterface.jsx';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Charger les détails du projet
  useEffect(() => {
    const fetchProject = async () => {
      try {
        // Utiliser getProject au lieu de getProjects pour récupérer directement le projet par son ID
        const projectData = await getProject(id);
        setProject(projectData);
      } catch (err) {
        console.error('Erreur lors du chargement du projet:', err);
        setError('Impossible de charger les détails du projet.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [id]);
  
  const handleAnalysisComplete = (analysisResult) => {
    // Mettre à jour l'état du projet et potentiellement naviguer
    // ou afficher les aides trouvées.
    console.log("Analyse terminée:", analysisResult);
    setProject(prev => ({ ...prev, ...analysisResult.project }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-genie-blue"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Projet non trouvé.</p>
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-genie hover:opacity-90"
        >
          Retour à la liste des projets
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-genie-navy font-inter">{project.title}</h1>
      </div>

      {/* Si le projet est vierge (pas de reformulation), afficher le chat */}
      {!project.reformulation ? (
        <ChatInterface project={project} onAnalysisComplete={handleAnalysisComplete} />
      ) : (
        <>
          {/* Sinon, afficher les résultats et le bouton de recherche d'aides */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Résumé</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6 whitespace-pre-wrap">
                {project.reformulation}
              </div>
            </div>
          </div>

          {project.keywords && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Mots-clés thématiques</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(project.keywords).map((keyword, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gradient-genie text-white"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center mb-8">
            <button
              // onClick={handleSearchAides} // TODO: Implémenter la recherche d'aides
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-genie-purple hover:bg-genie-purple/90"
            >
              Chercher des aides
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
