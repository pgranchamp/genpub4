import fetch from 'node-fetch';
import 'dotenv/config';
import process from 'node:process';
import { supabaseAdmin } from '../../utils/supabaseClient.js';

const N8N_BASE_URL = process.env.N8N_BASE_URL;

/**
 * Appelle le workflow n8n pour analyser un projet et met à jour la base de données.
 * @param {string} projectId - L'ID du projet à analyser.
 * @param {string} userId - L'ID de l'utilisateur qui a initié la demande.
 * @returns {Promise<Object>} - Le projet mis à jour avec les résultats de l'analyse.
 */
export const analyzeProjectWorkflow = async (projectId, userId) => {
  console.log(`[ProjectAnalyzer] Démarrage de l'analyse pour le projet ${projectId}`);

  // 1. Récupérer les détails du projet (description)
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, description')
    .eq('id', projectId)
    .single();
  if (projectError) throw projectError;

  // 2. Récupérer le contexte de l'organisation
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('organisation_id')
    .eq('id', userId)
    .single();
  if (userError || !user.organisation_id) throw userError || new Error(`Aucune organisation trouvée pour l'utilisateur ${userId}.`);
  
  const { data: organisation, error: orgError } = await supabaseAdmin
    .from('organisations')
    .select('key_elements')
    .eq('id', user.organisation_id)
    .single();
  if (orgError) throw orgError;

  // 3. Construire le payload pour n8n
  const payload = {
    projectId: project.id,
    projectDescription: project.description, // Description du projet
    organisationKeyElements: organisation.key_elements, // Uniquement les éléments clés de l'organisation
  };

  // 4. Appeler le workflow n8n
  const webhookUrl = `${N8N_BASE_URL}/webhook/project-analyzer`;
  console.log(`[ProjectAnalyzer] Relais vers: ${webhookUrl}`);

  const n8nResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!n8nResponse.ok) {
    const errorText = await n8nResponse.text();
    console.error(`[ProjectAnalyzer] Erreur de n8n (${n8nResponse.status}):`, errorText);
    throw new Error(`Erreur du service d'analyse de projet: ${errorText}`);
  }

  const responseData = await n8nResponse.json();
  const resultData = Array.isArray(responseData) ? responseData[0] : responseData;

  // 5. Valider et mettre à jour le projet dans Supabase
  if (!resultData.title || !resultData.reformulation || !resultData.summary || !resultData.keywords?.keywords || !resultData.categories) {
    console.error('[ProjectAnalyzer] Réponse de n8n invalide, champs manquants:', resultData);
    throw new Error('Réponse de n8n invalide après analyse du projet.');
  }

  const updatedData = {
    title: resultData.title,
    reformulation: resultData.reformulation,
    summary: resultData.summary,
    keywords: resultData.keywords.keywords,
    id_categories_aides_territoire: resultData.categories,
    status: 'projet_analyse',
  };

  const { data: updatedProject, error } = await supabaseAdmin
    .from('projects')
    .update(updatedData)
    .eq('id', projectId)
    .select();

  if (error) throw error;

  console.log(`[ProjectAnalyzer] Projet ${projectId} mis à jour avec succès.`);

  return updatedProject[0];
};
