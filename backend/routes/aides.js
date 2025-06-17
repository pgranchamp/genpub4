import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { authenticate } from '../middleware/auth.js';
import { searchAidesTerritoires } from '../services/aidesTerritoiresService.js';
import { filterAidesFromAPI } from '../services/analysis/projectAnalyzer.js'; // Assurez-vous que cette fonction est bien dans ce fichier

/**
 * @route   POST /aides/search-and-filter
 * @desc    Rechercher et filtrer les aides en une seule étape
 * @access  Privé
 */
router.post('/search-and-filter', authenticate, asyncHandler(async (req, res) => {
  const { projectContext, keywords, key_elements, id_categories_aides_territoire, organisationType, perimeterCode } = req.body;

  if (!projectContext || !keywords || !key_elements || !id_categories_aides_territoire) {
    return res.status(400).json({ error: 'Les champs projectContext, keywords, key_elements et id_categories_aides_territoire sont requis.' });
  }

  const mapOrganisationTypeToOrganizationTypeSlugs = (orgType) => {
    const lowerOrgType = orgType?.toLowerCase();
    switch (lowerOrgType) {
      case 'association': return ['association'];
      case 'entreprise':
      case 'entreprise_privee': return ['private-sector'];
      case 'commune': return ['commune'];
      case 'epci': return ['epci'];
      case 'departement': return ['department'];
      case 'region': return ['region'];
      default: return [];
    }
  };

  try {
    // 1. Construire les paramètres pour l'API Aides-Territoires
    const searchParams = {
      category_ids: id_categories_aides_territoire,
    };

    if (organisationType) {
      searchParams.organization_type_slugs = mapOrganisationTypeToOrganizationTypeSlugs(organisationType);
    }

    if (perimeterCode) {
      searchParams.perimeter_codes = [perimeterCode];
    }

    // 2. Récupérer les aides
    const allAides = await searchAidesTerritoires(searchParams);

    // 3. Filtrer les aides avec OpenAI (en utilisant la fonction existante)
    // Note: filterAidesFromAPI doit être adaptée pour ne pas dépendre du frontend
    const filteredAides = await filterAidesFromAPI(projectContext, keywords, allAides);

    res.json({ success: true, data: filteredAides });

  } catch (error) {
    console.error('Erreur dans /search-and-filter:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recherche et du filtrage des aides.' });
  }
}));

/**
 * @route   POST /aides/refine-and-stream
 * @desc    Recherche, filtre et raffine les aides en streamant les résultats
 * @access  Privé
 */
import { refineSingleAide } from '../services/aideRefinementService.js';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';

