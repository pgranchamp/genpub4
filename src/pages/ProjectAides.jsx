import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProject } from '../services/projectService';
import { refineAndStreamAides, getSavedAides } from '../services/aidesService';
import { getStoredToken } from '../services/httpClient';

// Nouveau composant pour la carte d'aide avec accordéon
const AideCard = ({ aide }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 border border-gray-200 transition-shadow duration-300 flex flex-col">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        <h3 className="text-md font-semibold text-genie-purple mb-2">{aide.title}</h3>
        <p className="text-sm text-gray-500 mb-2">Porteur : {aide.porteur || 'Non spécifié'}</p>
        <p className={`text-sm font-bold mb-2 ${aide.niveau_pertinence === 'Élevée' ? 'text-green-600' : 'text-blue-600'}`}>
          Pertinence : {aide.niveau_pertinence || 'À évaluer'}
        </p>
      </div>
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Justification :</h4>
            <p className="text-sm text-gray-800">{aide.justification}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Points Positifs :</h4>
            <p className="text-sm text-gray-800">{aide.points_positifs}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Points Négatifs :</h4>
            <p className="text-sm text-gray-800">{aide.points_negatifs}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Recommandations :</h4>
            <p className="text-sm text-gray-800">{aide.recommandations}</p>
          </div>
          <a 
            href={aide.url}
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-genie-blue hover:text-genie-darkblue font-medium hover:underline inline-block mt-2"
          >
            Voir la fiche de l'aide &rarr;
          </a>
        </div>
      )}
    </div>
  );
};


const ProjectAides = () => {
  const { projectId } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  // États pour le suivi du processus
  const [phase, setPhase] = useState('initialisation'); // initialisation, recherche, traitement, termine
  const [stats, setStats] = useState({ total: 0, preselection: 0, aTraiter: 0 });
  const [aidesSelectionnees, setAidesSelectionnees] = useState([]);
  const [aidesTraitees, setAidesTraitees] = useState([]);
  const hasStreamBeenInitiated = useRef(false); // Le verrou

  useEffect(() => {
    if (!projectId || !isAuthenticated || hasStreamBeenInitiated.current) return;
    hasStreamBeenInitiated.current = true; // On active le verrou

    const streamAides = async () => {
      try {
        setPhase('recherche');
        setError(null);
        setAidesTraitees([]);

        const projectDetails = await getProject(projectId);
        setProject(projectDetails);
        if (!projectDetails) throw new Error("Projet non trouvé.");

        // Si les aides ont déjà été identifiées, on les charge simplement
        if (projectDetails.status === 'aides_identifiees') {
          setPhase('chargement_resultats');
          const savedAides = await getSavedAides(projectId);
          setAidesTraitees(savedAides);
          setPhase('termine');
          return; // On arrête le processus ici
        }

        // Sinon, on lance le streaming
        setPhase('traitement');
        const projectContext = {
          projectContext: projectDetails.reformulation || projectDetails.summary || projectDetails.description || '',
          keywords: Array.isArray(projectDetails.keywords) ? projectDetails.keywords : JSON.parse(projectDetails.keywords || '[]'),
          key_elements: projectDetails.organisation?.key_elements || '',
          id_categories_aides_territoire: Array.isArray(projectDetails.id_categories_aides_territoire) ? projectDetails.id_categories_aides_territoire : JSON.parse(projectDetails.id_categories_aides_territoire || '[]'),
          organisationType: projectDetails.organisation?.type,
          perimeterCode: projectDetails.organisation?.perimeter_code,
          projectId: projectDetails.id,
          organisationId: projectDetails.organisation_id,
        };

        const token = getStoredToken();

        const onData = (data) => {
          if (data.type === 'status') {
            setPhase('traitement');
            setStats({
              total: data.totalAidesTrouvees,
              preselection: data.aidesAPreselectionner,
              aTraiter: data.aidesSelectionnees.length
            });
            setAidesSelectionnees(data.aidesSelectionnees);
          } else {
            setAidesTraitees(prevAides => [...prevAides, data]);
          }
        };

        const onError = (err) => {
          console.error('[ProjectAides] Erreur de streaming:', err);
          setError('Une erreur est survenue durant la communication avec le serveur.');
          setPhase('termine');
        };

        const onEnd = () => {
          console.log('[ProjectAides] Streaming terminé.');
          setPhase('termine');
        };

        const abortStreaming = refineAndStreamAides(projectContext, token, onData, onError, onEnd);
        return () => abortStreaming();

      } catch (err) {
        console.error('[ProjectAides] Erreur initiale:', err);
        setError(err.message || 'Une erreur est survenue.');
        setPhase('termine');
      }
    };

    streamAides();
  }, [projectId, isAuthenticated]);

  const renderContent = () => {
    if (authLoading) {
      return <p>Vérification de l'authentification...</p>;
    }
    if (error) {
      return <p className="text-red-500">Erreur: {error}</p>;
    }

    switch (phase) {
      case 'initialisation':
        return <p>Initialisation...</p>;
      case 'recherche':
        return <p>Recherche des aides en cours...</p>;
      case 'chargement_resultats':
        return <p>Chargement des aides précédemment identifiées...</p>;
      case 'traitement':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse en cours</h2>
            <p>{stats.total} aides trouvées. {stats.preselection} aides présélectionnées par Génie Public.</p>
            <p className="font-bold mt-2">{stats.aTraiter} aides pertinentes en cours d'analyse approfondie :</p>
            <ul className="text-sm text-gray-600 list-disc list-inside my-2">
              {aidesSelectionnees.map((titre, index) => <li key={index}>{titre}</li>)}
            </ul>
            <p className="text-lg font-medium my-4">{aidesTraitees.length} / {stats.aTraiter} aides analysées</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(aidesTraitees.length / (stats.aTraiter || 1)) * 100}%` }}></div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aidesTraitees.map((aide) => <AideCard key={aide.id} aide={aide} />)}
            </div>
          </div>
        );
      case 'termine':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse terminée</h2>
            <p>{aidesTraitees.length} aides ont été analysées pour votre projet.</p>
            {aidesTraitees.length === 0 && <p>Aucune aide jugée pertinente n'a été trouvée après l'analyse.</p>}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aidesTraitees.map((aide) => <AideCard key={aide.id} aide={aide} />)}
            </div>
          </div>
        );
      default:
        return <p>Chargement...</p>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-genie-navy mb-2 font-inter">
        Aides pour le projet : {project?.title || '...'}
      </h1>
      <Link to="/dashboard/projects" className="text-genie-blue hover:underline mb-6 inline-block">
        &larr; Retour à la liste des projets
      </Link>
      <div className="bg-gray-100 p-8 rounded-lg text-center mt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default ProjectAides;
