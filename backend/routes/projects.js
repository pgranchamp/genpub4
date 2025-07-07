import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { supabaseAuthenticate } from '../middleware/supabaseAuth.js';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { analyzeProjectWorkflow } from '../services/analysis/projectAnalyzer.js';

/**
 * @route   GET /api/projects
 * @desc    Récupérer tous les projets de l'utilisateur authentifié
 * @access  Privé
 */
router.get('/', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log('[GET /api/projects] Authenticated User ID:', userId);

  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, data: projects || [] });
  } catch (error) {
    console.error(`Erreur lors de la récupération des projets pour l'utilisateur ${userId}:`, error.message);
    res.status(500).json({ success: false, error: `Erreur serveur: ${error.message}` });
  }
}));

/**
 * @route   POST /api/projects/create-and-analyze
 * @desc    Créer un projet, lancer son analyse et le renvoyer.
 * @access  Privé
 */
router.post('/create-and-analyze', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ success: false, error: 'La description est requise.' });
  }

  try {
    // 1. Créer le projet initial
    const initialData = {
      title: `Nouveau projet - ${new Date().toLocaleDateString()}`,
      description: description,
      status: 'en_cours_analyse',
      user_id: userId
    };
    const { data: newProjectData, error: newProjectError } = await supabaseAdmin
      .from('projects')
      .insert(initialData)
      .select();
    
    if (newProjectError) throw newProjectError;
    
    const [newProject] = newProjectData;
    const projectId = newProject.id;

    // 2. Lancer l'analyse (cette fonction gère l'appel n8n et la mise à jour)
    const analyzedProject = await analyzeProjectWorkflow(projectId, userId);

    res.status(201).json({ success: true, data: analyzedProject });

  } catch (error) {
    console.error(`Erreur lors de la création et analyse du projet pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, error: error.message || 'Erreur serveur.' });
  }
}));


/**
 * @route   POST /api/projects
 * @desc    Créer un nouveau projet (Legacy)
 * @access  Privé
 */
router.post('/', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, summary, description } = req.body;

  try {
    // Le statut initial est 'projet_cree'. L'analyse le passera à 'projet_analyse'.
    const dataToInsert = { title, summary, description, status: 'projet_cree', user_id: userId };
    console.log('[POST /api/projects] Attempting to insert data:', JSON.stringify(dataToInsert, null, 2));
    
    // 1. Créer le projet dans la table 'projects'
    const { data: newProject, error } = await supabaseAdmin
      .from('projects')
      .insert(dataToInsert)
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data: newProject[0] });
  } catch (error) {
    console.error(`Erreur lors de la création du projet pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création du projet.' });
  }
}));

/**
 * @route   PATCH /api/projects/:id
 * @desc    Mettre à jour un projet spécifique
 * @access  Privé
 */
router.patch('/:id', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  const userId = req.user.id;
  const { title, reformulation, keywords, id_categories_aides_territoire } = req.body;

  try {
    // Validation des données
    if (title && !title.trim()) {
      return res.status(400).json({ success: false, error: 'Le titre ne peut pas être vide.' });
    }

    // Validation des catégories (limite de 8)
    if (id_categories_aides_territoire) {
      let categoryIds;
      try {
        categoryIds = typeof id_categories_aides_territoire === 'string' 
          ? JSON.parse(id_categories_aides_territoire) 
          : id_categories_aides_territoire;
      } catch {
        return res.status(400).json({ success: false, error: 'Format des catégories invalide.' });
      }

      if (Array.isArray(categoryIds) && categoryIds.length > 8) {
        return res.status(400).json({ success: false, error: 'Maximum 8 catégories autorisées.' });
      }
    }

    // Vérifier que le projet appartient à l'utilisateur
    const { data: existingProjects, error: checkError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId);

    if (checkError) throw checkError;

    if (!existingProjects || existingProjects.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé ou accès non autorisé.' });
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (reformulation !== undefined) updateData.reformulation = reformulation;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (id_categories_aides_territoire !== undefined) updateData.id_categories_aides_territoire = id_categories_aides_territoire;

    // Mettre à jour le projet
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select();

    if (updateError) throw updateError;

    if (!updatedProject || updatedProject.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé après mise à jour.' });
    }

    res.json({ success: true, data: updatedProject[0] });

  } catch (error) {
    console.error(`Erreur lors de la mise à jour du projet ${projectId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la mise à jour du projet.' });
  }
}));

/**
 * @route   GET /api/projects/:id
 * @desc    Récupérer un projet spécifique par son ID
 * @access  Privé
 */
router.get('/:id', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Récupérer les données du projet et vérifier que l'utilisateur y a accès
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId);

    if (projectError) throw projectError;

    if (!projects || projects.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé ou accès non autorisé.' });
    }
    const project = projects[0];

    // 2. Récupérer l'utilisateur et son organisation
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, organisation:organisations(*)')
      .eq('id', userId);

    if (userError) throw userError;

    if (users && users.length > 0 && users[0].organisation) {
      project.organisation = users[0].organisation;
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
router.get('/:projectId/aides', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  try {
    // On ne récupère que les aides jugées pertinentes (en excluant 'Faible' et 'Nulle')
    const { data: aides, error } = await supabaseAdmin
      .from('projects_aides')
      .select('*')
      .eq('project_id', projectId)
      .not('niveau_pertinence', 'in', '("Faible","Nulle")');

    if (error) throw error;

    res.json({ success: true, data: aides });
  } catch (error) {
    console.error(`Erreur lors de la récupération des aides pour le projet ${projectId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}));

export default router;
