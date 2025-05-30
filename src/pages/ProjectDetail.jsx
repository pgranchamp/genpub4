import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getProject, 
  updateProject, 
  linkAideToProject,
  analyserProjetComplet,
  rechercherAidesOptimisees
} from '../services';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reformulating, setReformulating] = useState(false);
  const [searchingAides, setSearchingAides] = useState(false);
  const [aides, setAides] = useState([]);
  const [selectedAides, setSelectedAides] = useState([]);
  const [savingAides, setSavingAides] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  
  // États pour la gestion des aides
  const [aidesError, setAidesError] = useState('');
  
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
  
  // Pas de chargement de fichiers pour l'instant
  
  // Reformuler le projet avec la nouvelle méthode d'analyse complète
  const handleReformulate = async () => {
    if (!project?.description) return;
    
    setReformulating(true);
    setError('');
    
    try {
      console.log('Analyse complète du projet:', project.id);
      const result = await analyserProjetComplet(project);
      console.log('Résultat de l\'analyse complète:', result);
      
      // Mettre à jour le projet avec les résultats de l'analyse
      console.log('Mise à jour du projet avec les résultats de l\'analyse');
      const updatedProject = await updateProject(project.id, {
        title: result.projet.title,
        reformulation: result.projet.reformulation,
        keywords: JSON.stringify(result.projet.keywords),
        id_categories_aides_territoire: JSON.stringify(result.projet.id_categories_aides_territoire),
        status: 'reformule'
      });
      console.log('Projet mis à jour:', updatedProject);
      
      // Mettre à jour l'état local
      setProject(updatedProject);
      
      // Rechercher automatiquement des aides après l'analyse
      handleSearchAides(updatedProject);
    } catch (err) {
      console.error('Erreur lors de l\'analyse du projet:', err);
      setError('Impossible d\'analyser le projet. Veuillez réessayer plus tard.');
    } finally {
      setReformulating(false);
    }
  };
  
  // Rechercher des aides avec la nouvelle méthode optimisée
  const handleSearchAides = async (projectToUse = null) => {
    // Utiliser le projet passé en paramètre ou le projet actuel
    const currentProject = projectToUse || project;
    
    if (!currentProject?.description) return;
    
    setSearchingAides(true);
    setError('');
    setAidesError('');
    setAides([]);
    
    try {
      console.log('Recherche d\'aides optimisée pour le projet:', currentProject.id);
      
      // Utiliser la nouvelle fonction rechercherAidesOptimisees
      const result = await rechercherAidesOptimisees(currentProject);
      setAides(result.results || []);
      
      if (!result.results || result.results.length === 0) {
        setAidesError('Aucune aide trouvée pour ce projet. Essayez de modifier les mots-clés ou la description.');
      }
      
      // Mettre à jour le statut du projet
      await updateProject(project.id, {
        status: 'aides_recherchees'
      });
      
      // Mettre à jour le projet local
      setProject(prev => ({
        ...prev,
        status: 'aides_recherchees'
      }));
    } catch (err) {
      console.error('Erreur lors de la recherche d\'aides:', err);
      setError('Impossible de rechercher des aides. Veuillez réessayer plus tard.');
    } finally {
      setSearchingAides(false);
    }
  };
  
  // Gérer la sélection d'une aide
  const handleToggleAide = (aide) => {
    setSelectedAides(prev => {
      // Si l'aide n'a pas d'ID, on utilise l'objet complet pour la comparaison
      if (!aide.id) {
        const isSelected = prev.some(a => JSON.stringify(a) === JSON.stringify(aide));
        return isSelected ? prev.filter(a => JSON.stringify(a) !== JSON.stringify(aide)) : [...prev, aide];
      }
      
      // Sinon, on utilise l'ID pour la comparaison
      if (prev.some(a => a.id === aide.id)) {
        return prev.filter(a => a.id !== aide.id);
      } else {
        return [...prev, aide];
      }
    });
  };
  
  // Enregistrer les aides sélectionnées
  const handleSaveAides = async () => {
    if (selectedAides.length === 0) return;
    
    setSavingAides(true);
    setError('');
    
    try {
      console.log('Enregistrement des aides sélectionnées:', selectedAides);
      // Pour chaque aide sélectionnée, créer un lien avec le projet
      for (const aide of selectedAides) {
        // Vérifier si l'aide a un ID
        if (!aide.id) {
          console.warn('Aide sans ID détectée, impossible de l\'enregistrer:', aide);
          continue; // Passer à l'aide suivante
        }
        
        console.log('Association de l\'aide au projet:', aide.id);
        await linkAideToProject(project.id, { aide_id: aide.id });
      }
      
      // Réinitialiser la sélection
      setSelectedAides([]);
      
      // Afficher un message de succès temporaire
      alert('Les aides ont été enregistrées avec succès.');
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement des aides:', err);
      setError('Impossible d\'enregistrer les aides. Veuillez réessayer plus tard.');
    } finally {
      setSavingAides(false);
    }
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
      
      {/* Reformulation (Résumé) */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Résumé</h3>
          {!project.reformulation && (
            <button
              onClick={handleReformulate}
              disabled={reformulating}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-genie-blue hover:bg-genie-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-genie-blue font-inter ${
                reformulating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {reformulating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Reformulation en cours...
                </>
              ) : (
                'Reformuler'
              )}
            </button>
          )}
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6 whitespace-pre-wrap">
            {project.reformulation || 'Cliquez sur "Reformuler" pour générer une version améliorée de votre description de projet.'}
          </div>
        </div>
      </div>
      
      {/* Description du projet (repliable) */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 cursor-pointer" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Description</h3>
            <svg 
              className={`h-5 w-5 text-genie-navy transform ${descriptionExpanded ? 'rotate-180' : ''} transition-transform duration-200`} 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        {descriptionExpanded && (
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6 whitespace-pre-wrap">
              {project.description || 'Aucune description disponible.'}
            </div>
          </div>
        )}
      </div>
      
      {/* Mots-clés */}
      {project.keywords && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Mots-clés thématiques</h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    const keywords = JSON.parse(project.keywords);
                    return keywords.map((keyword, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gradient-genie text-white"
                      >
                        {keyword}
                      </span>
                    ));
                  } catch (e) {
                    console.error('Erreur lors du parsing des mots-clés:', e);
                    return <p className="text-gray-500">Aucun mot-clé disponible.</p>;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Catégories sélectionnées */}
      {project.categories_noms && project.categories_noms.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Catégories d'aides</h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-1">
                {project.categories_noms.map((categorie, index) => (
                  <li key={index} className="text-sm text-gray-700">{categorie}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Recherche d'aides */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-bold text-genie-navy font-inter">Aides disponibles</h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-center mb-4">
              {project.reformulation && (
                <button
                  onClick={handleSearchAides}
                  disabled={searchingAides}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-genie-purple hover:bg-genie-purple/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-genie-purple font-inter ${
                    searchingAides ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {searchingAides ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Recherche en cours...
                    </>
                  ) : (
                    'Chercher des aides'
                  )}
                </button>
              )}
            </div>
            
            {aidesError ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">{aidesError}</p>
                  </div>
                </div>
              </div>
            ) : aides.length === 0 ? (
              <p className="text-gray-500 text-center">
                {project.reformulation
                  ? 'Cliquez sur "Chercher des aides" pour trouver des financements adaptés à votre projet.'
                  : 'Veuillez d\'abord reformuler votre projet pour pouvoir rechercher des aides.'}
              </p>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">{aides.length} aides trouvées</p>
                  <button
                    onClick={handleSaveAides}
                    disabled={selectedAides.length === 0 || savingAides}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-genie-green hover:bg-genie-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-genie-green font-inter ${
                      selectedAides.length === 0 || savingAides ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {savingAides ? 'Enregistrement...' : `Enregistrer (${selectedAides.length})`}
                  </button>
                </div>
                
                <ul className="divide-y divide-gray-200">
                  {aides.map((aide, index) => {
                    // Vérifier si l'aide a un titre/nom
                    const aideName = aide.name || aide.titre || `Aide ${index + 1}`;
                    // Vérifier si l'aide a une description
                    const aideDescription = aide.description || aide.justification || '';
                    // Vérifier si l'aide a une URL
                    const aideUrl = aide.url || '';
                    
                    return (
                      <li key={aide.id || `aide-${index}`} className="py-4">
                        <div className="flex items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{aideName}</p>
                            <p className="text-sm text-gray-500 mt-1">{aideDescription.substring(0, 150)}...</p>
                            <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                              {/* Afficher le financeur s'il est disponible */}
                              {(aide.financeur || aide.backer) && (
                                <p className="mr-4 mb-1">
                                  <span className="font-medium">Financeur:</span> {aide.financeur || aide.backer}
                                </p>
                              )}
                              
                              {aide.application_deadline && (
                                <p className="mr-4 mb-1">
                                  <span className="font-medium">Date limite:</span> {new Date(aide.application_deadline).toLocaleDateString()}
                                </p>
                              )}
                              
                              {aide.pertinence && (
                                <p className="mr-4 mb-1">
                                  <span className="font-medium">Pertinence:</span> <span className={`font-medium ${
                                    aide.pertinence === 'forte' ? 'text-green-600' : 
                                    aide.pertinence === 'moyenne' ? 'text-yellow-600' : 
                                    'text-red-600'
                                  }`}>{aide.pertinence}</span>
                                </p>
                              )}
                              
                              {aideUrl && (
                                <a
                                  href={aideUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-genie-blue hover:text-genie-blue/80 mb-1"
                                >
                                  Voir le détail
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <input
                              id={`aide-${aide.id || index}`}
                              name={`aide-${aide.id || index}`}
                              type="checkbox"
                              checked={aide.id 
                                ? selectedAides.some(a => a.id === aide.id)
                                : selectedAides.some(a => JSON.stringify(a) === JSON.stringify(aide))}
                              onChange={() => handleToggleAide(aide)}
                              className="h-4 w-4 text-genie-purple focus:ring-genie-purple border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bouton Retour à la liste en bas de page */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-gradient-genie hover:opacity-90 font-inter"
        >
          Retour à la liste
        </button>
      </div>
    </div>
  );
};

export default ProjectDetail;
