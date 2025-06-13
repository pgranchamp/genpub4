/**
 * Service de filtrage et de sélection d'aides financières via l'API OpenAI.
 */

import { callOpenAI } from '../api/openai.js';
import * as cheerio from 'cheerio';

/**
 * Extrait le texte brut d'une chaîne HTML.
 * @param {string} htmlString - La chaîne HTML.
 * @returns {string} Le texte brut.
 */
const extractTextFromHtml = (htmlString) => {
  if (!htmlString) return '';
  try {
    const $ = cheerio.load(htmlString);
    return $.text();
  } catch (e) {
    console.error("Erreur lors de l'extraction du texte du HTML:", e);
    return htmlString;
  }
};

/**
 * Premier passage de filtrage des aides par l'IA.
 * @param {Array<Object>} aides - Liste complète des aides récupérées (avec id, name, description HTML).
 * @param {Object} projectContext - Contexte du projet (ex: { reformulation: "...", keywords: ["...", "..."] }).
 * @param {number} maxWordsDescription - Nombre maximum de mots à conserver pour la description de chaque aide.
 * @returns {Promise<Array<Object>>} Liste réduite d'aides (objets originaux) jugées potentiellement pertinentes.
 */
const filterAidesPass1 = async (aides, projectContext, maxWordsDescription = 300) => {
  console.log(`[filterAidesPass1] Début du premier passage de filtrage IA pour ${aides.length} aides.`);
  if (!aides || aides.length === 0) {
    return [];
  }

  // Construction améliorée du résumé du projet pour l'IA
  let projectSummaryForIA = "Contexte détaillé du projet pour l'évaluation des aides :\n";
  if (projectContext.title && projectContext.title !== projectContext.reformulation) {
    projectSummaryForIA += `Titre officiel du projet: ${projectContext.title}\n`;
  }
  projectSummaryForIA += `Description générale et objectif principal du projet (reformulation institutionnelle): ${projectContext.reformulation}\n`;
  projectSummaryForIA += `Les mots-clés suivants décrivent les aspects spécifiques du projet (tels que publics cibles, actions concrètes, objectifs détaillés, méthodes envisagées): ${projectContext.keywords.join(', ')}`;

  // Préparer les données des aides pour l'IA (celles qui ont une description)
  const aidesDataForIA = aides
    .map(aide => {
      const textDescription = extractTextFromHtml(aide.description);
      const truncatedDescription = textDescription.split(/\s+/).slice(0, maxWordsDescription).join(' ');
      return {
        id: aide.id,
        name: aide.name,
        description: truncatedDescription,
        originalAide: aide 
      };
    })
    .filter(aideData => aideData.description.trim() !== '');

  if (aidesDataForIA.length === 0) {
    console.log('[filterAidesPass1] Aucune aide avec description suffisante pour analyse IA.');
    return [];
  }
  
  console.log(`[filterAidesPass1] ${aidesDataForIA.length} aides avec description suffisante pour analyse IA.`);

  const BATCH_SIZE = 10;
  let allPotentiallyRelevantIds = new Set();

  for (let i = 0; i < aidesDataForIA.length; i += BATCH_SIZE) {
    const batch = aidesDataForIA.slice(i, i + BATCH_SIZE);
    console.log(`[filterAidesPass1] Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(aidesDataForIA.length / BATCH_SIZE)}`);

    const aidesFormattedForPrompt = batch.map(a => 
      `ID: ${a.id}\nTitre: ${a.name}\nDescription (tronquée): ${a.description}`
    ).join('\n\n---\n\n');

    const systemMessage = `Tu es un assistant expert en aides publiques. Ta tâche est d'effectuer un premier filtrage rapide. Évalue la pertinence POTENTIELLE de chaque aide listée ci-dessous par rapport au contexte du projet fourni. Une aide est "potentiellement pertinente" si son titre OU sa description courte suggère une adéquation possible avec les objectifs, les actions, ou le public cible du projet. Ne sois pas trop strict à ce stade, l'objectif est de réduire la liste sans éliminer de bonnes pistes trop tôt.`;
    
    const userMessageContent = `${projectSummaryForIA}\n\nVoici une liste d'aides à évaluer:\n${aidesFormattedForPrompt}\n\nRetourne UNIQUEMENT un objet JSON valide avec une seule clé "pertinent_aides_ids". La valeur de cette clé doit être un tableau contenant les IDs numériques des aides que tu juges potentiellement pertinentes. Si aucune aide de ce lot n'est pertinente, retourne un tableau vide. Exemple: {"pertinent_aides_ids": [123, 789]}`;

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessageContent }
    ];

    try {
      const openAIResponse = await callOpenAI(messages, "gpt-4o", 0.2); 
      const content = openAIResponse.choices[0].message.content;
      console.log(`[filterAidesPass1] Réponse brute de l'IA (gpt-4o) pour le lot: ${content.substring(0,200)}...`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const parsedResponse = JSON.parse(jsonString);
        if (parsedResponse.pertinent_aides_ids && Array.isArray(parsedResponse.pertinent_aides_ids)) {
          parsedResponse.pertinent_aides_ids.forEach(id => allPotentiallyRelevantIds.add(id));
          console.log(`[filterAidesPass1] IDs pertinents du lot: ${parsedResponse.pertinent_aides_ids.join(', ')}`);
        } else {
          console.warn('[filterAidesPass1] Réponse IA pour le lot ne contient pas pertinent_aides_ids ou n\'est pas un tableau:', parsedResponse);
        }
      } else {
         console.warn('[filterAidesPass1] Aucune structure JSON valide trouvée dans la réponse IA pour le lot:', content);
      }
    } catch (e) {
      console.error(`[filterAidesPass1] Erreur lors de l'appel OpenAI ou du parsing pour le lot ${i / BATCH_SIZE}:`, e);
    }
  }
  
  const finalFilteredAides = aides.filter(aide => allPotentiallyRelevantIds.has(aide.id));

  console.log(`[filterAidesPass1] Fin du premier passage. ${finalFilteredAides.length} aides jugées potentiellement pertinentes au total.`);
  return finalFilteredAides; 
};

