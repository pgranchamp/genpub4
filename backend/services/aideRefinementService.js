/* globals process */
import axios from 'axios';
import 'dotenv/config';

// Construction de l'URL du webhook N8N à partir des variables d'environnement
const N8N_WEBHOOK_URL = `${process.env.N8N_BASE_URL}/webhook/refineFilteredAides`;

/**
 * Appelle le workflow N8N pour analyser et raffiner une seule aide.
 * @param {object} aideDetails - Les détails de l'aide à analyser.
 * @param {object} projectContext - Le contexte global du projet.
 * @returns {Promise<object>} - La réponse du workflow N8N.
 */
export const refineSingleAide = async (aideDetails, projectContext) => {
  console.log(`[aideRefinementService] Appel de N8N pour l'aide : ${aideDetails.name}`);

  const payload = {
    aideDetails,
    projectContext,
  };

  try {
    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 
        'Content-Type': 'application/json'
      },
    });

    console.log(`[aideRefinementService] Réponse reçue de N8N pour l'aide : ${aideDetails.name}`);
    // n8n peut encapsuler la réponse dans un objet `data`, on retourne le contenu.
    return response.data;
  } catch (error) {
    console.error(`[aideRefinementService] Erreur lors de l'appel à N8N pour l'aide "${aideDetails.name}":`, error.message);
    
    // En cas d'erreur avec N8N, on peut décider de retourner une erreur
    // ou un objet de fallback pour ne pas bloquer tout le processus.
    // Ici, nous propageons l'erreur pour que la route puisse la gérer.
    throw new Error(`N8N workflow execution failed for aide "${aideDetails.name}"`);
  }
};
