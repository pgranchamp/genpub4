import express from 'express';
import asyncHandler from 'express-async-handler';
import { supabaseAuthenticate } from '../middleware/supabaseAuth.js';
import { searchAidesTerritoires } from '../services/aidesTerritoiresService.js';
import { selectAidesWithN8N } from '../services/aideSelectionService.js';
import { query as queryNeon } from '../utils/neonClient.js';
import { refineAidesBatch } from '../services/aideRefinementService.js';
import { supabaseAdmin } from '../utils/supabaseClient.js';

const router = express.Router();

// --- JOB DE SÉLECTION (Phase 1) ---

router.post('/start-selection-job', supabaseAuthenticate, asyncHandler(async (req, res) => {
  console.log('[start-selection-job] Received body:', JSON.stringify(req.body, null, 2));
  const { projectContext, keywords, key_elements, id_categories_aides_territoire, organisationType, perimeterCode, projectId } = req.body;

  const jobResult = await queryNeon('INSERT INTO jobs (project_id, status, type) VALUES ($1, $2, $3) RETURNING id', [projectId, 'starting', 'selection']);
  const jobId = jobResult.rows[0].id;
  console.log(`[JOB ${jobId}] Démarrage du job de SÉLECTION pour le projet ${projectId}`);

  await queryNeon('DELETE FROM first_selection_results WHERE job_id = $1', [jobId]);
  console.log(`[JOB ${jobId}] Anciens résultats de sélection nettoyés.`);

  const searchParams = {
    category_ids: id_categories_aides_territoire,
    organization_type_slugs: mapOrganisationTypeToOrganizationTypeSlugs(organisationType),
  };

  if (perimeterCode) {
    // Utiliser uniquement le code département pour une recherche plus fiable
    const departmentCode = perimeterCode.substring(0, 2);
    searchParams.perimeter_codes = [departmentCode];
  }
  let allAides = await searchAidesTerritoires(searchParams);
  console.log(`[JOB ${jobId}] ${allAides.length} aides trouvées sur Aides-Territoires.`);

  // Filtrer pour ne garder que les aides actives
  const activeAides = allAides.filter(aide => aide.is_live === true);
  console.log(`[JOB ${jobId}] ${activeAides.length} aides restantes après filtrage "is_live".`);
  allAides = activeAides;

  const lightweightAides = allAides.map(aide => ({
    id: aide.id,
    url: `https://aides-territoires.beta.gouv.fr${aide.url}`,
    name: aide.name || aide.name_initial,
    raw_data: aide,
  }));

  const chunkSize = 10;
  const aideChunks = [];
  for (let i = 0; i < lightweightAides.length; i += chunkSize) {
    aideChunks.push(lightweightAides.slice(i, i + chunkSize));
  }
  console.log(`[JOB ${jobId}] Découpage en ${aideChunks.length} lots de ${chunkSize} aides.`);

  await queryNeon('UPDATE jobs SET total_aides = $1, total_batches = $2, status = $3 WHERE id = $4', [lightweightAides.length, aideChunks.length, 'processing', jobId]);

  res.status(202).json({
    message: 'Job de sélection démarré. Traitement des lots en cours.',
    jobId: jobId,
    totalAides: lightweightAides.length,
  });

  (async () => {
    try {
      const processingPromises = aideChunks.map((chunk, index) => {
        const batchId = `${jobId}-${index + 1}`;
        return selectAidesWithN8N(jobId, batchId, key_elements, projectContext, keywords, chunk);
      });
      await Promise.all(processingPromises);
      console.log(`[JOB ${jobId}] Traitement de tous les lots de sélection terminé.`);
      
      await queryNeon('UPDATE jobs SET status = $1 WHERE id = $2', ['selection_done', jobId]);
      const { error } = await supabaseAdmin
        .from('projects')
        .update({ status: 'aides_elargies' })
        .eq('id', projectId);
      if (error) throw error;
      console.log(`[JOB ${jobId}] Statut du job mis à jour à "selection_done" et projet à "aides_elargies".`);
    } catch (error) {
      console.error(`[JOB ${jobId}] Erreur majeure lors du traitement des lots de sélection:`, error);
      await queryNeon('UPDATE jobs SET status = $1 WHERE id = $2', ['failed', jobId]);
    }
  })();
}));


// --- JOB DE RAFFINEMENT (Phase 2) ---

