/**
 * Service d'analyse de projets (description, mots-clés, catégories) via l'API OpenAI.
 */

import { callOpenAI } from '../api/openai.js';

/**
 * Reformulation professionnelle du projet
 * @param {string} projectDescription - La description du projet
 * @param {string} keyElements - Les éléments clés de l'organisation
 * @returns {Promise<Object>} La reformulation professionnelle
 * @throws {Error} Si la reformulation échoue
 */
const reformulateProjectInstitutional = async (projectDescription, keyElements) => {
  console.log('Début de la reformulation professionnelle');
  console.log(`Éléments clés: ${keyElements}`);
  console.log(`Longueur de la description: ${projectDescription.length} caractères`);
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en ingénierie de projets et en rédaction de demandes de financement pour des organismes publics et associatifs.

Voici des informations clés sur l'organisation qui porte le projet :
---
${keyElements}
---

Ta mission est d'analyser la description brute du projet fournie par l'utilisateur et de la reformuler dans un langage administratif et institutionnel. Le texte doit être clair, structuré et mettre en valeur l'alignement du projet avec des politiques publiques potentielles.

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
 * @param {string} keyElements - Les éléments clés de l'organisation
 * @returns {Promise<Array<string>>} Les mots-clés extraits
 * @throws {Error} Si l'extraction échoue
 */
const extractProjectKeywords = async (projectDescription, keyElements) => {
  console.log('Début de l\'extraction des mots-clés');
  console.log(`Éléments clés: ${keyElements}`);
  console.log(`Longueur de la description: ${projectDescription.length} caractères`);
  
  try {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en analyse de projets pour le secteur public et associatif. Tu es spécialisé dans l'identification de mots-clés pour les appels à projets.

Voici des informations clés sur l'organisation qui porte le projet :
---
${keyElements}
---

Voici la description du projet :
---
${projectDescription}
---

Ta mission est d'extraire une liste de 8 mots-clés et expressions courtes (2 à 5 mots) qui correspondent au vocabulaire utilisé dans les appels à projets et les fiches d'aides publiques.

Les mots-clés doivent couvrir :
- Les thématiques principales (ex: "inclusion numérique", "développement durable", "cohésion sociale")
- Les publics cibles (ex: "jeunes en insertion", "personnes âgées isolées")
- Les actions concrètes (ex: "ateliers de formation", "création de lien social")

Les mots-clés doivent être précis, administratifs et non redondants.

Format :
[
  "mot-clé 1",
  "mot-clé 2",
  ...
]`
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
const selectAidCategories = async (reformulation, keywords, key_elements, categoriesList) => {
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
    
    // Formater les mots-clés pour le prompt
    const keywordsFormatted = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en financement public et en recherche d'aides sur la plateforme Aides-Territoires.

À partir de la description d'un projet et des mots-clés associés, tu dois sélectionner les catégories d'aides les plus pertinentes pour identifier des financements adaptés.

Voici des informations clés sur l'organisation qui porte le projet :
---
${key_elements}
---

Voici la description du projet (version reformulée) :
---
${reformulation}
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
 * Filtre une liste d'aides en utilisant OpenAI
 * @param {string} projectContext - Le contexte du projet (reformulation)
 * @param {Array<string>} keywords - Les mots-clés du projet
 * @param {Array<Object>} aides - La liste des aides à filtrer
 * @returns {Promise<Array<Object>>} La liste des aides filtrées
 */
export const filterAidesFromAPI = async (projectContext, keywords, aides) => {
  console.log(`Début du filtrage OpenAI pour ${aides.length} aides.`);
  const chunkSize = 20;
  const aideChunks = [];

  for (let i = 0; i < aides.length; i += chunkSize) {
    aideChunks.push(aides.slice(i, i + chunkSize));
  }

  console.log(`Découpage en ${aideChunks.length} lots de ${chunkSize} aides.`);

  const processChunk = async (chunk) => {
    const simplifiedAides = chunk.map(aide => ({
      id: aide.id,
      name: aide.name,
      description: aide.description?.substring(0, 300) + '...',
      url: aide.url,
    }));

    const messages = [
      {
        role: "system",
        content: `Tu es un expert en financement de projets. Ta mission est de filtrer une liste d'aides pour un projet donné.

Voici le contexte du projet :
---
${projectContext}
---

Voici les mots-clés du projet :
---
${keywords.join(', ')}
---

Pour chaque aide dans la liste JSON suivante, décide si elle est pertinente. Une aide est pertinente si son titre ou sa description correspond bien au contexte et aux mots-clés du projet.

Réponds avec un tableau d'objets JSON. Chaque objet doit contenir "id", "title", "url", et un champ "decision" avec la valeur "à voir" ou "pas pertinent".
Exemple de format attendu :
[
  { "id": 123, "title": "Titre de l'aide 1", "url": "http://...", "decision": "à voir" },
  { "id": 456, "title": "Titre de l'aide 2", "url": "http://...", "decision": "pas pertinent" }
]`
      },
      {
        role: "user",
        content: JSON.stringify(simplifiedAides, null, 2)
      }
    ];

    try {
      const data = await callOpenAI(messages, "gpt-3.5-turbo", 0.5);
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Erreur lors du traitement d\'un lot d\'aides:', error);
      return []; // Retourner un tableau vide en cas d'erreur sur un lot
    }
  };

  try {
    const allResults = await Promise.all(aideChunks.map(chunk => processChunk(chunk)));
    const flatResults = allResults.flat();
    console.log(`Filtrage OpenAI terminé. ${flatResults.length} décisions reçues.`);
    return flatResults;
  } catch (error) {
    console.error('Erreur lors du traitement parallèle des lots:', error);
    throw error;
  }
};

export {
  reformulateProjectInstitutional,
  extractProjectKeywords,
  selectAidCategories,
};
