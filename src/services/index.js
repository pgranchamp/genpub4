/**
 * Point d'entrée pour les services API
 * Exporte toutes les fonctions des différents services
 */

// Exporter les fonctions du client HTTP
export {
  setAuthToken,
  getStoredToken,
  clearAuthToken,
  fetchWithAuth
} from './httpClient';

// Exporter les fonctions d'authentification
export {
  login,
  signup,
  forgotPassword,
  resetPassword,
  getMe
} from './authService';

// Exporter les fonctions de gestion des organisations
export {
  createOrganisation,
  getOrganisations,
  getOrganisation,
  updateOrganisation,
  updateUserOrganisation,
  getMyOrganisation,
  getOrganisationStatus
} from './organisationService';

// Exporter les fonctions de gestion des projets
export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  createProjectFromInvite,
  getProjectAides,
  linkAideToProject,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile,
  updateProjectAnalysisResults
} from './projectService';

// Exporter les fonctions de gestion des aides
export {
  getAidesToken,
  searchAidesTerritoires,
  getBackerInfo,
  enrichAideWithBackerInfo,
  preFilterAides,
  determineMaxAidesForOpenAI,
  getCategoriesList,
  analyserProjetComplet,
  rechercherAidesOptimisees
} from './aidesService';

// Exporter les fonctions OpenAI
export {
  reformulateProjectInstitutional,
  extractProjectKeywords,
  selectAidCategories,
  filterAidesFromAPI,
  // Fonctions dépréciées mais conservées pour compatibilité
  reformulateProjectV2,
  generateKeywords,
  analyserProjetEtAides,
  reformulateProject
} from './openaiService';

// Exporter les fonctions d'onboarding
export * from './onboardingService';

/**
 * Fonction complète d'analyse de projet et recherche d'aides
 * Cette fonction coordonne l'ensemble du processus d'analyse et de recherche d'aides
 * @param {Object} project - Le projet à analyser
 * @returns {Promise<Object>} Les résultats de l'analyse
 * @throws {Error} Si l'analyse échoue
 */
export const analyserProjetEtRechercherAides = async (project) => {
  try {
    // Importer les fonctions nécessaires
    const { analyserProjetEtAides } = await import('./openaiService');
    const { searchAidesTerritoires, preFilterAides, determineMaxAidesForOpenAI } = await import('./aidesService');
    const { filterAidesFromAPI } = await import('./openaiService');
    const { enrichAideWithBackerInfo } = await import('./aidesService');
    
    console.log('Début de l\'analyse complète du projet:', project.id);
    
    // Étape 1: Analyse sémantique via OpenAI
    const analyseResultat = await analyserProjetEtAides(project);
    const projetMisAJour = analyseResultat.projet;
    
    // Étape 2: Utiliser directement les catégories du projet
    const categoriesIds = project.id_categories_aides_territoire || [];
    
    // Mapper le type d'organisation aux valeurs acceptées par l'API
    const mapOrganisationTypeToOrganizationTypeSlugs = (orgType) => {
      switch (orgType?.toLowerCase()) {
        case 'association':
          return ['association'];
        case 'entreprise':
          return ['entreprise'];
        case 'collectivite':
          return ['commune', 'epci', 'departement', 'region'];
        default:
          return ['association']; // Valeur par défaut
      }
    };
    
    // Utiliser le type d'organisation pour déterminer les publics cibles
    const organisationType = project.organisation?.type || 'association';
    const organizationTypeSlugs = mapOrganisationTypeToOrganizationTypeSlugs(organisationType);
    
    // Récupérer la région/département si disponible
    const perimeter = project.organisation?.region || project.organisation?.departement || '';
    
    const aidesReelles = await searchAidesTerritoires({
      category_ids: categoriesIds, // Utiliser le bon paramètre et envoyer comme tableau
      organization_type_slugs: organizationTypeSlugs,
      perimeter: perimeter
    });
    
    // Pré-filtrage algorithmique des aides
    const aidesPreFiltrees = preFilterAides(
      aidesReelles.results || [],
      projetMisAJour.reformulation,
      projetMisAJour.keywords
    );
    
    console.log(`Nombre d'aides après pré-filtrage: ${aidesPreFiltrees.length}`);
    
    // Déterminer le nombre maximum d'aides à envoyer à OpenAI
    const MAX_AIDES_FOR_OPENAI = determineMaxAidesForOpenAI(aidesPreFiltrees);
    
    // Étape 4: Filtrage des aides via OpenAI
    let aidesFiltrees = await filterAidesFromAPI(
      projetMisAJour.reformulation,
      projetMisAJour.keywords,
      aidesPreFiltrees.slice(0, MAX_AIDES_FOR_OPENAI)
    );
    
    // Étape 5: Enrichir les aides avec les informations des financeurs
    console.log('Enrichissement des aides avec les informations des financeurs...');
    const aidesEnrichies = [];
    for (const aide of aidesFiltrees) {
      const aideEnrichie = await enrichAideWithBackerInfo(aide);
      aidesEnrichies.push(aideEnrichie);
    }
    
    // Résultat final
    return {
      projet: projetMisAJour,
      aides: aidesEnrichies
    };
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse complète du projet:', error);
    throw error;
  }
};