router.post('/start-refinement-job', supabaseAuthenticate, asyncHandler(async (req, res) => {
    const { selectionJobId, projectId, projectContext, keywords, key_elements } = req.body;

    console.log(`[REFINEMENT] Démarrage du processus de raffinement pour le projet ${projectId} (basé sur le job de sélection ${selectionJobId})`);

    // 1. Récupérer les aides pertinentes depuis Neon
    const pertinentAidesResult = await queryNeon("SELECT * FROM first_selection_results WHERE job_id = $1 AND decision = 'à voir'", [selectionJobId]);
    const aidesToRefineRaw = pertinentAidesResult.rows;
    console.log(`[REFINEMENT] ${aidesToRefineRaw.length} aides à raffiner.`);

    if (aidesToRefineRaw.length === 0) {
        return res.status(200).json({ message: "Aucune aide à raffiner." });
    }

    // 2. Le contexte est maintenant reçu directement du frontend.

    // 3. Créer un nouveau job pour le raffinement
    const chunkSize = 2;
    const aideChunks = [];
    for (let i = 0; i < aidesToRefineRaw.length; i += chunkSize) {
        aideChunks.push(aidesToRefineRaw.slice(i, i + chunkSize));
    }
    const totalBatches = aideChunks.length;

    const refinementJobResult = await queryNeon('INSERT INTO jobs (project_id, status, type, total_aides, total_batches) VALUES ($1, $2, $3, $4, $5) RETURNING id', [projectId, 'refining', 'refinement', aidesToRefineRaw.length, totalBatches]);
    const refinementJobId = refinementJobResult.rows[0].id;
    
    // 4. Renvoyer la réponse immédiate au frontend
    res.status(202).json({
        message: 'Job de raffinement démarré.',
        refinementJobId: refinementJobId,
    });

    // 5. Lancer le raffinement en arrière-plan
    (async () => {
        try {
            const n8nProjectContext = { 
                projectId, 
                projectContext: projectContext || '', 
                keywords: keywords || [], 
                key_elements: key_elements || [] 
            };
            
            const aidesToRefineFormatted = aidesToRefineRaw.map(aide => ({
                id: aide.aide_id_ext,
                name: aide.aide_title,
                description: aide.raw_data?.description,
                origin_url: aide.aide_url,
                aid_types: aide.raw_data?.aid_types,
                financers: aide.raw_data?.financers,
                raw_data: aide.raw_data,
            }));

            const formattedChunks = [];
            for (let i = 0; i < aidesToRefineFormatted.length; i += chunkSize) {
                formattedChunks.push(aidesToRefineFormatted.slice(i, i + chunkSize));
            }

            console.log(`[REFINEMENT JOB ${refinementJobId}] Envoi de ${totalBatches} lots à n8n.`);
            
            const processingPromises = formattedChunks.map(async (chunk, index) => {
                const batchName = `${refinementJobId}-${index + 1}`;
                const result = await refineAidesBatch(chunk, n8nProjectContext, refinementJobId, batchName);
                if (result && result.status === 'completed') {
                    console.log(`[REFINEMENT JOB ${refinementJobId}] Lot ${batchName} terminé. Incrémentation du compteur.`);
                    await queryNeon('UPDATE jobs SET batches_completed = batches_completed + 1 WHERE id = $1', [refinementJobId]);
                } else {
                    console.error(`[REFINEMENT JOB ${refinementJobId}] Le lot ${batchName} a échoué ou n'a pas renvoyé de statut "completed".`, result);
                }
            });

            await Promise.all(processingPromises);
            console.log(`[REFINEMENT JOB ${refinementJobId}] Traitement de tous les lots terminé.`);

            // Finalisation du job
            const { error } = await supabaseAdmin
              .from('projects')
              .update({ status: 'aides_affinees' })
              .eq('id', projectId);
            if (error) throw error;
            await queryNeon('UPDATE jobs SET status = $1 WHERE id = $2', ['refinement_done', refinementJobId]);
            console.log(`[REFINEMENT JOB ${refinementJobId}] Statut du job mis à jour à "refinement_done" et projet à "aides_affinees".`);

        } catch (error) {
            console.error(`[REFINEMENT JOB ${refinementJobId}] Erreur majeure lors de l'envoi des lots:`, error);
            await queryNeon('UPDATE jobs SET status = $1 WHERE id = $2', ['failed', refinementJobId]);
        }
    })();
}));


// --- ROUTES DE STATUT ET DE RÉSULTATS ---

/**
 * @route   GET /aides/last-selection-job/:projectId
 * @desc    Récupère le dernier job de sélection pour un projet.
 * @access  Privé
 */
router.get('/last-selection-job/:projectId', supabaseAuthenticate, asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const jobResult = await queryNeon(
        "SELECT id FROM jobs WHERE project_id = $1 AND type = 'selection' ORDER BY created_at DESC LIMIT 1",
        [projectId]
    );

    if (jobResult.rows.length > 0) {
        res.json({ jobId: jobResult.rows[0].id });
    } else {
        res.status(404).json({ error: 'Aucun job de sélection trouvé pour ce projet.' });
    }
}));

/**
 * @route   GET /aides/analysis-results/:projectId
 * @desc    Récupère les résultats d'analyse pour un projet.
 * @access  Privé
 */
router.get('/aides/analysis-results/:projectId', supabaseAuthenticate, asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const analysisResults = await queryNeon('SELECT * FROM aide_analyses WHERE project_id = $1 ORDER BY score_compatibilite DESC', [projectId]);
    res.json(analysisResults.rows);
}));


/**
 * @route   GET /aides/job-status/:jobId
 * @desc    Sonde l'état d'un job et gère la synchronisation finale.
 * @access  Privé
 */
router.get('/job-status/:jobId', supabaseAuthenticate, asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    
    const jobResult = await queryNeon('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job non trouvé.' });
    }
    const job = jobResult.rows[0];

    let progress = {};
    let isComplete = ['selection_done', 'refinement_done', 'failed'].includes(job.status);
    let results = [];

    if (job.type === 'selection') {
        const resultsResult = await queryNeon('SELECT * FROM first_selection_results WHERE job_id = $1 ORDER BY created_at ASC', [jobId]);
        results = resultsResult.rows;
        progress = {
            processed_aides: results.length,
            total_aides: job.total_aides || 0,
        };
    } else if (job.type === 'refinement') {
        const REFINEMENT_CHUNK_SIZE = 2; // Doit correspondre à la taille définie dans start-refinement-job
        const processed_aides = (job.batches_completed || 0) * REFINEMENT_CHUNK_SIZE;
        
        progress = {
            processed_aides: Math.min(processed_aides, job.total_aides), // S'assurer de ne pas dépasser le total
            total_aides: job.total_aides || 0,
        };

        // La finalisation est maintenant gérée dans la route start-refinement-job
    }

    res.json({
        jobId,
        isComplete,
        status: job.status,
        progress,
        results, // Rétablir le renvoi des résultats
    });
}));


// --- HELPER ---

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
    case 'particulier': return ['private-person'];
    default: return [];
  }
};

export default router;
