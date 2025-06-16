/**
 * Service de gestion des aides
 * Gère les opérations liées aux aides et à l'API Aides Territoires
 */

import { fetchWithAuth } from './httpClient'; // API_BASE_URL n'est plus nécessaire ici
import { 
  reformulateProjectInstitutional, 
  extractProjectKeywords, 
  selectAidCategories 
} from './openaiService';

// URL de base de l'API Aides Territoires
const AIDES_TERRITOIRES_API_BASE = 'https://aides-territoires.beta.gouv.fr/api';
const AIDES_TERRITOIRES_API = `${AIDES_TERRITOIRES_API_BASE}/aids/`;
const AIDES_TERRITOIRES_AUTH_API = `${AIDES_TERRITOIRES_API_BASE}/connexion/`;

// Variable pour stocker le token JWT d'Aides Territoires (valide 24h)
let aidesToken = null;
let aidesTokenExpiry = null;

/**
 * Obtient un token JWT valide pour l'API Aides Territoires
 * @returns {Promise<string>} Le token JWT
 * @throws {Error} Si l'obtention du token échoue
 */
export const getAidesToken = async () => {
  // Si on a déjà un token valide, on le retourne
  const now = new Date();
  if (aidesToken && aidesTokenExpiry && aidesTokenExpiry > now) {
    return aidesToken;
  }
  
  try {
    console.log('Obtention d\'un nouveau token Aides Territoires via proxy');
    const response = await fetchWithAuth(`/api/proxy/aides-territoires/token`, { // Chemin relatif
      method: 'POST'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Erreur inconnue');
    }
    
    const data = response.data;
    aidesToken = data.token;
    
    // Le token est valide pendant 24h, on le garde 23h pour être sûr
    aidesTokenExpiry = new Date();
    aidesTokenExpiry.setHours(aidesTokenExpiry.getHours() + 23);
    
    return aidesToken;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token Aides Territoires:', error);
    throw error;
  }
};

/**
 * Recherche des aides dans l'API Aides Territoires
 * @param {Object} params - Les paramètres de recherche
 * @returns {Promise<Object>} Un objet contenant `count` (total d'aides correspondantes) et `results` (tableau agrégé des aides)
 * @throws {Error} Si la recherche échoue
 */
export const searchAidesTerritoires = async (params = {}) => {
  console.log('[searchAidesTerritoires] Début de la recherche avec params:', JSON.stringify(params));
  const MAX_TOTAL_RESULTS_TO_FETCH = 300; // Seuil pour éviter trop d'appels
  let allResults = [];
  let totalCount = 0;
  let nextPageUrl = null;

  // Construire la query string initiale
  const initialQueryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (key === 'perimeter_codes' && Array.isArray(value)) {
      value.forEach(v => initialQueryParams.append('perimeter_codes[]', v));
    } else if (key === 'organization_type_slugs' && Array.isArray(value)) {
      value.forEach(v => initialQueryParams.append('organization_type_slugs[]', v));
    } else if (Array.isArray(value)) {
      value.forEach(v => initialQueryParams.append(key, v));
    } else if (value !== undefined && value !== null) {
      initialQueryParams.append(key, value);
    }
  });

  let currentPath = `/api/proxy/aides-territoires/aids?${initialQueryParams.toString()}`;
  console.log(`[searchAidesTerritoires] Appel initial au proxy: ${currentPath}`);

  try {
    let pageCount = 0;
    do {
      pageCount++;
      console.log(`[searchAidesTerritoires] Récupération page ${pageCount}, URL: ${currentPath}`);
      const response = await fetchWithAuth(currentPath);

      if (!response.success) {
        console.error('[searchAidesTerritoires] Erreur réponse proxy:', response);
        throw new Error(response.error || 'Erreur inconnue du proxy');
      }
      
      const pageData = response.data;
      if (!pageData || !pageData.results) {
        console.error('[searchAidesTerritoires] Données de page invalides:', pageData);
        throw new Error('Format de réponse Aides Territoires invalide.');
      }

      if (pageCount === 1) {
        totalCount = pageData.count || 0;
        console.log(`[searchAidesTerritoires] Total d'aides annoncé par l'API: ${totalCount}`);
      }

      allResults = allResults.concat(pageData.results);
      console.log(`[searchAidesTerritoires] ${pageData.results.length} aides récupérées sur cette page. Total cumulé: ${allResults.length}`);

      // Préparer pour la page suivante
      if (pageData.next && allResults.length < MAX_TOTAL_RESULTS_TO_FETCH) {
        const nextApiUrl = new URL(pageData.next);
        const nextPageNumber = nextApiUrl.searchParams.get('page');

        if (nextPageNumber) {
          // Reconstruire l'URL pour le proxy en conservant les paramètres initiaux et en ajoutant la nouvelle page
          const preservedQueryParams = new URLSearchParams(initialQueryParams); // Utiliser les paramètres initiaux
          preservedQueryParams.set('page', nextPageNumber); // Mettre à jour ou ajouter le numéro de page
          nextPageUrl = `/api/proxy/aides-territoires/aids?${preservedQueryParams.toString()}`;
          console.log(`[searchAidesTerritoires] URL page suivante (proxy reconstruite): ${nextPageUrl}`);
        } else {
          // Si l'URL 'next' de l'API ne contient pas de paramètre 'page', c'est inattendu.
          // On arrête la pagination pour éviter une boucle infinie ou des erreurs.
          console.warn('[searchAidesTerritoires] L\'URL "next" de l\'API ne contient pas de numéro de page. Arrêt de la pagination.');
          nextPageUrl = null;
        }
      } else {
        nextPageUrl = null; // Pas de page suivante ou seuil atteint
        if (allResults.length >= MAX_TOTAL_RESULTS_TO_FETCH) {
          console.log(`[searchAidesTerritoires] Seuil de ${MAX_TOTAL_RESULTS_TO_FETCH} aides atteint. Arrêt de la pagination.`);
        }
      }
      currentPath = nextPageUrl;

    } while (nextPageUrl);

    console.log(`[searchAidesTerritoires] Recherche terminée. Total récupéré: ${allResults.length} aides sur ${totalCount} annoncées.`);
    return { count: totalCount, results: allResults };

  } catch (error) {
    console.error('[searchAidesTerritoires] Erreur majeure lors de la recherche paginée:', error);
    throw error;
  }
};

