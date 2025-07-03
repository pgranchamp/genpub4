import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProject } from '../services/projectService';
import { startSelectionJob, getJobStatus, getSavedAides, startRefinementJob, getLastSelectionJob } from '../services/aidesService';

// Nouveau composant pour la carte d'aide avec accordéon
const AideCard = ({ aide, isRefined }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = isRefined && aide.justification;

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 border border-gray-200 transition-shadow duration-300 flex flex-col">
      <div onClick={() => hasDetails && setIsOpen(!isOpen)} className={hasDetails ? 'cursor-pointer' : ''}>
        <h3 className="text-md font-semibold text-genie-purple mb-2">{aide.title}</h3>
        {hasDetails && (
          <>
            <p className="text-sm text-gray-500 mb-2">Porteur : {aide.porteur_aide || 'Non spécifié'}</p>
            <p className={`text-sm font-bold mb-2 ${aide.niveau_pertinence === 'Élevée' ? 'text-green-600' : 'text-blue-600'}`}>
              Pertinence : {aide.niveau_pertinence || 'À évaluer'}
            </p>
          </>
        )}
      </div>
      {hasDetails && isOpen && (
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
        </div>
      )}
      <a 
        href={aide.url}
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm text-genie-blue hover:text-genie-darkblue font-medium hover:underline inline-block mt-auto pt-2"
      >
        Voir la fiche de l'aide &rarr;
      </a>
    </div>
  );
};


