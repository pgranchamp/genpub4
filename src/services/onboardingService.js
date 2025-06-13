/**
 * Service pour la conversation d'onboarding
 */
import { fetchWithAuth } from './httpClient';

/**
 * Envoie un message au backend, qui relaiera au workflow n8n approprié.
 * @param {string} workflow - Le nom du workflow cible (ex: 'onboarding-zero', 'onboarding-chat').
 * @param {Object} workflowPayload - Les données à envoyer au workflow n8n.
 * @returns {Promise<Object>} La réponse du workflow n8n.
 * @throws {Error} Si l'appel échoue.
 */
export const callOnboardingWorkflow = async (workflow, workflowPayload) => {
  const endpoint = '/api/onboarding/message';
  const body = {
    workflow,
    payload: workflowPayload,
  };

  console.log(`[OnboardingService] Appel du proxy backend : ${endpoint}`, body);

  try {
    // Nous utilisons fetchWithAuth pour appeler notre propre backend
    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // La réponse du proxy contient { success: true, data: <données de n8n> }
    // Nous retournons directement les données de n8n
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'appel au proxy d'onboarding:`, error);
    throw new Error("Impossible de communiquer avec l'assistant pour le moment.");
  }
};
