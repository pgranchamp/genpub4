/* globals process */
import fetch from 'node-fetch';
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

  // Le payload doit être encapsulé dans un objet "body" pour correspondre à ce que N8N attend.
  const payload = {
    body: {
      aideDetails,
      projectContext,
    }
  };

  try {
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(`[aideRefinementService] Erreur de la part de n8n (${n8nResponse.status}):`, errorText);
      throw new Error(`N8N workflow execution failed with status ${n8nResponse.status}`);
    }

    console.log(`[aideRefinementService] Réponse reçue de N8N pour l'aide : ${aideDetails.name}`);
    return await n8nResponse.json();
    
  } catch (error) {
    console.error(`[aideRefinementService] Erreur lors de l'appel à N8N pour l'aide "${aideDetails.name}":`, error.message);
    
    // Propage l'erreur pour que la route puisse la gérer.
    throw new Error(`N8N workflow execution failed for aide "${aideDetails.name}"`);
  }
};
