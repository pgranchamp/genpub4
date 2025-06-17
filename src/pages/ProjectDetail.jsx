import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject, getCategoriesList } from '../services';
import ChatInterface from '../components/ChatInterface.jsx';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [categoryNames, setCategoryNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Charger les détails du projet
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectData = await getProject(id);
        setProject(projectData);

        if (projectData && projectData.id_categories_aides_territoire) {
          const allCategories = await getCategoriesList();
          const flatCategories = allCategories.flatMap(group => group.categories);
          const selectedIds = Array.isArray(projectData.id_categories_aides_territoire)
            ? projectData.id_categories_aides_territoire
            : JSON.parse(projectData.id_categories_aides_territoire);
          const names = selectedIds.map(id => {
            const found = flatCategories.find(cat => cat.id === id);
            return found ? found.categorie : `ID ${id}`;
          });
          setCategoryNames(names);
        }
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
    <div className="max-w-4xl">
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
              <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Description</h3>
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
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {(typeof project.keywords === 'string' ? JSON.parse(project.keywords) : project.keywords).map((keyword, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {categoryNames.length > 0 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Catégories d'aides retenues</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {categoryNames.map((name, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center mb-8">
            {project.status === 'aides_identifiees' ? (
              <Link
                to={`/projects/${project.id}/aides`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Accéder aux aides retenues
              </Link>
            ) : (
              <Link
                to={`/projects/${project.id}/aides`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-genie-purple hover:bg-genie-purple/90"
              >
                Explorer les aides
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