const ProjectAides = () => {
  const { projectId } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  // États pour le suivi du processus asynchrone
  const [phase, setPhase] = useState('initialisation'); // initialisation, recherche, traitement, selection_done, refining, termine
  const [selectionJobId, setSelectionJobId] = useState(null);
  const [refinementJobId, setRefinementJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState({
    isComplete: false,
    status: 'idle',
    progress: { processed_aides: 0, total_aides: 0 },
    results: [],
  });
  const effectRan = useRef(false);
  const pollingInterval = useRef(null);

  const handleStartRefinement = async (currentSelectionJobId) => {
    if (!currentSelectionJobId || !project) return;
    try {
      setPhase('refining');
      const projectContext = {
        projectContext: project.reformulation || project.summary || project.description || '',
        keywords: project.keywords,
        key_elements: project.organisation?.key_elements || '',
      };
      const payload = {
        selectionJobId: currentSelectionJobId,
        projectContext: projectContext,
        projectId: project.id,
        organisationId: project.organisation?.id,
      };
      const response = await startRefinementJob(payload);
      if (response.refinementJobId) {
        setRefinementJobId(response.refinementJobId);
      } else {
        throw new Error("N'a pas pu démarrer le job de raffinement.");
      }
    } catch (err) {
      console.error('[ProjectAides] Erreur lors du démarrage du raffinement:', err);
      setError(err.message || 'Une erreur est survenue.');
      setPhase('termine');
    }
  };

  useEffect(() => {
    if (effectRan.current === true && import.meta.env.MODE === 'development') {
      return;
    }
    if (!projectId || !isAuthenticated) return;

    const startInitialJob = async () => {
      try {
        setPhase('recherche');
        setError(null);

        const projectDetails = await getProject(projectId);
        setProject(projectDetails);
        if (!projectDetails) throw new Error("Projet non trouvé.");

        // Si les aides ont déjà été affinées, on les charge simplement
        if (projectDetails.status === 'aides_affinees') {
          setPhase('chargement_resultats');
          const savedAides = await getSavedAides(projectId);
          setJobStatus({ ...jobStatus, results: savedAides, isComplete: true, status: 'refinement_done' });
          setPhase('termine');
          return;
        }
        // Si la sélection a été faite mais pas le raffinement, on lance le raffinement
        if (projectDetails.status === 'aides_elargies') {
          console.log("Le projet a déjà des aides élargies. Lancement automatique du raffinement.");
          const lastJob = await getLastSelectionJob(projectId);
          if (lastJob && lastJob.jobId) {
            setSelectionJobId(lastJob.jobId);
            handleStartRefinement(lastJob.jobId);
            return;
          }
        }

        // Si aucun état précédent n'est trouvé ou si le statut est différent, on lance un nouveau job
        console.log("Lancement d'un nouveau job de sélection.");
        console.log("DEBUG: Valeurs envoyées au backend:", {
          orgType: projectDetails.organisation?.type,
          perimeter: projectDetails.organisation?.perimeter_code
        });
        const projectContext = {
          projectContext: projectDetails.reformulation || projectDetails.summary || projectDetails.description || '',
          keywords: Array.isArray(projectDetails.keywords) ? projectDetails.keywords : JSON.parse(projectDetails.keywords || '[]'),
          key_elements: projectDetails.organisation?.key_elements || '',
          id_categories_aides_territoire: Array.isArray(projectDetails.id_categories_aides_territoire) ? projectDetails.id_categories_aides_territoire : JSON.parse(projectDetails.id_categories_aides_territoire || '[]'),
          organisationType: projectDetails.organisation?.type,
          perimeterCode: projectDetails.organisation?.perimeter_code,
          projectId: projectDetails.id,
        };

        const response = await startSelectionJob(projectContext);
        if (response.jobId) {
          setSelectionJobId(response.jobId);
          // Initialiser le total des aides pour l'affichage immédiat
          setJobStatus(prev => ({ 
            ...prev, 
            progress: { ...prev.progress, total_aides: response.totalAides } 
          }));
          setPhase('traitement');
        } else {
          throw new Error("N'a pas pu démarrer le job de sélection.");
        }
      } catch (err) {
        console.error('[ProjectAides] Erreur initiale:', err);
        setError(err.message || 'Une erreur est survenue.');
        setPhase('termine');
      }
    };

    startInitialJob();
    effectRan.current = true;

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [projectId, isAuthenticated]);

  // Effet pour le polling du statut du job de SÉLECTION
  useEffect(() => {
    if (!selectionJobId || (phase !== 'traitement' && phase !== 'selection_done')) return;

    const pollSelectionStatus = async () => {
      try {
        const status = await getJobStatus(selectionJobId);
        // Fusionner le nouvel état avec l'ancien pour ne pas perdre de clés
        setJobStatus(prev => ({ ...prev, ...status }));

        if (status.isComplete) {
          console.log(`[ProjectAides] Job de sélection ${selectionJobId} terminé. Lancement du raffinement.`);
          clearInterval(pollingInterval.current);
          handleStartRefinement(selectionJobId);
        }
      } catch (error) {
        console.error(`[ProjectAides] Erreur de polling pour le job ${selectionJobId}:`, error);
        setError('Erreur lors de la récupération de l\'état du job de sélection.');
        clearInterval(pollingInterval.current);
        setPhase('termine');
      }
    };

    pollingInterval.current = setInterval(pollSelectionStatus, 3000); // Poll toutes les 3 secondes

    return () => {
      clearInterval(pollingInterval.current);
    };
  }, [selectionJobId, phase]);

  // Effet pour le polling du statut du job de RAFFINEMENT
  useEffect(() => {
    if (!refinementJobId || phase !== 'refining') return;

    const pollRefinementStatus = async () => {
      try {
        // On réutilise le même endpoint de statut
        const status = await getJobStatus(refinementJobId);
        // Fusionner le nouvel état avec l'ancien pour ne pas perdre de clés
        setJobStatus(prev => ({ ...prev, ...status }));

        if (status.isComplete) {
          console.log(`[ProjectAides] Job de raffinement ${refinementJobId} terminé.`);
          clearInterval(pollingInterval.current);
          // Recharger les aides depuis la BDD Supabase pour avoir la version finale
          const savedAides = await getSavedAides(projectId);
          setJobStatus({ ...status, results: savedAides });
          setPhase('termine');
        }
      } catch (error) {
        console.error(`[ProjectAides] Erreur de polling pour le job de raffinement ${refinementJobId}:`, error);
        setError('Erreur lors de la récupération de l\'état du job de raffinement.');
        clearInterval(pollingInterval.current);
        setPhase('termine');
      }
    };

    pollingInterval.current = setInterval(pollRefinementStatus, 3000);

    return () => {
      clearInterval(pollingInterval.current);
    };
  }, [refinementJobId, phase, projectId]);

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
      case 'traitement': {
        const { progress, results } = jobStatus;
        const aidesPertinentes = (results || []).filter(r => r.decision?.trim().toLowerCase() === 'à voir');
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse en cours...</h2>
            <p>{progress.total_aides} aides trouvées au total.</p>
            <p className="font-bold mt-2">
              Progression de l'analyse : {progress.processed_aides} / {progress.total_aides} aides traitées.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(progress.processed_aides / (progress.total_aides || 1)) * 100}%` }}></div>
            </div>
            <p className="text-lg font-medium my-4">{aidesPertinentes.length} aides pertinentes identifiées pour le moment.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aidesPertinentes.map((aide) => <AideCard key={aide.aide_id_ext} aide={{...aide, title: aide.aide_title, url: aide.aide_url}} />)}
            </div>
          </div>
        );
      }
      case 'selection_done':
        return <p>Première sélection terminée. Lancement de l'analyse approfondie...</p>;
      case 'refining': {
        const { progress } = jobStatus;
        const total = progress.total_aides || 1;
        const current = progress.processed_aides || 0;
        const percentage = total > 0 ? (current / total) * 100 : 0;

        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse approfondie en cours...</h2>
            <p>{total} aides pertinentes en cours de traitement.</p>
            <p className="font-bold mt-2">
              Progression : {current} / {total} aides traitées.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
              <div className="bg-genie-purple h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>
        );
      }
      case 'termine': {
        // La phase 'termine' est maintenant uniquement pour les aides raffinées.
        const finalAides = jobStatus.results || [];
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse approfondie terminée</h2>
            <p>{finalAides.length} aides ont été analysées et enregistrées pour votre projet.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {finalAides.map((aide) => (
                <AideCard 
                  key={aide.id} 
                  aide={aide}
                  isRefined={true} 
                />
              ))}
            </div>
          </div>
        );
      }
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
