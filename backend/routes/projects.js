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
  const { title, summary, description, organisation_id } = req.body;

  try {
    const dataToInsert = { title, summary, description, status: 'reformule', organisation_id: organisation_id };
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
  const { id } = req.params;

  try {
    // Récupérer uniquement les données du projet
    const project = await supabaseAdminRequest(
      'GET',
      `projects?id=eq.${id}&select=*`
    );

    if (!project || project.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé.' });
    }

    res.json({ success: true, data: project[0] });
  } catch (error) {
    console.error(`Erreur lors de la récupération du projet ${id}:`, error);
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