/**
 * Récupère les informations d'un financeur
 * @param {string|number} backerId - L'ID du financeur
 * @returns {Promise<Object|null>} Les informations du financeur ou null en cas d'erreur
 */
export const getBackerInfo = async (backerId) => {
  try {
    console.log(`Récupération des informations du financeur ${backerId}`);
    const response = await fetchWithAuth(`/api/proxy/aides-territoires/backers/${backerId}`); // Chemin relatif
    
    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération du financeur');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du financeur ${backerId}:`, error);
    return null;
  }
};

/**
 * Enrichit une aide avec les informations du financeur
 * @param {Object} aide - L'aide à enrichir
 * @returns {Promise<Object>} L'aide enrichie
 */
export const enrichAideWithBackerInfo = async (aide) => {
  try {
    // Si l'aide a déjà un financeur, on ne fait rien
    if (aide.financeur) {
      return aide;
    }
    
    // Si l'aide a un ID de financeur
    if (aide.aid_financers) {
      let financeurId = aide.aid_financers;
      
      // Si c'est un tableau, on prend le premier
      if (Array.isArray(financeurId) && financeurId.length > 0) {
        financeurId = financeurId[0];
      }
      
      // Récupérer les informations du financeur
      if (financeurId) {
        const financeur = await getBackerInfo(financeurId);
        if (financeur) {
          return {
            ...aide,
            financeur: financeur.name,
            financeur_id: financeurId,
            financeur_slug: financeur.slug
          };
        }
      }
    }
    
    // Si on n'a pas pu récupérer le financeur, on retourne l'aide telle quelle
    return aide;
  } catch (error) {
    console.error('Erreur lors de l\'enrichissement de l\'aide avec les informations du financeur:', error);
    return aide;
  }
};

