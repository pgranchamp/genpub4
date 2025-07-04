/**
 * Service pour l'analyse de l'organisation via des services externes (ex: n8n)
 */
import fetch from 'node-fetch';
import process from 'node:process';
import { supabaseAdmin } from '../utils/supabaseClient.js';

/**
 * Analyse le site web d'une organisation via un webhook n8n et stocke les résultats.
 * @param {string} organisationId - L'ID de l'organisation à mettre à jour.
 * @param {string} websiteUrl - L'URL du site web à analyser.
 * @returns {Promise<void>}
 */
const analyzeAndStoreKeyElements = async (organisationId, websiteUrl) => {
  console.log(`[AnalysisService] Début de l'analyse pour l'organisation ${organisationId} avec l'URL: ${websiteUrl}`);

  // Construire l'URL du webhook à partir des variables d'environnement
  const n8nWebhookUrl = `${process.env.N8N_BASE_URL}/webhook/analyze-user-website`;
  console.log(`[AnalysisService] Appel du webhook n8n: ${n8nWebhookUrl}`);

  try {
    // 1. Appeler le webhook n8n avec l'URL du site
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: websiteUrl }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`L'appel au webhook n8n a échoué avec le statut ${response.status}: ${errorBody}`);
    }

    const n8nResult = await response.json();
    console.log('[AnalysisService] Réponse reçue de n8n:', JSON.stringify(n8nResult, null, 2));

    // 2. Traiter la réponse de n8n
    // La réponse attendue est directement l'objet JSON.
    const outputData = n8nResult;
    console.log('[AnalysisService] Données de sortie reçues:', outputData);

    if (!outputData || typeof outputData !== 'object') {
      throw new Error('Format de réponse de n8n invalide ou non-objet.');
    }

    // 3. Vérifier si l'URL était valide et s'il y a des données à stocker
    if (outputData.url_valid === true) {
      // Préparer les données à stocker. Nous stockons l'objet JSON entier en tant que texte.
      const keyElements = JSON.stringify(outputData);

      // 4. Mettre à jour l'enregistrement de l'organisation dans Supabase
      console.log(`[AnalysisService] Mise à jour de l'organisation ${organisationId} avec les éléments clés.`);
      const { error } = await supabaseAdmin
        .from('organisations')
        .update({ key_elements: keyElements })
        .eq('id', organisationId);

      if (error) throw error;
      
      console.log(`[AnalysisService] Organisation ${organisationId} mise à jour avec succès.`);
    } else {
      console.log(`[AnalysisService] L'URL (${websiteUrl}) n'a pas été validée par n8n. Aucune mise à jour effectuée.`);
    }
  } catch (error) {
    // En cas d'erreur, on loggue le problème mais on ne bloque pas le flux principal (ex: l'inscription)
    console.error(`[AnalysisService] Erreur lors de l'analyse de l'organisation ${organisationId}:`, error);
    // On pourrait ajouter un système de re-tentative ou de notification ici si nécessaire.
  }
};

export {
  analyzeAndStoreKeyElements,
};
