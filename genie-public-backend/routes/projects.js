/**
 * Routes pour la gestion des projets
 */
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { supabaseAdminRequest } = require('../utils/supabaseClient');
const { processUserPrompt } = require('../utils/openaiClient');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * @route   POST /projects
 * @desc    Créer un nouveau projet et l'associer à une organisation
 * @access  Privé
 */
router.post('/', authenticate, validate(schemas.projectSchema), asyncHandler(async (req, res) => {
  const { title, summary, description, organisation_id } = req.body;
  const userId = req.user.id;

  // 1. Vérifier si l'utilisateur a accès à l'organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisation_id}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à cette organisation',
      code: 'FORBIDDEN'
    });
  }

  // 2. Créer le projet
  const projectData = {
    title,
    summary: summary || null,
    description: description || null
  };

  const newProject = await supabaseAdminRequest('POST', 'projects', projectData);
  
  if (!newProject || !newProject[0] || !newProject[0].id) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du projet',
      code: 'SERVER_ERROR'
    });
  }

  const projectId = newProject[0].id;

  // 3. Associer le projet à l'organisation (table de liaison)
  const projectOrganisationData = {
    project_id: projectId,
    organisation_id
  };

  await supabaseAdminRequest('POST', 'projects_organisations', projectOrganisationData);

  // 4. Retourner les informations du projet créé
  res.status(201).json({
    success: true,
    data: {
      id: projectId,
      title,
      summary: summary || null,
      description: description || null,
      created_at: newProject[0].created_at,
      organisation_id
    }
  });
}));

/**
 * @route   GET /projects
 * @desc    Récupérer les projets des organisations de l'utilisateur
 * @access  Privé
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Récupérer les organisations de l'utilisateur
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id',
    user_id: `eq.${userId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.json({
      success: true,
      data: []
    });
  }

  const organisationIds = userOrganisations.map(uo => uo.organisation_id);

  // 2. Récupérer les projets associés à ces organisations
  let allProjects = [];
  
  for (const orgId of organisationIds) {
    // Récupérer les projets liés à cette organisation
    const projectsOrganisations = await supabaseAdminRequest('GET', 'projects_organisations', null, {
      select: 'project_id',
      organisation_id: `eq.${orgId}`
    });
    
    if (projectsOrganisations && projectsOrganisations.length > 0) {
      const projectIds = projectsOrganisations.map(po => po.project_id);
      const projectIdsQuery = `in.(${projectIds.join(',')})`;
      
      const projects = await supabaseAdminRequest('GET', 'projects', null, {
        select: '*',
        id: projectIdsQuery
      });
      
      // Ajouter l'ID de l'organisation à chaque projet
      const projectsWithOrg = projects.map(project => ({
        ...project,
        organisation_id: orgId
      }));
      
      allProjects = [...allProjects, ...projectsWithOrg];
    }
  }

  res.json({
    success: true,
    data: allProjects
  });
}));

/**
 * @route   GET /projects/:id
 * @desc    Récupérer un projet par son ID
 * @access  Privé
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  // 1. Récupérer le projet
  const projects = await supabaseAdminRequest('GET', 'projects', null, {
    select: '*',
    id: `eq.${projectId}`
  });

  if (!projects || projects.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Projet non trouvé',
      code: 'NOT_FOUND'
    });
  }

  const project = projects[0];

  // 2. Récupérer l'organisation associée au projet
  const projectsOrganisations = await supabaseAdminRequest('GET', 'projects_organisations', null, {
    select: 'organisation_id',
    project_id: `eq.${projectId}`
  });

  if (!projectsOrganisations || projectsOrganisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Association projet-organisation non trouvée',
      code: 'NOT_FOUND'
    });
  }

  const organisationId = projectsOrganisations[0].organisation_id;

  // 3. Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à ce projet',
      code: 'FORBIDDEN'
    });
  }

  // 4. Retourner le projet avec l'ID de l'organisation
  const projectWithOrg = {
    ...project,
    organisation_id: organisationId
  };

  res.json({
    success: true,
    data: projectWithOrg
  });
}));

/**
 * @route   PATCH /projects/:id
 * @desc    Mettre à jour un projet
 * @access  Privé
 */
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const updateData = req.body;

  // 1. Récupérer l'organisation associée au projet
  const projectsOrganisations = await supabaseAdminRequest('GET', 'projects_organisations', null, {
    select: 'organisation_id',
    project_id: `eq.${projectId}`
  });

  if (!projectsOrganisations || projectsOrganisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Projet non trouvé',
      code: 'NOT_FOUND'
    });
  }

  const organisationId = projectsOrganisations[0].organisation_id;

  // 2. Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à ce projet',
      code: 'FORBIDDEN'
    });
  }

  // 3. Mettre à jour le projet
  await supabaseAdminRequest('PATCH', `projects?id=eq.${projectId}`, updateData);

  // 4. Récupérer le projet mis à jour
  const updatedProjects = await supabaseAdminRequest('GET', 'projects', null, {
    select: '*',
    id: `eq.${projectId}`
  });

  if (!updatedProjects || updatedProjects.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Projet non trouvé après mise à jour',
      code: 'NOT_FOUND'
    });
  }

  // 5. Retourner le projet mis à jour avec l'ID de l'organisation
  const updatedProjectWithOrg = {
    ...updatedProjects[0],
    organisation_id: organisationId
  };

  res.json({
    success: true,
    data: updatedProjectWithOrg
  });
}));