const filterAidesPass2 = async (potentiallyRelevantAides, projectContext, maxWordsDescription = 300, topN = 7) => {
  console.log(`[filterAidesPass2] Début du second passage de filtrage IA pour ${potentiallyRelevantAides.length} aides potentiellement pertinentes. Objectif: top ${topN}.`);
  if (!potentiallyRelevantAides || potentiallyRelevantAides.length === 0) {
    return [];
  }

  const projectSummaryForIA = `Contexte du projet pour lequel nous cherchons les aides les plus actionnables:\nTitre/Objectif du projet: ${projectContext.reformulation}\nMots-clés principaux du projet: ${projectContext.keywords.join(', ')}`;

  const aidesDataForIA = potentiallyRelevantAides.map(aide => {
    const textDescription = extractTextFromHtml(aide.description); 
    const truncatedDescription = textDescription.split(/\s+/).slice(0, maxWordsDescription).join(' ');
    return {
      id: aide.id,
      name: aide.name,
      description: truncatedDescription,
    };
  });

  if (aidesDataForIA.length === 0) {
    console.log('[filterAidesPass2] Aucune aide avec description suffisante pour la passe 2.');
    return [];
  }
  
  console.log(`[filterAidesPass2] ${aidesDataForIA.length} aides candidates pour la sélection finale par l'IA.`);

  const aidesFormattedForPrompt = aidesDataForIA.map(a => 
    `ID: ${a.id}\nTitre: ${a.name}\nDescription (tronquée): ${a.description}`
  ).join('\n\n---\n\n');

  const systemMessage = `Tu es un analyste expert en financements publics, spécialisé dans l'identification des aides les plus "actionnables" pour un projet donné.
Ton rôle est d'analyser une liste d'aides jugées "potentiellement pertinentes" et de sélectionner les ${topN} meilleures, en fournissant une justification concise pour chacune.
Une aide "actionnable" est une aide pour laquelle le projet a de fortes chances de répondre aux critères, et qui semble apporter une valeur significative.
Prends en compte la spécificité de l'aide par rapport au projet.`;

  const userMessageContent = `${projectSummaryForIA}

Voici la liste des aides potentiellement pertinentes (issues d'un premier filtre) à analyser :
${aidesFormattedForPrompt}

Ta mission :
1. Analyse attentivement chaque aide en fonction du contexte du projet.
2. Sélectionne les ${topN} aides que tu considères comme les plus pertinentes et actionnables pour ce projet.
3. Pour CHACUNE de ces ${topN} aides sélectionnées, fournis une justification CLAIRE et CONCISE (1-2 phrases maximum) expliquant pourquoi elle est particulièrement adaptée au projet. Mets en évidence les éléments clés de l'aide qui correspondent au projet.

Retourne UNIQUEMENT un objet JSON valide avec une seule clé "selected_aides".
La valeur de "selected_aides" doit être un tableau d'objets. Chaque objet doit contenir :
  - "id": l'ID numérique de l'aide sélectionnée.
  - "justification": ta justification pour cette aide.

Classe les aides sélectionnées par ordre de pertinence décroissante (la plus pertinente en premier).
Si moins de ${topN} aides sont jugées véritablement actionnables, retourne uniquement celles qui le sont. Si aucune n'est actionnable, retourne un tableau vide.

Exemple de format de réponse attendu :
{
  "selected_aides": [
    { "id": 123, "justification": "Cette aide cible spécifiquement les projets d'inclusion numérique pour les jeunes, ce qui correspond parfaitement à l'objectif principal du projet." },
    { "id": 456, "justification": "Le soutien aux initiatives locales en zone rurale mentionné dans cette aide est un atout majeur pour le projet situé en milieu rural." }
  ]
}`;

  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessageContent }
  ];

  try {
    const openAIResponse = await callOpenAI(messages, "gpt-4o", 0.5); 
    const content = openAIResponse.choices[0].message.content;
    console.log(`[filterAidesPass2] Réponse brute de l'IA: ${content.substring(0,500)}...`);

    let finalAides = [];
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonString);
      
      if (parsedResponse.selected_aides && Array.isArray(parsedResponse.selected_aides)) {
        const justifiedAidesMap = new Map();
        parsedResponse.selected_aides.forEach(selected => {
          if (selected.id && selected.justification) {
            justifiedAidesMap.set(selected.id, selected.justification);
          }
        });

        parsedResponse.selected_aides.forEach(selected => {
          const originalAide = potentiallyRelevantAides.find(aide => aide.id === selected.id);
          if (originalAide) {
            finalAides.push({
              ...originalAide,
              justification_IA: selected.justification
            });
          }
        });
        
        console.log(`[filterAidesPass2] ${finalAides.length} aides sélectionnées et justifiées par l'IA.`);
      } else {
        console.warn('[filterAidesPass2] Réponse IA ne contient pas selected_aides ou n\'est pas un tableau:', parsedResponse);
      }
    } else {
       console.warn('[filterAidesPass2] Aucune structure JSON valide trouvée dans la réponse IA:', content);
    }
    
    console.log(`[filterAidesPass2] Fin du second passage. ${finalAides.length} aides sélectionnées comme "très pertinentes".`);
    return finalAides;

  } catch (e) {
    console.error(`[filterAidesPass2] Erreur lors de l'appel OpenAI ou du parsing:`, e);
    return []; 
  }
};

// The missing function
const filterAidesFromAPI = async (reformulation, keywords, aides) => {
  // This function seems to be a wrapper around the two passes.
  // For now, we'll just implement the first pass.
  const projectContext = { reformulation, keywords };
  return await filterAidesPass1(aides, projectContext);
};


export {
  filterAidesPass1,
  filterAidesPass2,
  filterAidesFromAPI,
};
