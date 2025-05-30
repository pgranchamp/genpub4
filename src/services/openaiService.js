/**
 * Service OpenAI
 * Gère les opérations liées à l'API OpenAI pour l'analyse de texte
 */

// URL de l'API OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Récupérer la clé API depuis les variables d'environnement
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Fonction générique pour les appels à l'API OpenAI
 * @param {Array<Object>} messages - Les messages à envoyer
 * @param {string} model - Le modèle à utiliser
 * @param {number} temperature - La température (créativité)
 * @returns {Promise<Object>} La réponse de l'API
 * @throws {Error} Si l'appel échoue
 */
const callOpenAI = async (messages, model = "gpt-3.5-turbo", temperature = 0.7) => {
  console.log(`Appel à OpenAI avec le modèle ${model}`);
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'appel à OpenAI:', error);
    throw error;
  }
};

/**
 * Reformulation professionnelle du projet
 * @param {string} projectDescription - La description du projet
 * @returns {Promise<Object>} La reformulation professionnelle
 * @throws {Error} Si la reformulation échoue
 */
export const reformulateProjectInstitutional = async (projectDescription) => {
  console.log('Début de la reformulation professionnelle');
  console.log(`Longueur de la description: ${projectDescription.length} caractères`);
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en rédaction de projets institutionnels. 
        Analyse la description du projet fournie et reformule-la dans un style professionnel, 
        clair et orienté demande de financement. Ton objectif est de produire un texte qui 
        pourrait être lu par un agent ou un financeur potentiel.
        
        Réponds avec un objet JSON contenant :
        {
          "title": "Titre concis et accrocheur pour le projet",
          "reformulation": "Texte reformulé de manière professionnelle"
        }`
      },
      {
        role: "user",
        content: projectDescription
      }
    ];

    const data = await callOpenAI(messages, "gpt-4-turbo", 0.7);
    
    // Extraire et parser la réponse JSON
    try {
      const content = data.choices[0].message.content;
      console.log('Réponse brute de reformulation:', content.substring(0, 100) + '...');
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonString);
      
      console.log('Reformulation réussie:', result.title);
      return result;
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      return {
        title: "Titre non disponible",
        reformulation: data.choices[0].message.content
      };
    }
  } catch (error) {
    console.error('Erreur lors de la reformulation du projet:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Extraction de mots-clés spécifiques du projet
 * @param {string} projectDescription - La description du projet
 * @returns {Promise<Array<string>>} Les mots-clés extraits
 * @throws {Error} Si l'extraction échoue
 */
export const extractProjectKeywords = async (projectDescription) => {
  console.log('Début de l\'extraction des mots-clés');
  console.log(`Longueur de la description: ${projectDescription.length} caractères`);
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en accompagnement de projets sociaux et numériques.

Voici un projet :
---
${projectDescription}
---

Extrais exactement 8 mots-clés ou expressions courtes (2 à 5 mots) qui décrivent :
- les publics visés
- les actions proposées
- les méthodes employées
- les objectifs du projet

Les mots-clés doivent être spécifiques, utiles pour chercher des aides, sans redondance.

Format :
[
  "mot-clé 1",
  "mot-clé 2",
  ...
]`
      }
    ];

    const data = await callOpenAI(messages, "gpt-4-turbo", 0.7);
    
    // Extraire et parser la réponse JSON
    try {
      const content = data.choices[0].message.content;
      console.log('Réponse brute d\'extraction de mots-clés:', content.substring(0, 100) + '...');
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const keywords = JSON.parse(jsonString);
      
      console.log('Mots-clés extraits:', keywords);
      return keywords;
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      // Fallback: extraire les mots-clés du texte
      const content = data.choices[0].message.content;
      const lines = content.split('\n').filter(line => line.trim().startsWith('"') || line.trim().startsWith('-'));
      const keywords = lines.map(line => line.replace(/^["-\s]+|[",\s]+$/g, '')).filter(kw => kw);
      
      console.log('Mots-clés extraits (fallback):', keywords);
      return keywords;
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des mots-clés:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Sélection des catégories d'aides pertinentes
 * @param {string} projectDescription - La description du projet
 * @param {string} reformulation - La reformulation professionnelle du projet
 * @param {Array<string>} keywords - Les mots-clés extraits du projet
 * @param {Array<Object>} categoriesList - La liste des catégories disponibles
 * @returns {Promise<Array<number>>} Les IDs des catégories sélectionnées
 * @throws {Error} Si la sélection échoue
 */
export const selectAidCategories = async (projectDescription, reformulation, keywords, categoriesList) => {
  console.log('Début de la sélection des catégories d\'aides');
  console.log(`Nombre de groupes disponibles: ${categoriesList.length}`);
  
  try {
    // Préparer les catégories pour le prompt
    const categories = [];
    categoriesList.forEach(groupe => {
      // Vérifier si le groupe a des catégories
      if (groupe.categories && Array.isArray(groupe.categories)) {
        groupe.categories.forEach(cat => {
          categories.push({
            id: cat.id,
            nom: cat.categorie
          });
        });
      }
    });
    
    console.log(`Nombre de catégories disponibles: ${categories.length}`);
    
    // Formater les catégories pour le prompt
    const categoriesFormatted = categories.map(cat => 
      `${cat.id}: ${cat.nom}`
    );
    
    // Utiliser la reformulation si disponible, sinon la description originale
    const descriptionToUse = reformulation || projectDescription;
    
    // Formater les mots-clés pour le prompt
    const keywordsFormatted = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en financement public et en recherche d'aides sur la plateforme Aides-Territoires.

À partir de la description d'un projet et des mots-clés associés, tu dois sélectionner les catégories d'aides les plus pertinentes pour identifier des financements adaptés.

Voici la description du projet :
---
${descriptionToUse}
---

Voici les mots-clés associés à ce projet :
${keywordsFormatted}

Voici la liste complète des catégories disponibles, avec leur identifiant (format : ID: Nom) :
${categoriesFormatted.join('\n')}

Ta mission :
- Analyse attentivement la description du projet et les mots-clés.
- Sélectionne entre 3 et 7 catégories **les plus pertinentes** parmi la liste fournie. Une catégorie est pertinente si son intitulé ou sa thématique est **directement et fortement lié** à un ou plusieurs aspects clés du projet (objectifs, actions, public cible).
- Ne choisis une catégorie **que si elle peut raisonnablement correspondre à un type de dispositif de financement pertinent pour ce projet spécifique**. Évite les catégories trop génériques si des options plus ciblées et adéquates existent.
- Classe les IDs des catégories sélectionnées **par ordre de pertinence décroissante**, la plus pertinente en premier.

Réponds uniquement avec un tableau JSON des IDs des catégories sélectionnées, classées par pertinence.
Exemple de format attendu (IDs classés) : [104, 113, 107, 120, 118]`
      }
    ];

    const data = await callOpenAI(messages, "gpt-4-turbo", 0.5); // Modèle changé et température légèrement baissée pour plus de focus
    
    // Extraire et parser la réponse JSON
    try {
      const content = data.choices[0].message.content;
      console.log('Réponse brute de sélection des catégories:', content.substring(0, 100) + '...');
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const selectedCategoryIds = JSON.parse(jsonString);
      
      // Vérifier que les IDs sélectionnés existent bien dans la liste
      const validCategoryIds = selectedCategoryIds.filter(id => 
        categories.some(cat => cat.id === id)
      );
      
      console.log('IDs des catégories sélectionnées:', validCategoryIds);
      return validCategoryIds;
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      // Fallback: extraire les IDs du texte
      const content = data.choices[0].message.content;
      const idMatches = content.match(/\d+/g) || [];
      const validCategoryIds = idMatches
        .map(id => parseInt(id, 10))
        .filter(id => categories.some(cat => cat.id === id));
      
      console.log('IDs des catégories sélectionnées (fallback):', validCategoryIds);
      return validCategoryIds;
    }
  } catch (error) {
    console.error('Erreur lors de la sélection des sous-catégories:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Analyse sémantique d'un projet (ancienne version)
 * @param {string} projectDescription - La description du projet
 * @returns {Promise<Object>} Les résultats de l'analyse
 * @throws {Error} Si l'analyse échoue
 */
export const reformulateProjectV2 = async (projectDescription) => {
  console.warn('La fonction reformulateProjectV2 est dépréciée. Utilisez les nouvelles fonctions spécialisées.');
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en financement public. À partir de la description suivante, reformule professionnellement le projet pour une lecture institutionnelle, puis identifie les groupes thématiques d'aides publiques les plus pertinents et propose des mots-clés de recherche.

Voici la liste des groupes disponibles :
- Culture et identité collective / patrimoine / sports
- Développement économique / production et consommation
- Eau et milieux aquatiques
- Énergies / Déchets
- Fonctions support
- Mobilité / transports
- Nature / environnement
- Solidarités / lien social
- Urbanisme / logement / aménagement

Description brute du projet :
${projectDescription}

Réponds avec un objet JSON :
{
  "title": "Titre du projet",
  "reformulation": "Texte professionnel et clair",
  "keywords": ["mot-clé1", "mot-clé2", ...],
  "groupes_pertinents": ["Groupe1", "Groupe2", ...]
}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    // Extraire et parser la réponse JSON
    let parsedResponse;
    try {
      const content = data.choices[0].message.content;
      // Extraire le JSON si la réponse contient du texte avant ou après
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      // Fallback si le parsing échoue
      return {
        title: "Titre non disponible",
        reformulation: data.choices[0].message.content,
        keywords: [],
        groupes_pertinents: []
      };
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Erreur lors de l\'analyse sémantique:', error);
    throw error;
  }
};

/**
 * Filtre les aides en fonction de leur pertinence pour un projet
 * @param {string} reformulation - La reformulation du projet
 * @param {Array<string>|string} keywords - Les mots-clés du projet
 * @param {Array<Object>} aides - Les aides à filtrer
 * @returns {Promise<Array<Object>>} Les aides filtrées
 * @throws {Error} Si le filtrage échoue
 */
export const filterAidesFromAPI = async (reformulation, keywords, aides) => {
  try {
    // Vérifier et logger les IDs des aides
    console.log('Vérification des IDs des aides avant filtrage:');
    aides.slice(0, 10).forEach((aide, index) => {
      console.log(`Aide #${index} - ID: ${aide.id || 'MANQUANT'}, Nom: ${aide.name || 'Non défini'}`);
    });
    
    // Compter les aides sans ID
    const aidesWithoutId = aides.filter(aide => !aide.id).length;
    if (aidesWithoutId > 0) {
      console.warn(`ATTENTION - ${aidesWithoutId} aides n'ont pas d'ID sur un total de ${aides.length}`);
    } else {
      console.log(`Toutes les aides (${aides.length}) ont un ID valide`);
    }
    
    // Limiter le nombre d'aides pour éviter de dépasser la limite de tokens
    const MAX_AIDES = 20;
    const aidesToProcess = aides.slice(0, MAX_AIDES);
    
    // Préparation des données d'aides pour le prompt - version simplifiée
    const aidesData = aidesToProcess.map(aide => ({
      id: aide.id,
      titre: aide.name || aide.titre || 'Aide sans titre',
      description: aide.description ? aide.description.substring(0, 200) + '...' : 'Pas de description disponible',
      publics_vises: Array.isArray(aide.targeted_audiences) ? aide.targeted_audiences.slice(0, 3) : [],
      url: aide.url || '',
      backer: aide.backer || null // Ajout de l'organisme porteur
    }));
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo", // Changé pour GPT-4 Turbo
        messages: [
          {
            role: "system",
            content: `Voici un projet reformulé avec ses mots-clés. Voici une liste d'aides publiques récupérées via Aides-Territoires. Identifie les aides réellement pertinentes pour ce projet.

Projet :
${reformulation}

Mots-clés :
${Array.isArray(keywords) ? keywords.join(', ') : keywords}

Aides récupérées :
${JSON.stringify(aidesData)}

Pour chaque aide :
- Classe-la selon sa pertinence : "forte", "moyenne", "faible"
- Justifie cette évaluation brièvement
- Vérifie que l'aide contient au moins un des mots-clés (ou leurs synonymes)

Réponds avec un tableau JSON.`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    // Extraire et parser la réponse JSON
    let parsedResponse;
    try {
      const content = data.choices[0].message.content;
      // Extraire le JSON si la réponse contient du texte avant ou après
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      parsedResponse = JSON.parse(jsonString);
      
      // Enrichir les résultats avec les données complètes des aides originales
      parsedResponse = parsedResponse.map(aideEvaluee => {
        // Trouver l'aide originale correspondante
        const aideOriginale = aidesToProcess.find(a => a.id === aideEvaluee.id);
        
        if (aideOriginale) {
          // Conserver toutes les propriétés de l'aide originale et ajouter l'évaluation
          return {
            ...aideOriginale,
            pertinence: aideEvaluee.pertinence || 'moyenne',
            justification: aideEvaluee.justification || '',
            mots_cles_matches: aideEvaluee.mots_cles_matches || []
          };
        }
        
        // Si l'aide n'est pas trouvée (cas rare), retourner l'aide évaluée telle quelle
        return aideEvaluee;
      });
      
      console.log(`${parsedResponse.length} aides filtrées et traitées avec succès`);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      return [];
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Erreur lors du filtrage des aides:', error);
    return [];
  }
};

/**
 * Génère des mots-clés à partir d'une description de projet
 * @param {string} projectDescription - La description du projet
 * @returns {Promise<Array<string>>} Les mots-clés générés
 * @throws {Error} Si la génération échoue
 */
export const generateKeywords = async (projectDescription) => {
  console.warn('La fonction generateKeywords est dépréciée. Utilisez extractProjectKeywords à la place.');
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en analyse de projets publics. Extrais 5 à 8 mots-clés pertinents de la description du projet. Réponds uniquement avec les mots-clés séparés par des virgules, sans phrases ni explications."
          },
          {
            role: "user",
            content: projectDescription
          }
        ],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    // Traitement de la réponse pour obtenir une liste de mots-clés
    const keywordsText = data.choices[0].message.content;
    const keywords = keywordsText.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
    
    return keywords;
  } catch (error) {
    console.error('Erreur lors de la génération des mots-clés:', error);
    
    // Gestion des différents types d'erreurs
    if (error.message.includes('API key')) {
      throw new Error('Problème avec la clé API OpenAI. Veuillez vérifier votre configuration.');
    } else if (error.message.includes('429')) {
      throw new Error('Limite de requêtes OpenAI atteinte. Veuillez réessayer plus tard.');
    } else if (error.message.includes('5')) {
      throw new Error('Problème avec les serveurs OpenAI. Veuillez réessayer plus tard.');
    } else {
      throw new Error('Impossible de générer des mots-clés. Veuillez réessayer.');
    }
  }
};

