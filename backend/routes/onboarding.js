import express from 'express';
import process from 'node:process';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';

const N8N_BASE_URL = process.env.N8N_BASE_URL;

/**
 * @route   POST /onboarding/message
 * @desc    Relayer un message au workflow d'onboarding n8n
 * @access  Privé
 */
router.post('/message', authenticate, asyncHandler(async (req, res) => {
  const { workflow, payload } = req.body;
  const userId = req.user.id;

  if (!workflow || !payload) {
    return res.status(400).json({ success: false, error: 'Le nom du workflow et le payload sont requis.' });
  }

  try {
    let enrichedPayload = { ...payload };

    // Si le workflow est celui de l'analyse, enrichir le payload
    if (workflow === 'project-analyzer' && payload.projectId) {
      // 1. Récupérer les détails du projet
      const projects = await supabaseAdminRequest('GET', `projects?id=eq.${payload.projectId}&select=id,description`);
      if (!projects || projects.length === 0) {
        return res.status(404).json({ success: false, error: 'Projet non trouvé.' });
      }
      const project = projects[0];

      // 2. Trouver l'organisation de l'utilisateur
      const userOrgs = await supabaseAdminRequest('GET', `users_organisations?user_id=eq.${userId}&select=organisation_id`);
      if (!userOrgs || userOrgs.length === 0) {
        return res.status(404).json({ success: false, error: 'Aucune organisation trouvée pour cet utilisateur.' });
      }
      const organisationId = userOrgs[0].organisation_id;

      // 3. Récupérer les key_elements de l'organisation
      const orgs = await supabaseAdminRequest('GET', `organisations?id=eq.${organisationId}&select=key_elements`);
      if (!orgs || orgs.length === 0) {
        return res.status(404).json({ success: false, error: 'Détails de l\'organisation non trouvés.' });
      }
      const organisation = orgs[0];

      // 4. Construire le payload enrichi pour n8n
      enrichedPayload = {
        ...payload,
        projectId: project.id,
        projectDescription: project.description,
        organisationKeyElements: organisation.key_elements,
      };
    }

    // 5. Relayer vers n8n
    const endpoint = 'webhook';
    const webhookUrl = `${N8N_BASE_URL}/${endpoint}/${workflow}`;
    
    console.log(`[Proxy Onboarding] Relais vers: ${webhookUrl}`);

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });

    // Gérer le cas où la réponse n'est pas du JSON
    const contentType = n8nResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await n8nResponse.text();
        console.error('[Proxy Onboarding] Réponse non-JSON de n8n:', textResponse);
        return res.status(n8nResponse.status).json({
            success: false,
            error: 'Réponse invalide du service d\'onboarding.',
            details: textResponse,
        });
    }

    const responseData = await n8nResponse.json();
    
    if (!n8nResponse.ok) {
      console.error('[Proxy Onboarding] Erreur de la part de n8n:', responseData);
      return res.status(n8nResponse.status).json({
        success: false,
        error: 'Erreur du service d\'onboarding.',
        details: responseData,
      });
    }

    // Nettoyer et sauvegarder les données si le workflow est project-analyzer
    if (workflow === 'project-analyzer' && payload.projectId) {
      console.log('[Onboarding] Traitement de la réponse de project-analyzer...');
      const n8nResult = Array.isArray(responseData) ? responseData[0] : responseData;
      
      // Parser les champs qui sont encore des chaînes JSON
      const reformulationData = typeof n8nResult.reformulation === 'string' ? JSON.parse(n8nResult.reformulation) : n8nResult.reformulation;
      const keywordsRaw = typeof n8nResult.keywords === 'string' ? JSON.parse(n8nResult.keywords) : n8nResult.keywords;
      const categories = typeof n8nResult.categories === 'string' ? JSON.parse(n8nResult.categories) : n8nResult.categories;

      const keywords = keywordsRaw.map(kw => kw.mot_cle);

      const updatedData = {
        title: reformulationData.title,
        reformulation: reformulationData.reformulation,
        keywords: keywords,
        id_categories_aides_territoire: categories,
        status: 'analyzed',
      };

      await supabaseAdminRequest('PATCH', `projects?id=eq.${payload.projectId}`, updatedData);
      console.log(`[Onboarding] Projet ${payload.projectId} mis à jour avec les résultats de l'analyse.`);
    }

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('[Proxy Onboarding] Erreur de communication avec n8n:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de communiquer avec le service d\'onboarding.',
    });
  }
}));

export default router;
