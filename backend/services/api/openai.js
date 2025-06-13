/**
 * Service de base pour les appels à l'API OpenAI.
 * Gère la configuration et l'exécution des requêtes.
 */

// URL de l'API OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Récupérer la clé API depuis les variables d'environnement du serveur
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Fonction générique pour les appels à l'API OpenAI.
 * @param {Array<Object>} messages - Les messages à envoyer.
 * @param {string} model - Le modèle à utiliser (par défaut "gpt-3.5-turbo").
 * @param {number} temperature - La température pour la créativité (par défaut 0.7).
 * @returns {Promise<Object>} La réponse complète de l'API.
 * @throws {Error} Si l'appel à l'API échoue ou si la réponse est invalide.
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

export {
  callOpenAI,
};