/**
 * Fonction complète d'analyse de projet et recherche d'aides
 * @param {Object} project - Le projet à analyser
 * @returns {Promise<Object>} Les résultats de l'analyse
 * @throws {Error} Si l'analyse échoue
 */
export const analyserProjetEtAides = async (project) => {
  console.warn('La fonction analyserProjetEtAides est dépréciée. Utilisez analyserProjetComplet à la place.');
  try {
    console.log('Début de l\'analyse du projet:', project.id);
    
    // Étape 1: Analyse sémantique via OpenAI
    const analyseSemantique = await reformulateProjectV2(project.description);
    
    // Mise à jour du projet avec les résultats de l'analyse
    const projetMisAJour = {
      ...project,
      title: analyseSemantique.title,
      reformulation: analyseSemantique.reformulation,
      keywords: analyseSemantique.keywords,
      id_categories_aides_territoire: analyseSemantique.groupes_pertinents // Utiliser le nom correct de la colonne
    };
    
    return {
      projet: projetMisAJour,
      groupes_pertinents: analyseSemantique.groupes_pertinents
    };
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse du projet:', error);
    throw error;
  }
};

/**
 * Fonction de reformulation de projet (version dépréciée)
 * @param {string} projectDescription - La description du projet
 * @returns {Promise<Object>} Les résultats de la reformulation
 * @throws {Error} Si la reformulation échoue
 */
