/* globals process */
import fetch from 'node-fetch';
import 'dotenv/config';

const N8N_BASE_URL = process.env.N8N_BASE_URL;

/**
 * Appelle le workflow N8N pour raffiner un lot d'aides.
 * @param {Array} aides - Le tableau d'objets aides à raffiner.
 * @param {object} projectContext - Le contexte global du projet.
 * @param {string} refinementJobId - L'ID du job de raffinement.
 * @returns {Promise<object>} - La réponse sommaire du workflow N8N.
 */
export const refineAidesBatch = async (aides, projectContext, refinementJobId, batchName) => {
  const webhookUrl = `${N8N_BASE_URL}/webhook/refineAidesService`;
  console.log(`[aideRefinementService] Appel de N8N pour le lot ${batchName} du job ${refinementJobId}. ${aides.length} aides.`);

  const payload = {
    aides,
    projectContext: {
      ...projectContext,
      refinementJobId // Ajout de l'ID du job pour le suivi dans n8n
    },
    batchName
  };

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_SERVICE_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(`[aideRefinementService] Erreur de n8n pour le lot ${batchName} du job ${refinementJobId} (${n8nResponse.status}):`, errorText);
      // Ne pas bloquer le processus complet pour un seul lot en erreur, juste logguer.
      return { success: false, error: `N8N workflow execution failed with status ${n8nResponse.status}` };
    }

    const responseData = await n8nResponse.json();
    console.log(`[aideRefinementService] Réponse brute reçue de N8N pour le lot ${batchName} du job ${refinementJobId}.`, responseData);

    if (responseData.parameters && responseData.parameters.responseBody) {
      // Extraire, nettoyer et parser le corps de la réponse réelle
      const responseBodyString = responseData.parameters.responseBody.replace(/^=\s*/, '');
      try {
        const finalStatus = JSON.parse(responseBodyString);
        console.log(`[aideRefinementService] Statut final extrait pour le lot ${batchName}:`, finalStatus);
        return finalStatus;
      } catch (parseError) {
        console.error(`[aideRefinementService] Erreur de parsing du responseBody JSON pour le lot ${batchName}:`, parseError);
        return { success: false, error: 'Failed to parse N8N response body' };
      }
    }

    console.warn(`[aideRefinementService] Format de réponse inattendu de N8N pour le lot ${batchName}.`);
    return { success: false, error: 'Unexpected N8N response format' };
    
  } catch (error) {
    console.error(`[aideRefinementService] Erreur lors de l'appel à N8N pour le lot ${batchName} du job ${refinementJobId}:`, error.message);
    return { success: false, error: error.message };
  }
};


// --- Ancienne fonction, conservée pour référence --- //

const OLD_N8N_WEBHOOK_URL = `${N8N_BASE_URL}/webhook/refineFilteredAides`;

/**
 * @deprecated Utiliser refineAidesBatch à la place.
 * Appelle le workflow N8N pour analyser et raffiner une seule aide.
 * @param {object} aideDetails - Les détails de l'aide à analyser.
 * @param {object} projectContext - Le contexte global du projet.
 * @returns {Promise<object>} - La réponse du workflow N8N.
 */
export const refineSingleAide = async (aideDetails, projectContext) => {
  console.log(`[aideRefinementService] Appel de N8N pour l'aide : ${aideDetails.name}`);

  const payload = {
    body: {
      aideDetails,
      projectContext,
    }
  };

  try {
    const n8nResponse = await fetch(OLD_N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_SERVICE_API_KEY}`
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
    throw new Error(`N8N workflow execution failed for aide "${aideDetails.name}"`);
  }
};
