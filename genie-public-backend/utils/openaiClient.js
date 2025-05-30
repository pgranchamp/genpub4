/**
 * Utilitaire pour interagir avec l'API OpenAI
 */
const axios = require('axios');
require('dotenv').config();

// Configuration de base pour les requêtes OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Appelle l'API OpenAI pour traiter une invite utilisateur
 * @param {string} userPrompt - Texte saisi par l'utilisateur
 * @returns {Promise<Object>} - Promesse avec la réponse formatée
 */
const processUserPrompt = async (userPrompt) => {
  try {
    console.log('Appel à OpenAI avec le prompt:', userPrompt.substring(0, 100) + '...');
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui aide des structures locales à formuler clairement leurs projets pour obtenir des aides et subventions."
          },
          {
            role: "user",
            content: `Voici le texte saisi par l'utilisateur :\n\n"${userPrompt}"\n\nTa tâche est triple :\n1. Extrais un titre concis et percutant pour ce projet (maximum 10 mots)\n2. Rédige un résumé structuré du projet (environ 3-5 phrases) qui en présente clairement les enjeux, sans jargon, pour qu'un chargé de mission subventions puisse rapidement le comprendre\n3. Extrais une liste de mots-clés utiles pour la recherche d'aides, en te concentrant sur : secteur d'activité, type de structure, publics concernés, objectifs visés, thématiques, territoire.\n\nRends ta réponse au format JSON avec les champs suivants :\n- "title": titre concis du projet\n- "summary": résumé structuré\n- "description": le texte original de l'utilisateur (sans modification)\n- "keywords": tableau de mots-clés (chaque mot-clé doit être une chaîne de texte)`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Extraire la réponse JSON de la réponse d'OpenAI
    const aiResponse = response.data.choices[0].message.content;
    console.log('Réponse brute d\'OpenAI:', aiResponse);
    
    // Parser la réponse JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      throw new Error('Format de réponse OpenAI invalide');
    }
    
    // Vérifier que tous les champs requis sont présents
    if (!parsedResponse.title || !parsedResponse.summary || !parsedResponse.keywords) {
      throw new Error('Réponse OpenAI incomplète');
    }
    
    // Ajouter la description originale si elle n'est pas présente
    if (!parsedResponse.description) {
      parsedResponse.description = userPrompt;
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Erreur lors de l\'appel à OpenAI:', error);
    
    // Gestion des différents types d'erreurs
    if (error.response) {
      // Erreur de l'API OpenAI
      console.error('Détails de l\'erreur OpenAI:', error.response.data);
      throw new Error(`Erreur OpenAI: ${error.response.status} - ${error.response.data.error?.message || 'Erreur inconnue'}`);
    } else if (error.request) {
      // Pas de réponse reçue
      throw new Error('Pas de réponse reçue d\'OpenAI');
    } else {
      // Autre erreur
      throw error;
    }
  }
};

/**
 * Génère des mots-clés à partir d'une description de projet
 * @param {string} projectDescription - Description du projet
 * @returns {Promise<string[]>} - Promesse avec un tableau de mots-clés
 */
const generateKeywords = async (projectDescription) => {
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

module.exports = {
  processUserPrompt,
  generateKeywords
};
