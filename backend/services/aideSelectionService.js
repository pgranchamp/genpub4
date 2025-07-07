/* globals process */
import fetch from 'node-fetch';
import 'dotenv/config';

// L'URL du webhook N8N qui démarre la sélection d'un lot
const N8N_WEBHOOK_URL = `${process.env.N8N_BASE_URL}/webhook/aideSelectionService`;

/**
 * Appelle le workflow N8N pour pré-sélectionner un lot d'aides et attend la confirmation.
 * @param {number} jobId - L'ID du job global.
 * @param {string} batchId - L'ID unique pour ce lot.
 * @param {Array<string>} key_elements - Les éléments clés de l'organisation.
 * @param {string} projectContext - Le contexte du projet (reformulation).
 * @param {Array<string>} keywords - Les mots-clés du projet.
 * @param {Array<Object>} aides - Le lot d'aides à analyser.
 * @returns {Promise<boolean>} - True si le lot a été traité avec succès, false sinon.
 */
export const selectAidesWithN8N = async (jobId, batchId, key_elements, projectContext, keywords, aides) => {
  const payload = {
    job_id: jobId,
    batch_id: batchId,
    key_elements,
    projectContext,
    keywords,
    aides,
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_SERVICE_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[aideSelectionService] Erreur de la part de n8n (${response.status}) pour le lot ${batchId}:`, errorText);
      return false;
    }

    console.log(`[aideSelectionService] Lot ${batchId} traité avec succès par N8N.`);
    return true;
    
  } catch (error) {
    console.error(`[aideSelectionService] Erreur réseau lors de l'envoi du lot ${batchId} à N8N:`, error.message);
    return false;
  }
};
