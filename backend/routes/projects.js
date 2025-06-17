import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';

/**
 * @route   GET /api/projects
 * @desc    Récupérer tous les projets de l'utilisateur authentifié
 * @access  Privé
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log('[GET /api/projects] Authenticated User ID:', userId);

  try {
    // 1. Récupérer les IDs des projets de l'utilisateur depuis la table de liaison
    console.log(`[GET /api/projects] Fetching project links for user: ${userId}`);
    const projectLinks = await supabaseAdminRequest(
      'GET',
      `projects_users?user_id=eq.${userId}&select=project_id`
    );

    console.log('[GET /api/projects] Found project links:', projectLinks);

    if (!projectLinks || projectLinks.length === 0) {
      console.log('[GET /api/projects] No projects found for this user. Returning empty array.');
      return res.json({ success: true, data: [] });
    }

    const projectIds = projectLinks.map(link => link.project_id);
    console.log('[GET /api/projects] Project IDs to fetch:', projectIds);

    // 2. Récupérer les détails de ces projets
    console.log(`[GET /api/projects] Fetching details for projects: ${projectIds.join(',')}`);
    const projects = await supabaseAdminRequest(
      'GET',
      `projects?id=in.(${projectIds.join(',')})&select=*`
    );

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error(`Erreur lors de la récupération des projets pour l'utilisateur ${userId}:`, error.message);
    // Renvoyer le message d'erreur technique au client pour le débogage
    res.status(500).json({ success: false, error: `Erreur serveur: ${error.message}` });
  }
}));

/**
 * @route   POST /api/projects
 * @desc    Créer un nouveau projet
 * @access  Privé
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, summary, description } = req.body;

  try {
    const dataToInsert = { title, summary, description, status: 'reformule' };
    console.log('[POST /api/projects] Attempting to insert data:', JSON.stringify(dataToInsert, null, 2));
    
    // 1. Créer le projet dans la table 'projects'
    const newProject = await supabaseAdminRequest(
      'POST',
      'projects',
      dataToInsert
    );

    const projectId = newProject[0].id;

    // 2. Lier le projet à l'utilisateur dans la table 'projects_users'
    await supabaseAdminRequest(
      'POST',
      'projects_users',
      { user_id: userId, project_id: projectId }
    );

    res.status(201).json({ success: true, data: newProject[0] });
  } catch (error) {
    console.error(`Erreur lors de la création du projet pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création du projet.' });
  }
}));

/**
 * @route   GET /api/projects/:id
 * @desc    Récupérer un projet spécifique par son ID
 * @access  Privé
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;

  try {
    // 1. Récupérer les données du projet
    const projects = await supabaseAdminRequest(
      'GET',
      `projects?id=eq.${projectId}&select=*`
    );

    if (!projects || projects.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé.' });
    }
    const project = projects[0];

    // 2. Trouver le user_id associé au projet
    const projectUsers = await supabaseAdminRequest(
      'GET',
      `projects_users?project_id=eq.${projectId}&select=user_id`
    );

    if (!projectUsers || projectUsers.length === 0) {
      // Pas d'utilisateur lié, renvoyer le projet sans organisation
      return res.json({ success: true, data: project });
    }
    const userId = projectUsers[0].user_id;

    // 3. Trouver l'organisation_id associé à l'utilisateur
    const userOrganisations = await supabaseAdminRequest(
      'GET',
      `users_organisations?user_id=eq.${userId}&select=organisation_id`
    );

    if (!userOrganisations || userOrganisations.length === 0) {
      // Pas d'organisation liée, renvoyer le projet sans organisation
      return res.json({ success: true, data: project });
    }
    const organisationId = userOrganisations[0].organisation_id;

    // 4. Récupérer les détails de l'organisation
    const organisations = await supabaseAdminRequest(
      'GET',
      `organisations?id=eq.${organisationId}&select=*`
    );

    // 5. Combiner les résultats
    if (organisations && organisations.length > 0) {
      project.organisation = organisations[0];
    }

    res.json({ success: true, data: project });

  } catch (error) {
    console.error(`Erreur lors de la récupération du projet ${projectId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}));


/**
 * @route   GET /api/projects/:projectId/aides
 * @desc    Récupérer les aides enregistrées pour un projet spécifique
 * @access  Privé
 */
router.get('/:projectId/aides', authenticate, asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  try {
    const aides = await supabaseAdminRequest(
      'GET',
      `projects_aides?project_id=eq.${projectId}`
    );

    res.json({ success: true, data: aides });
  } catch (error) {
    console.error(`Erreur lors de la récupération des aides pour le projet ${projectId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}));

export default router;