/**
 * @route   GET /projects/:id/aides
 * @desc    Récupérer les aides associées à un projet
 * @access  Privé
 */
router.get('/:id/aides', authenticate, asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  // 1. Vérifier si l'utilisateur a accès au projet
  // Récupérer l'organisation associée au projet
  const projectsOrganisations = await supabaseAdminRequest('GET', 'projects_organisations', null, {
    select: 'organisation_id',
    project_id: `eq.${projectId}`
  });

  if (!projectsOrganisations || projectsOrganisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Projet non trouvé',
      code: 'NOT_FOUND'
    });
  }

  const organisationId = projectsOrganisations[0].organisation_id;

  // Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à ce projet',
      code: 'FORBIDDEN'
    });
  }

  // 2. Récupérer les associations projet-aides
  const projectsAides = await supabaseAdminRequest('GET', 'projects_aides', null, {
    select: 'aide_id,status,notes,updated_at',
    project_id: `eq.${projectId}`
  });

  if (!projectsAides || projectsAides.length === 0) {
    return res.json({
      success: true,
      data: []
    });
  }

  // 3. Récupérer les détails des aides
  const aideIds = projectsAides.map(pa => pa.aide_id);
  const aideIdsQuery = `in.(${aideIds.join(',')})`;
  
  const aides = await supabaseAdminRequest('GET', 'aides', null, {
    select: '*',
    id: aideIdsQuery
  });

  // 4. Combiner les informations des aides avec leur statut dans le projet
  const aidesWithStatus = aides.map(aide => {
    const projectAide = projectsAides.find(pa => pa.aide_id === aide.id);
    return {
      ...aide,
      status: projectAide ? projectAide.status : null,
      notes: projectAide ? projectAide.notes : null,
      updated_at: projectAide ? projectAide.updated_at : null
    };
  });

  res.json({
    success: true,
    data: aidesWithStatus
  });
}));

/**
 * @route   POST /projects/from-invite
 * @desc    Créer un projet à partir d'une description libre (invite)
 * @access  Privé
 */