export const reformulateProject = async (projectDescription) => {
  console.warn('La fonction reformulateProject est dépréciée. Utilisez reformulateProjectInstitutional à la place.');
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en rédaction de projets publics. Analyse la description du projet fournie et réponds avec un objet JSON contenant les éléments suivants :
1. Un titre concis et accrocheur pour le projet (champ "title")
2. Une reformulation professionnelle et convaincante de la description (champ "reformulation")
3. Une liste de 5 à 8 mots-clés thématiques pertinents qui pourraient déclencher des aides publiques (champ "keywords" - tableau de chaînes)

Format de réponse attendu :
{
  "title": "Titre du projet",
  "reformulation": "Description reformulée...",
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3", "mot-clé4", "mot-clé5"]
}

Assure-toi que les mots-clés correspondent à des thématiques d'aides publiques comme : innovation, ruralité, sport, jeunesse, social, environnement, culture, éducation, santé, etc.`
          },
          {
            role: "user",
            content: projectDescription
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    // Extraire et parser la réponse JSON
    let parsedResponse;
    try {
      const content = data.choices[0].message.content;
      // Extraire le JSON si la réponse contient du texte avant ou après
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      // Fallback si le parsing échoue
      return {
        original: projectDescription,
        reformulated: data.choices[0].message.content,
        title: null,
        keywords: []
      };
    }
    
    return {
      original: projectDescription,
      reformulated: parsedResponse.reformulation || data.choices[0].message.content,
      title: parsedResponse.title || null,
      keywords: parsedResponse.keywords || []
    };
  } catch (error) {
    console.error('Erreur lors de la reformulation du projet:', error);
    
    // Gestion des différents types d'erreurs
    if (error.message.includes('API key')) {
      throw new Error('Problème avec la clé API OpenAI. Veuillez vérifier votre configuration.');
    } else if (error.message.includes('429')) {
      throw new Error('Limite de requêtes OpenAI atteinte. Veuillez réessayer plus tard.');
    } else if (error.message.includes('5')) {
      throw new Error('Problème avec les serveurs OpenAI. Veuillez réessayer plus tard.');
    } else {
      throw new Error('Impossible de reformuler le projet. Veuillez réessayer.');
    }
  }
};
