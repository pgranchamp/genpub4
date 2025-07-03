import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, getCategoriesList, getLastSelectionJob, getJobStatus, getSavedAides } from '../services';
import PropTypes from 'prop-types';

// Composant Accordéon local
const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-gray-200">
      <dt>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-start justify-between text-left text-gray-400 py-4"
        >
          <span className="font-bold text-gray-900">{title}</span>
          <span className="ml-6 flex h-7 items-center">
            <svg className={`h-6 w-6 transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </dt>
      {isOpen && (
        <dd className="pr-12 pb-4">
          <p className="text-base text-gray-700 whitespace-pre-wrap text-left">{children}</p>
        </dd>
      )}
    </div>
  );
};
Accordion.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const RefinedAideCard = ({ aide }) => {
  const [isOpen, setIsOpen] = useState(false); // Fermé par défaut

  const renderDetail = (title, value) => {
    if (!value) return null;
    return (
      <div>
        <h4 className="font-semibold text-sm text-gray-600">{title}</h4>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 mb-4 border border-gray-200">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-purple-800">{aide.title}</h3>
          <p className="text-sm text-gray-600 mt-1">Porteur : {aide.porteur_aide || 'N/A'}</p>
          <p className={`text-sm font-bold mt-1 ${aide.niveau_pertinence === 'Élevée' ? 'text-green-600' : 'text-blue-600'}`}>
            Pertinence : {aide.niveau_pertinence || 'N/A'} (Score: {aide.score_compatibilite?.toFixed(2) || 'N/A'})
          </p>
        </div>
        <span className="ml-6 flex h-7 items-center text-gray-400">
          <svg className={`h-6 w-6 transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {renderDetail("Justification", aide.justification)}
          {renderDetail("Points Positifs", aide.points_positifs)}
          {renderDetail("Points Négatifs", aide.points_negatifs)}
          {renderDetail("Recommandations", aide.recommandations)}
        </div>
      )}
      <a href={aide.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
        Voir la fiche originale &rarr;
      </a>
    </div>
  );
};
RefinedAideCard.propTypes = {
  aide: PropTypes.object.isRequired,
};


