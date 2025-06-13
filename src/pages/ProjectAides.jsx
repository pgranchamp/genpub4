import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../services/projectService';
import { searchAndFilterAides } from '../services/aidesService';

const ProjectAides = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [displayedAides, setDisplayedAides] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState('Chargement du projet...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndFilterAides = async () => {
      if (!projectId) return;

      try {
        setLoadingStatus('Chargement des détails du projet...');
        setError(null);
        const projectDetails = await getProject(projectId);
        setProject(projectDetails);
        if (!projectDetails) {
          throw new Error("Projet non trouvé.");
        }
        console.log('[ProjectAides] Détails du projet chargés:', projectDetails);

        setLoadingStatus('Recherche et filtrage des aides en cours...');
        
        const projectContext = {
          projectContext: projectDetails.reformulation || projectDetails.summary || projectDetails.description || '',
          keywords: Array.isArray(projectDetails.keywords) ? projectDetails.keywords : JSON.parse(projectDetails.keywords || '[]'),
          key_elements: projectDetails.organisation?.key_elements || '',
          id_categories_aides_territoire: Array.isArray(projectDetails.id_categories_aides_territoire) ? projectDetails.id_categories_aides_territoire : JSON.parse(projectDetails.id_categories_aides_territoire || '[]'),
          organisationType: projectDetails.organisation?.type,
          perimeterCode: projectDetails.organisation?.perimeter_code,
        };

        const finalAides = await searchAndFilterAides(projectContext);
        console.log(`[ProjectAides] ${finalAides.length} aides finales reçues du backend.`);
        
        setDisplayedAides(finalAides);
        setLoadingStatus('');

      } catch (err) {
        console.error('[ProjectAides] Erreur dans le processus de recherche et filtrage:', err);
        setError(err.message || 'Une erreur est survenue.');
        setLoadingStatus('');
      }
    };

    fetchAndFilterAides();
  }, [projectId]);

  if (loadingStatus) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-genie-blue mx-auto"></div>
        <p className="mt-4 text-lg font-medium text-gray-700">{loadingStatus}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-md text-center">
          <p>Erreur: {error}</p>
          <Link to="/projects" className="text-blue-500 hover:underline mt-2 inline-block">Retour à la liste des projets</Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl font-medium text-gray-700">Projet non trouvé.</p>
        <Link to="/projects" className="text-blue-500 hover:underline mt-2 inline-block">Retour à la liste des projets</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-genie-navy mb-2 font-inter">Aides pour le projet : {project.title}</h1>
      <Link to="/dashboard/projects" className="text-genie-blue hover:underline mb-6 inline-block">
        &larr; Retour à la liste des projets
      </Link>

      {displayedAides.length === 0 && !loadingStatus && !error && (
        <div className="bg-gray-100 p-8 rounded-lg text-center mt-6">
          <h2 className="text-xl font-medium text-genie-navy mb-4">Aucune aide pertinente trouvée pour ce projet après filtrage.</h2>
          <p className="text-gray-600">Vous pouvez essayer de modifier les critères de votre projet ou explorer manuellement.</p>
        </div>
      )}

      {displayedAides.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedAides.map((aide) => (
            <div key={aide.id} className={`bg-white shadow-lg rounded-lg p-6 border hover:shadow-xl transition-shadow duration-300 flex flex-col ${aide.decision === 'à voir' ? 'border-green-500' : 'border-gray-200 opacity-70'}`}>
              <h3 className="text-lg font-semibold text-genie-purple mb-2">{aide.title || 'Aide sans titre'}</h3>
              <p className={`text-sm font-bold mb-2 ${aide.decision === 'à voir' ? 'text-green-600' : 'text-red-600'}`}>
                Décision IA : {aide.decision}
              </p>
              <div className="mt-auto pt-3 border-t border-gray-200">
                <a 
                  href={aide.url && aide.url.startsWith('http') ? aide.url : `https://aides-territoires.beta.gouv.fr${aide.url}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-genie-blue hover:text-genie-darkblue font-medium hover:underline"
                >
                  Voir les détails de l'aide &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectAides;