// Le mapping statique des groupes aux sous-catégories et la fonction getSousCategoriesFromGroupes
// ont été supprimés car ils ne sont plus nécessaires dans la nouvelle architecture

/**
 * Pré-filtre les aides en fonction de leur pertinence
 * @param {Array<Object>} aides - Les aides à filtrer
 * @param {string} reformulation - La reformulation du projet
 * @param {Array<string>|string} keywords - Les mots-clés
 * @returns {Array<Object>} Les aides filtrées
 */
export const preFilterAides = (aides, reformulation, keywords) => {
  // Convertir les mots-clés en tableau si nécessaire
  const keywordsArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
  
  // Extraire les mots significatifs de la reformulation (ignorer les mots vides)
  const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'de', 'du', 'au', 'aux', 'ce', 'ces', 'cette', 'pour', 'par', 'dans', 'sur', 'avec'];
  const reformulationWords = reformulation
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Fonction pour calculer un score de pertinence amélioré
  const calculateRelevanceScore = (aide) => {
    let score = 0;
    const title = (aide.name || '').toLowerCase();
    const description = (aide.description || '').toLowerCase();
    
    // 1. Points pour les mots-clés exacts dans le titre (forte pondération)
    keywordsArray.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (title.includes(keywordLower)) {
        score += 25; // Forte pondération pour les mots-clés dans le titre
      }
    });
    
    // 2. Points pour les mots-clés dans la description
    keywordsArray.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (description.includes(keywordLower)) {
        score += 15;
      }
    });
    
    // 3. Points pour les mots significatifs de la reformulation dans le titre
    reformulationWords.forEach(word => {
      if (title.includes(word)) {
        score += 5;
      }
    });
    
    // 4. Points pour les mots significatifs de la reformulation dans la description
    reformulationWords.forEach(word => {
      if (description.includes(word)) {
        score += 2;
      }
    });
    
    // 5. Bonus pour les correspondances de phrases entières
    keywordsArray.forEach(keyword => {
      if (keyword.length > 10) { // Seulement pour les phrases plus longues
        const keywordLower = keyword.toLowerCase();
        // Utiliser une correspondance approximative
        if (title.includes(keywordLower.substring(0, Math.floor(keywordLower.length * 0.7)))) {
          score += 10;
        }
        if (description.includes(keywordLower.substring(0, Math.floor(keywordLower.length * 0.7)))) {
          score += 5;
        }
      }
    });
    
    // 6. Pénalité pour les aides très courtes (potentiellement moins informatives)
    if (description.length < 100) {
      score -= 10;
    }
    
    return score;
  };
  
  // Calculer le score pour chaque aide
  const scoredAides = aides.map(aide => ({
    ...aide,
    relevanceScore: calculateRelevanceScore(aide)
  }));
  
  // Trier par score de pertinence
  const sortedAides = scoredAides.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Filtrer les aides avec un score minimum
  // Le seuil est défini dynamiquement comme un pourcentage du score maximum
  const maxScore = sortedAides.length > 0 ? sortedAides[0].relevanceScore : 0;
  const threshold = Math.max(10, maxScore * 0.3); // Au moins 30% du score max ou 10 points
  
  return sortedAides.filter(aide => aide.relevanceScore >= threshold);
};

/**
 * Détermine le nombre maximum d'aides à envoyer à OpenAI
 * @param {Array<Object>} aides - Les aides
 * @returns {number} Le nombre maximum d'aides
 */
export const determineMaxAidesForOpenAI = (aides) => {
  // Estimer la taille moyenne d'une aide en tokens
  const estimatedTokensPerAide = 150; // Estimation approximative
  
  // Calculer combien d'aides peuvent tenir dans le contexte
  // En gardant une marge pour le prompt et la réponse
  const maxTokens = 14000; // Pour gpt-3.5-turbo-16k, en gardant une marge
  const availableTokens = maxTokens - 1000; // Réserver 1000 tokens pour le prompt et autres
  
  const maxAides = Math.floor(availableTokens / estimatedTokensPerAide);
  
  // Limiter entre 20 et 100 aides
  return Math.min(100, Math.max(20, Math.min(maxAides, aides.length)));
};