router.post('/from-invite', authenticate, validate(schemas.projectFromInviteSchema), asyncHandler(async (req, res) => {
  const { description, organisation_id } = req.body;
  const userId = req.user.id;

  // 1. Vérifier si l'utilisateur a accès à l'organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisation_id}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à cette organisation',
      code: 'FORBIDDEN'
    });
  }

  try {
    // 2. Appeler OpenAI pour traiter la description
    console.log('Traitement de la description avec OpenAI...');
    const openaiResponse = await processUserPrompt(description);
    console.log('Réponse OpenAI reçue:', openaiResponse);

    // 3. Créer le projet avec les données générées par OpenAI
    const projectData = {
      title: openaiResponse.title,
      summary: openaiResponse.summary,
      description: openaiResponse.description
    };

    const newProject = await supabaseAdminRequest('POST', 'projects', projectData);
    
    if (!newProject || !newProject[0] || !newProject[0].id) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la création du projet',
        code: 'SERVER_ERROR'
      });
    }

    const projectId = newProject[0].id;

    // 4. Associer le projet à l'organisation (table de liaison)
    const projectOrganisationData = {
      project_id: projectId,
      organisation_id
    };

    await supabaseAdminRequest('POST', 'projects_organisations', projectOrganisationData);

    // 5. Retourner les informations du projet créé avec les mots-clés
    res.status(201).json({
      success: true,
      data: {
        id: projectId,
        title: openaiResponse.title,
        summary: openaiResponse.summary,
        description: openaiResponse.description,
        keywords: openaiResponse.keywords,
        created_at: newProject[0].created_at,
        organisation_id
      }
    });
  } catch (error) {
    console.error('Erreur lors du traitement de l\'invite:', error);
    return res.status(500).json({
      success: false,
      error: `Erreur lors du traitement de l'invite: ${error.message}`,
      code: 'SERVER_ERROR'
    });
  }
}));

/**
 * @route   POST /projects/:id/aides
 * @desc    Associer une aide à un projet
 * @access  Privé
 */
router.post('/:id/aides', authenticate, validate(schemas.projectAideSchema), asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const { aide_id, status, notes } = req.body;
  const userId = req.user.id;

  // 1. Vérifier si l'utilisateur a accès au projet
  // Récupérer l'organisation associée au projet
  const projectsOrganisations = await supabaseAdminRequest('GET', 'projects_organisations', null, {
    select: 'organisation_id',
    project_id: `eq.${projectId}`
  });

  if (!projectsOrganisations || projectsOrganisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Projet non trouvé',
      code: 'NOT_FOUND'
    });
  }

  const organisationId = projectsOrganisations[0].organisation_id;

  // Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à ce projet',
      code: 'FORBIDDEN'
    });
  }

  // 2. Vérifier si l'aide existe
  const aides = await supabaseAdminRequest('GET', 'aides', null, {
    select: 'id',
    id: `eq.${aide_id}`
  });

  if (!aides || aides.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Aide non trouvée',
      code: 'NOT_FOUND'
    });
  }

  // 3. Vérifier si l'association existe déjà
  const existingProjectsAides = await supabaseAdminRequest('GET', 'projects_aides', null, {
    select: 'id',
    project_id: `eq.${projectId}`,
    aide_id: `eq.${aide_id}`
  });

  if (existingProjectsAides && existingProjectsAides.length > 0) {
    // Mettre à jour l'association existante
    const updateData = {
      status: status || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    await supabaseAdminRequest('PATCH', `projects_aides?id=eq.${existingProjectsAides[0].id}`, updateData);

    return res.json({
      success: true,
      data: {
        project_id: projectId,
        aide_id,
        status: status || null,
        notes: notes || null,
        updated_at: updateData.updated_at
      }
    });
  }

  // 4. Créer l'association projet-aide
  const projectAideData = {
    project_id: projectId,
    aide_id,
    status: status || null,
    notes: notes || null
  };

  const newProjectAide = await supabaseAdminRequest('POST', 'projects_aides', projectAideData);

  if (!newProjectAide || !newProjectAide[0]) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'association du projet à l\'aide',
      code: 'SERVER_ERROR'
    });
  }

  res.status(201).json({
    success: true,
    data: newProjectAide[0]
  });
}));

module.exports = router;