router.post('/refine-and-stream', authenticate, asyncHandler(async (req, res) => {
  console.log('[STREAM] /refine-and-stream called. Body:', req.body);
  const { projectContext, keywords, key_elements, id_categories_aides_territoire, organisationType, perimeterCode, projectId, organisationId } = req.body;

  // 1. Validation des entrées
  if (!projectContext || !keywords || !key_elements || !id_categories_aides_territoire || !projectId || !organisationId) {
    return res.status(400).json({ error: 'Les champs projectContext, keywords, key_elements, id_categories_aides_territoire, projectId et organisationId sont requis.' });
  }

  // 2. Configuration des headers pour le Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // 3. Logique de recherche et de filtrage initial (Phase 1)
    const mapOrganisationTypeToOrganizationTypeSlugs = (orgType) => {
      const lowerOrgType = orgType?.toLowerCase();
      switch (lowerOrgType) {
        case 'association': return ['association'];
        case 'entreprise':
        case 'entreprise_privee': return ['private-sector'];
        case 'commune': return ['commune'];
        case 'epci': return ['epci'];
        case 'departement': return ['department'];
        case 'region': return ['region'];
        default: return [];
      }
    };

    const searchParams = {
      category_ids: id_categories_aides_territoire,
      organization_type_slugs: mapOrganisationTypeToOrganizationTypeSlugs(organisationType),
      perimeter_codes: perimeterCode ? [perimeterCode] : undefined,
    };
    console.log('[STREAM] Search params for Aides Territoires:', searchParams);

    const allAides = await searchAidesTerritoires(searchParams);
    console.log(`[STREAM] Found ${allAides.length} aides from Aides Territoires.`);

    const filteredAidesResult = await filterAidesFromAPI(projectContext, keywords, allAides);
    const aidesToRefine = filteredAidesResult.filter(aide => aide.decision === 'à voir');

    console.log(`[refine-and-stream] Début du traitement en streaming pour ${aidesToRefine.length} aides.`);

    // Envoyer un premier message de statut au client
    const initialStatus = {
      type: 'status',
      totalAidesTrouvees: allAides.length,
      aidesAPreselectionner: filteredAidesResult.length,
      aidesSelectionnees: aidesToRefine.map(a => a.title)
    };
    res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);


    // 4. Boucle de traitement, raffinement et streaming (Phase 2)
    for (const aide of aidesToRefine) {
      try {
        // a. Préparer le payload pour N8N
        const n8nProjectContext = { projectId, organisationId, reformulation: projectContext, keywords, key_elements };
        const aideDetails = {
          id: aide.id,
          name: aide.title,
          description: aide.description,
          url: `https://aides-territoires.beta.gouv.fr${aide.url}`
        };

        // b. Appeler le workflow N8N
        const n8nResponse = await refineSingleAide(aideDetails, n8nProjectContext);
        
        // c. Parser la réponse de n8n
        const pertinenceString = n8nResponse?.pertinence;
        if (!pertinenceString || typeof pertinenceString !== 'string') {
          console.log(`[refine-and-stream] Champ 'pertinence' manquant ou invalide dans la réponse N8N pour l'aide "${aide.title}", ignorée.`);
          continue;
        }
        const refinedData = JSON.parse(pertinenceString);

        // d. Condition pour ne traiter que les aides pertinentes
        const pertinence = refinedData.niveau_pertinence || '';
        if (pertinence.toLowerCase().includes('pas pertinente') || pertinence.toLowerCase() === 'faible' || pertinence.toLowerCase() === 'nulle') {
          console.log(`[refine-and-stream] Aide "${aide.title}" jugée non pertinente ("${pertinence}"), ignorée.`);
          continue;
        }

        // e. Préparer l'objet complet à insérer dans la table projects_aides
        const dataToStore = {
          project_id: projectId,
          title: aide.title,
          url: `https://aides-territoires.beta.gouv.fr${aide.url}`,
          porteur_aide: n8nResponse?.response?.body?.porteur_aide || aide.financers?.[0]?.name || 'Non spécifié',
          description_aide: aide.description,
          id_aide_ext: aide.id.toString(),
          niveau_pertinence: refinedData.niveau_pertinence || null,
          score_compatibilite: refinedData.score_compatibilite || null,
          justification: refinedData.justification || null,
          points_positifs: refinedData.points_positifs ? JSON.stringify(refinedData.points_positifs) : null,
          points_negatifs: refinedData.points_negatifs ? JSON.stringify(refinedData.points_negatifs) : null,
          recommandations: refinedData.recommandations || null,
        };

        // f. Insérer la nouvelle ligne et récupérer les données insérées
        const insertedData = await supabaseAdminRequest(
          'POST',
          'projects_aides',
          dataToStore
        );
        
        // g. Envoyer la ligne complète (avec son nouvel UUID) au client
        res.write(`data: ${JSON.stringify(insertedData[0])}\n\n`);

      } catch (aideError) {
        console.error(`[refine-and-stream] Erreur lors du traitement de l'aide ${aide.id}:`, aideError);
        res.write(`data: ${JSON.stringify({ id: aide.id, error: true, message: aideError.message })}\n\n`);
      }
    }

    // 5. Mettre à jour le statut du projet
    await supabaseAdminRequest(
      'PATCH',
      `projects?id=eq.${projectId}`,
      { status: 'aides_identifiees' }
    );
    console.log(`[refine-and-stream] Statut du projet ${projectId} mis à jour.`);

    // 6. Fin du stream
    res.write('event: end\ndata: Stream terminé\n\n');
    console.log('[refine-and-stream] Stream terminé.');
    res.end();

  } catch (error) {
    console.error('[refine-and-stream] Erreur globale dans le processus de streaming:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Une erreur serveur est survenue.' })}\n\n`);
    res.end();
  }
}));

export default router;