/**
 * Récupère la liste des catégories d'aides depuis l'API
 * @returns {Promise<Array<Object>>} La liste des catégories
 * @throws {Error} Si la récupération échoue
 */
export const getCategoriesList = async () => {
  try {
    console.log('Récupération des catégories d\'aides depuis l\'API');
    
    // Utiliser fetchWithAuth pour appeler l'API backend
    const response = await fetchWithAuth(`/api/categories/aides-territoire`); // Chemin relatif
    
    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération des catégories');
    }
    
    console.log(`${response.data.length} catégories récupérées`);
    return response.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    throw error;
  }
};

/**
 * Analyse complète d'un projet
 * @param {Object} project - Le projet à analyser
 * @returns {Promise<Object>} Les résultats de l'analyse
 * @throws {Error} Si l'analyse échoue
 */
export const analyserProjetComplet = async (project) => {
  try {
    console.log('Début de l\'analyse complète du projet:', project.id);
    
    // 1. Reformulation professionnelle
    console.log('Étape 1: Reformulation professionnelle du projet');
    const reformulation = await reformulateProjectInstitutional(project.description);
    console.log('Reformulation terminée:', reformulation.title);
    
    // 2. Extraction des mots-clés
    console.log('Étape 2: Extraction des mots-clés spécifiques');
    const keywords = await extractProjectKeywords(project.description);
    console.log('Mots-clés extraits:', keywords);
    
    // 3. Récupération des catégories disponibles
    console.log('Étape 3: Récupération des catégories disponibles');
    const categoriesList = await getCategoriesList();
    console.log(`${categoriesList.length} catégories récupérées`);
    
    // 4. Sélection des catégories pertinentes
    console.log('Étape 4: Sélection des catégories pertinentes');
    const selectedCategories = await selectAidCategories(
      project.description, 
      reformulation.reformulation, 
      keywords, 
      categoriesList
    );
    console.log('Catégories sélectionnées:', selectedCategories);
    
    // 5. Mise à jour du projet
    const projetMisAJour = {
      ...project,
      title: reformulation.title,
      reformulation: reformulation.reformulation,
      keywords: keywords,
      id_categories_aides_territoire: selectedCategories
    };
    
    console.log('Analyse complète terminée avec succès');
    return {
      projet: projetMisAJour,
      categories: selectedCategories
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse complète du projet:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Recherche d'aides optimisée basée sur les catégories
 * @param {Object} project - Le projet avec ses catégories
 * @returns {Promise<Object>} Les aides trouvées
 * @throws {Error} Si la recherche échoue
 */
export const searchAndFilterAides = async (projectContext) => {
  try {
    console.log('[aidesService] Appel de search-and-filter avec le contexte:', projectContext);
    const response = await fetchWithAuth(`/api/aides/search-and-filter`, {
      method: 'POST',
      body: JSON.stringify(projectContext)
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la recherche et du filtrage des aides via le backend:', error);
    throw error;
  }
};

/**
 * Se connecte au backend pour recevoir un flux d'aides raffinées via SSE.
 * @param {object} projectContext - Le contexte du projet à envoyer.
 * @param {function} onData - Callback exécuté pour chaque aide reçue.
 * @param {function} onError - Callback exécuté en cas d'erreur.
 * @param {function} onEnd - Callback exécuté à la fin du flux.
 * @returns {function} Une fonction pour annuler la connexion.
 */
import { fetchEventSource } from '@microsoft/fetch-event-source';

export const refineAndStreamAides = (projectContext, token, onData, onError, onEnd) => {
  const ctrl = new AbortController();

  if (!token) {
    onError(new Error("Le token d'authentification est manquant."));
    return () => {}; // Retourne une fonction vide
  }

  fetchEventSource(`/api/aides/refine-and-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(projectContext),
    signal: ctrl.signal,
    
    onmessage(ev) {
      if (ev.event === 'end') {
        console.log('[refineAndStreamAides] Fin du flux reçue.');
        onEnd();
        ctrl.abort(); // Termine la connexion proprement
      } else if (ev.event === 'error') {
        console.error('[refineAndStreamAides] Erreur de flux reçue:', ev.data);
        onError(JSON.parse(ev.data));
      } else {
        // C'est un message de donnée standard
        onData(JSON.parse(ev.data));
      }
    },
    
    onclose() {
      console.log('[refineAndStreamAides] La connexion a été fermée par le serveur.');
      // Ne pas appeler onEnd() ici, car l'événement 'end' le gère déjà.
    },

    onerror(err) {
      console.error('[refineAndStreamAides] Erreur de connexion fatale:', err);
      onError(err);
      ctrl.abort(); // S'assurer que tout est arrêté
      // Il est important de ne pas relancer l'erreur ici pour éviter que la librairie ne tente de se reconnecter indéfiniment.
    }
  });

  // Retourne une fonction pour permettre au composant d'annuler le fetch si nécessaire (ex: unmount)
  return () => {
    console.log('[refineAndStreamAides] Annulation de la connexion SSE demandée.');
    ctrl.abort();
  };
};

/**
 * Récupère les aides déjà enregistrées pour un projet.
 * @param {string} projectId - L'ID du projet.
 * @returns {Promise<Array<Object>>} La liste des aides enregistrées.
 */
export const getSavedAides = async (projectId) => {
  try {
    console.log(`[aidesService] Récupération des aides enregistrées pour le projet ${projectId}`);
    const response = await fetchWithAuth(`/api/projects/${projectId}/aides`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des aides enregistrées pour le projet ${projectId}:`, error);
    throw error;
  }
};

export const rechercherAidesOptimisees = async (project) => {
  try {
    console.log('Début de la recherche d\'aides optimisée pour le projet:', project.id);
    
    // Vérifier si le projet a des catégories
    if (!project.id_categories_aides_territoire) {
      console.error('Le projet n\'a pas de catégories définies');
      throw new Error('Le projet n\'a pas de catégories définies');
    }
    
    // Récupérer les IDs des sous-catégories
    let categoriesIds = [];
    try {
      categoriesIds = typeof project.id_categories_aides_territoire === 'string'
        ? JSON.parse(project.id_categories_aides_territoire)
        : project.id_categories_aides_territoire;
      
      console.log('IDs des catégories du projet:', categoriesIds);
      
      // Récupérer les noms des catégories pour les logs
      try {
        // Récupérer la liste complète des catégories
        const categoriesList = await getCategoriesList();
        
        // Créer un mapping des IDs vers les noms des catégories
        const categories = [];
        categoriesList.forEach(groupe => {
          if (groupe.categories && Array.isArray(groupe.categories)) {
            groupe.categories.forEach(cat => {
              categories.push({
                id: cat.id,
                nom: cat.categorie
              });
            });
          }
        });
        
        // Trouver les noms correspondant aux IDs
        const categoriesNoms = categoriesIds.map(id => {
          const categorie = categories.find(cat => cat.id === id);
          return categorie 
            ? categorie.nom
            : `ID inconnu: ${id}`;
        });
        
        console.log('Catégories sélectionnées:', categoriesNoms);
        
        // Stocker les noms des catégories dans le projet pour affichage ultérieur
        project.categories_noms = categoriesNoms;
      } catch (error) {
        console.warn('Impossible de récupérer les noms des catégories:', error);
      }
    } catch (e) {
      console.error('Erreur lors du parsing des IDs de sous-catégories:', e);
      throw e;
    }
    
    // Mapper le type d'organisation aux valeurs acceptées par l'API
    const mapOrganisationTypeToOrganizationTypeSlugs = (orgType) => {
      const lowerOrgType = orgType?.toLowerCase();
      switch (lowerOrgType) {
        case 'association':
          return ['association'];
        case 'entreprise': 
        case 'entreprise_privee': // Votre type de base
          return ['private-sector']; // Slug Aides Territoires pour "Entreprise privée"
        case 'commune':
          return ['commune'];
        case 'epci': 
          return ['epci']; // Établissement public de coopération intercommunale
        case 'departement':
          return ['department'];
        case 'region':
          return ['region'];
        case 'collectivite_outre_mer': 
          return ['public-org']; // Corrigé: Établissement public dont services de l'état
        case 'etablissement_public_etat': 
          return ['public-org']; 
        case 'entreprise_publique_locale': 
          return ['public-cies']; // Corrigé: Entreprises publique locale
        case 'particulier':
          return ['private-person'];
        case 'agriculteur': 
          return ['farmer']; // Ajout du slug pour agriculteur
        default:
          console.warn(`Type d'organisation non mappé explicitement: ${orgType}. Aucun filtre organization_type_slugs ne sera appliqué.`);
          return []; 
      }
    };
    
    // Utiliser le type d'organisation pour déterminer les publics cibles
    const organisationType = project.organisation?.type || 'association';
    const organizationTypeSlugs = mapOrganisationTypeToOrganizationTypeSlugs(organisationType);
    console.log('Types d\'organisation pour la recherche:', organizationTypeSlugs);
    
    // Récupérer le perimeter_code (code INSEE) stocké pour l'organisation
    // Ce champ doit être populé par la logique de la Phase 2 (ou manuellement pour l'instant)
    let perimeterCode = project.organisation?.perimeter_code || 
                        project.perimeter_code || 
                        project.organization?.perimeter_code || 
                        project.perimeterCode || 
                        project.organisation?.perimeterCode || 
                        ''; 
    if (!perimeterCode) {
      console.warn('Aucun perimeter_code (code INSEE) trouvé pour l\'organisation (vérifié project.organisation.perimeter_code, project.perimeter_code, etc.). La recherche géographique pourrait être imprécise.');
    }
    console.log('Code INSEE du périmètre pour la recherche:', perimeterCode || 'Non spécifié');
    
    // Construire les paramètres de recherche
    // 'project' est l'objet reçu par rechercherAidesOptimisees.
    // Il peut contenir une propriété 'itemsPerPage' si elle a été ajoutée par la page de test,
    // ou nous utilisons une valeur par défaut ou omettons le paramètre 'limit'.
    
    const searchParams = {
      category_ids: categoriesIds,
      order_by: project.order_by || 'relevance', // Utiliser l'ordre de tri du projet ou pertinence par défaut
    };

    if (organizationTypeSlugs && organizationTypeSlugs.length > 0) {
      searchParams.organization_type_slugs = organizationTypeSlugs;
    }

    // Gestion de itemsPerPage (qui deviendra 'limit')
    // Si project.itemsPerPage est fourni et > 0, on l'utilise. Sinon, pas de 'limit'.
    // Une valeur de 0 ou absente pour project.itemsPerPage signifie "pas de limite de notre part".
    if (project.itemsPerPage && parseInt(project.itemsPerPage, 10) > 0) {
      searchParams.limit = parseInt(project.itemsPerPage, 10);
    }
    // Si itemsPerPage n'est pas fourni dans project ou est <= 0, le paramètre 'limit' n'est pas ajouté,
    // l'API Aides Territoires utilisera sa propre pagination par défaut.

    // Utiliser perimeter_codes[] comme convenu, si perimeterCode est valide
    if (perimeterCode && typeof perimeterCode === 'string' && perimeterCode.trim() !== '') {
      searchParams.perimeter_codes = [perimeterCode.trim()]; 
    }
    
    console.log('Paramètres de recherche construits pour searchAidesTerritoires:', searchParams);
    
    // Appel à l'API Aides Territoires
    console.log('Appel à l\'API Aides Territoires');
    const result = await searchAidesTerritoires(searchParams);
    console.log(`${result.results?.length || 0} aides trouvées`);
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la recherche d\'aides optimisée:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
    throw error;
  }
};
