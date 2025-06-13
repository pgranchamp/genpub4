/**
 * Utilitaire pour interagir avec l'API OpenAI
 */
import axios from 'axios';
// import 'dotenv/config'; // Assurez-vous que dotenv est configuré au point d'entrée de l'application (ex: server.js)
import { supabaseAdminRequest } from './supabaseClient.js'; // Importer pour récupérer les catégories

// Configuration de base pour les requêtes OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // eslint-disable-line no-undef

/**
 * Récupère toutes les catégories d'aides depuis Supabase.
 * @returns {Promise<Array<Object>>} La liste des catégories d'aides.
 */
const getAllAidCategories = async () => {
  try {
    const categories = await supabaseAdminRequest('GET', 'categories_aides_territoire', null, {
      select: 'id,categorie_nom,description' // Ajustez les champs selon votre table
    });
    if (!categories) {
      console.warn('Aucune catégorie d\'aide trouvée dans la base de données.');
      return [];
    }
    // Formater pour le prompt si nécessaire, ex: { id: cat.id, nom: cat.categorie_nom }
    return categories.map(cat => ({ id: cat.id, nom: cat.categorie_nom, description: cat.description }));
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories d\'aides:', error);
    return []; // Retourner un tableau vide en cas d'erreur pour ne pas bloquer le processus
  }
};

/**
 * Appelle l'API OpenAI pour traiter une description de projet (avec contenu de fichiers)
 * @param {string} combinedDescription - Description du projet incluant le contenu des fichiers.
 * @returns {Promise<Object>} - Promesse avec la réponse formatée: { title, summary, keywords, aid_categories }
 */
export const processUserPrompt = async (combinedDescription) => {
  try {
    console.log('Appel à OpenAI avec la description combinée:', combinedDescription.substring(0, 150) + '...');
    
    const availableAidCategories = await getAllAidCategories();
    const categoriesFormattedForPrompt = availableAidCategories.map(cat => 
      `- ID: ${cat.id}, Nom: ${cat.nom}${cat.description ? ', Description: ' + cat.description.substring(0,100) + '...' : ''}`
    ).join('\n');

    const systemMessage = `Tu es un assistant expert en formulation de projets pour des structures locales (associations, collectivités, entreprises) cherchant à obtenir des aides et subventions. Ton rôle est d'analyser la description d'un projet, potentiellement enrichie par le contenu de fichiers joints, et de produire des informations structurées pour faciliter la recherche de financements.`;

    const userMessageContent = `Voici la description détaillée d'un projet (incluant potentiellement des extraits de documents) :
---
${combinedDescription}
---

Voici la liste complète des catégories d'aides disponibles dans notre système :
---
${categoriesFormattedForPrompt}
---

Ta mission est de fournir les éléments suivants au format JSON :
1.  **title**: Un titre concis et percutant pour ce projet (maximum 15 mots).
2.  **summary**: Un résumé clair et structuré du projet (environ 5-7 phrases). Ce résumé doit synthétiser les informations de la description et des fichiers joints, en mettant en avant les objectifs, les actions principales, le public cible et l'impact attendu. Il doit être rédigé dans un style professionnel adapté à une demande de subvention.
3.  **keywords**: Une liste de 8 à 12 mots-clés ou expressions courtes (2-5 mots) très spécifiques et pertinents pour ce projet. Ces mots-clés doivent couvrir : les publics visés, les actions proposées, les méthodes employées, les objectifs du projet, les thématiques principales, et le territoire si mentionné. Ils serviront à la recherche d'aides.
4.  **aid_categories**: Un tableau contenant les IDs des 3 à 7 catégories d'aides les plus pertinentes parmi la liste fournie ci-dessus. Classe ces IDs par ordre de pertinence décroissante (la plus pertinente en premier). Une catégorie est pertinente si son intitulé ou sa thématique est directement et fortement lié à un ou plusieurs aspects clés du projet. Ne choisis une catégorie que si elle peut raisonnablement correspondre à un type de dispositif de financement pertinent pour ce projet spécifique.

Assure-toi que la réponse soit uniquement un objet JSON valide, sans texte explicatif avant ou après.
Exemple de format pour aid_categories : [101, 105, 102]

Réponds avec un objet JSON contenant les champs : "title", "summary", "keywords" (tableau de chaînes), et "aid_categories" (tableau d'IDs numériques).`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o", // ou "gpt-4-turbo" selon vos préférences et tests
        temperature: 0.5, // Légèrement augmentée pour un peu plus de créativité dans le résumé/titre
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessageContent }
        ],
        response_format: { type: "json_object" } // Demander explicitement un JSON
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const aiResponseContent = response.data.choices[0].message.content;
    console.log('Réponse brute d\'OpenAI (devrait être JSON):', aiResponseContent);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponseContent);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON d\'OpenAI:', parseError, "\nContenu reçu:", aiResponseContent);
      throw new Error('Format de réponse OpenAI invalide ou non-JSON.');
    }
    
    // Vérifier que tous les champs requis sont présents
    if (!parsedResponse.title || !parsedResponse.summary || !parsedResponse.keywords || !parsedResponse.aid_categories) {
      console.error('Réponse OpenAI incomplète. Reçue:', parsedResponse);
      throw new Error('Réponse OpenAI incomplète. Champs manquants: title, summary, keywords, ou aid_categories.');
    }
    if (!Array.isArray(parsedResponse.keywords) || !Array.isArray(parsedResponse.aid_categories)) {
      console.error('Format de keywords ou aid_categories incorrect. Reçue:', parsedResponse);
      throw new Error('Format incorrect pour keywords (doit être un tableau) ou aid_categories (doit être un tableau).');
    }
    
    // La description originale n'est plus gérée ici, elle est conservée dans projects.js
    return {
        title: parsedResponse.title,
        summary: parsedResponse.summary,
        keywords: parsedResponse.keywords,
        aid_categories: parsedResponse.aid_categories
    };
  } catch (error) {
    console.error('Erreur détaillée lors de l\'appel à OpenAI dans processUserPrompt:', error);
    if (error.response) {
      console.error('Données de l\'erreur OpenAI:', error.response.data);
      console.error('Statut de l\'erreur OpenAI:', error.response.status);
      console.error('Headers de l\'erreur OpenAI:', error.response.headers);
      throw new Error(`Erreur OpenAI: ${error.response.status} - ${error.response.data?.error?.message || 'Erreur inconnue du serveur OpenAI'}`);
    } else if (error.request) {
      console.error('Erreur de requête OpenAI (pas de réponse reçue):', error.request);
      throw new Error('Pas de réponse reçue du serveur OpenAI.');
    } else {
      console.error('Erreur lors de la configuration de la requête OpenAI ou autre:', error.message);
      throw new Error(`Erreur lors du traitement de la requête OpenAI: ${error.message}`);
    }
  }
};

// La fonction generateKeywords n'est plus nécessaire car processUserPrompt gère les mots-clés.
// Si elle est utilisée ailleurs, elle peut être conservée, sinon supprimée.
// Pour l'instant, je la commente au cas où.
/*
export const generateKeywords = async (projectDescription) => {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
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
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const keywordsText = response.data.choices[0].message.content;
    const keywords = keywordsText.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
    
    return keywords;
  } catch (error) {
    console.error('Erreur lors de la génération des mots-clés:', error);
    throw error;
  }
};
*/

// Exporter uniquement processUserPrompt si generateKeywords est supprimée ou non utilisée.
// export { processUserPrompt, generateKeywords }; // Si generateKeywords est conservée
// La ligne "export { processUserPrompt };" est redondante car la fonction est déjà exportée avec "export const processUserPrompt"