const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [categoryNames, setCategoryNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [job, setJob] = useState(null);
  
  const intervalRef = useRef(null);

  const TERMINAL_STATUSES = ['projet_analyse', 'aides_elargies', 'aides_affinees', 'failed'];

  const pollProjectStatus = async () => {
    console.log(`Polling pour le statut du projet...`);
    try {
      const projectData = await getProject(id);
      setProject(projectData);

      // Si le statut est terminal, on arrête le polling
      if (TERMINAL_STATUSES.includes(projectData.status)) {
        console.log(`Statut terminal atteint (${projectData.status}), arrêt du polling.`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      // Si la sélection est terminée, on va chercher les résultats du job
      if (projectData.status === 'aides_elargies' || projectData.status === 'aides_affinees') {
        const lastJob = await getLastSelectionJob(id);
        if (lastJob && lastJob.jobId) {
          const jobStatus = await getJobStatus(lastJob.jobId);
          setJob(jobStatus);
        }
      }

      // Si l'analyse est terminée (n'importe quel statut terminal), on charge les catégories
      if (TERMINAL_STATUSES.includes(projectData.status) && projectData.id_categories_aides_territoire) {
        if (projectData.id_categories_aides_territoire) {
          const allCategories = await getCategoriesList();
          const flatCategories = allCategories.flatMap(group => group.categories);
          const selectedIds = Array.isArray(projectData.id_categories_aides_territoire)
            ? projectData.id_categories_aides_territoire
            : JSON.parse(projectData.id_categories_aides_territoire);
          
          const names = selectedIds.map(catId => {
            const found = flatCategories.find(cat => cat.id === catId);
            return found ? found.categorie : `ID ${catId}`;
          });
          setCategoryNames(names);
        }
      }
    } catch (err) {
      console.error('Erreur lors du polling:', err);
      setError('Impossible de suivre la progression du projet.');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pollProjectStatus(); // Premier appel immédiat
    intervalRef.current = setInterval(pollProjectStatus, 10000); // Poll toutes les 10 secondes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
  }
  
  if (error) {
    return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>;
  }
  
  if (!project) {
    return <div className="text-center py-12 text-gray-500">Projet non trouvé.</div>;
  }
  
  const renderCard = (title, children, isAlignedLeft = false) => (
    <div className={`bg-white shadow overflow-hidden sm:rounded-lg mb-6 ${isAlignedLeft ? 'text-left' : ''}`}>
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-bold text-gray-900">{title}</h3>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {children}
      </div>
    </div>
  );

  const renderKeywordsAndCategories = () => (
    <>
      {project.keywords && (
        renderCard("Mots-clés thématiques", (
          <div className="flex flex-wrap gap-2">
            {(typeof project.keywords === 'string' ? JSON.parse(project.keywords) : project.keywords).map((keyword, index) => (
              <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">{keyword}</span>
            ))}
          </div>
        ))
      )}
      {categoryNames.length > 0 && (
        renderCard("Catégories d'aides suggérées", (
          <div className="flex flex-wrap gap-2">
            {categoryNames.map((name, index) => (
              <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">{name}</span>
            ))}
          </div>
        ))
      )}
    </>
  );

  const renderSelectionResults = () => {
    if (!job || !job.results) return null;
    const pertinentes = job.results.filter(r => r.decision === 'à voir');
    const totalAidesAnalysees = job.progress?.total_aides || 'N/A';

    return (
      <div className="mt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Résultats de la sélection d'aides</h2>
          <p className="text-gray-600 mt-2">
            La première sélection a identifié {pertinentes.length} aides pertinentes sur un total de {totalAidesAnalysees} aides analysées.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate(`/projects/${project.id}/aides`)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Lancer le raffinement et voir la progression
            </button>
          </div>
        </div>
      </div>
    );
  };

  const RenderRefinedAidesResults = ({ projectId }) => {
    const [refinedAides, setRefinedAides] = useState([]);
    const [loadingAides, setLoadingAides] = useState(true);

    useEffect(() => {
      const fetchAides = async () => {
        try {
          const aides = await getSavedAides(projectId);
          setRefinedAides(aides);
        } catch (err) {
          console.error("Erreur lors de la récupération des aides affinées:", err);
        } finally {
          setLoadingAides(false);
        }
      };
      fetchAides();
    }, [projectId]);

    if (loadingAides) {
      return <div className="text-center p-4">Chargement des aides affinées...</div>;
    }

    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Aides affinées pour votre projet</h2>
        {refinedAides.length > 0 ? (
          refinedAides.map(aide => <RefinedAideCard key={aide.id} aide={aide} />)
        ) : (
          <p className="text-center text-gray-500">Aucune aide affinée n'a été trouvée pour ce projet.</p>
        )}
      </div>
    );
  };
  RenderRefinedAidesResults.propTypes = {
    projectId: PropTypes.string.isRequired,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-extrabold text-gray-900">{project.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Statut : <span className="font-semibold">{project.status}</span></p>
      </div>

      {project.summary && renderCard("Résumé du projet", <p className="whitespace-pre-wrap text-gray-700">{project.summary}</p>, true)}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 px-4 sm:px-6">
        <dl className="divide-y divide-gray-200">
          {project.reformulation && <Accordion title="Reformulation administrative">{project.reformulation}</Accordion>}
          {project.description && <Accordion title="Description originale">{project.description}</Accordion>}
        </dl>
      </div>

      {!TERMINAL_STATUSES.includes(project.status) && (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <div className="flex justify-center items-center mb-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div></div>
          <h2 className="text-xl font-semibold text-gray-800">Analyse en cours...</h2>
          <p className="text-gray-600 mt-2">Génie Public analyse votre projet. Cette page se mettra à jour automatiquement.</p>
        </div>
      )}

      {['projet_analyse', 'aides_elargies', 'aides_affinees'].includes(project.status) && renderKeywordsAndCategories()}

      {project.status === 'projet_analyse' && (
        <div className="text-center mt-8">
          <button onClick={() => navigate(`/projects/${project.id}/aides`)} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Lancer la recherche d'aides
          </button>
        </div>
      )}

      {project.status === 'aides_elargies' && renderSelectionResults()}

      {project.status === 'aides_affinees' && <RenderRefinedAidesResults projectId={id} />}
    </div>
  );
};

export default ProjectDetail;
