/**
 * Routes pour la gestion des organisations
 */
import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';
import { authenticateService } from '../middleware/authService.js';
import { validate, schemas } from '../middleware/validate.js';

/**
 * @route   POST /organisations
 * @desc    Créer une nouvelle organisation
 * @access  Privé
 */
router.post('/', authenticate, validate(schemas.organisationSchema), asyncHandler(async (req, res) => {
  const { name, type, siret, address } = req.body;
  const userId = req.user.id;

  // 1. Créer l'organisation
  const organisationData = {
    name,
    type: type || null,
    siret: siret || null,
    address: address || null
  };

  const newOrganisation = await supabaseAdminRequest('POST', 'organisations', organisationData);
  
  if (!newOrganisation || !newOrganisation[0] || !newOrganisation[0].id) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'organisation',
      code: 'SERVER_ERROR'
    });
  }

  const organisationId = newOrganisation[0].id;

  // 2. Associer l'utilisateur à l'organisation (table de liaison)
  const userOrganisationData = {
    user_id: userId,
    organisation_id: organisationId,
    role: 'admin' // Rôle par défaut pour le créateur
  };

  await supabaseAdminRequest('POST', 'users_organisations', userOrganisationData);

  // 3. Retourner les informations de l'organisation créée
  res.status(201).json({
    success: true,
    data: {
      id: organisationId,
      name,
      type: type || null,
      siret: siret || null,
      address: address || null,
      created_at: newOrganisation[0].created_at
    }
  });
}));

/**
 * @route   GET /organisations
 * @desc    Récupérer les organisations de l'utilisateur connecté
 * @access  Privé
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Récupérer les associations utilisateur-organisations
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${userId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.json({
      success: true,
      data: []
    });
  }

  // 2. Récupérer les détails des organisations
  const organisationIds = userOrganisations.map(uo => uo.organisation_id);
  const organisationIdsQuery = `in.(${organisationIds.join(',')})`;
  
  const organisations = await supabaseAdminRequest('GET', 'organisations', null, {
    select: '*',
    id: organisationIdsQuery
  });

  // 3. Ajouter le rôle à chaque organisation
  const organisationsWithRole = organisations.map(org => {
    const userOrg = userOrganisations.find(uo => uo.organisation_id === org.id);
    return {
      ...org,
      role: userOrg ? userOrg.role : null
    };
  });

  res.json({
    success: true,
    data: organisationsWithRole
  });
}));

/**
 * @route   GET /organisations/me
 * @desc    Récupérer l'organisation principale de l'utilisateur connecté
 * @access  Privé
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Récupérer la première association utilisateur-organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${userId}`,
    limit: 1
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Aucune organisation associée à cet utilisateur',
      code: 'NO_ORGANISATION_FOUND'
    });
  }

  const { organisation_id, role } = userOrganisations[0];

  // 2. Récupérer les détails complets de l'organisation
  const organisations = await supabaseAdminRequest('GET', 'organisations', null, {
    select: '*',
    id: `eq.${organisation_id}`
  });

  if (!organisations || organisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Organisation non trouvée',
      code: 'NOT_FOUND'
    });
  }

  // 3. Ajouter le rôle de l'utilisateur à l'objet organisation
  const organisation = {
    ...organisations[0],
    role
  };

  res.json({
    success: true,
    data: organisation
  });
}));

/**
 * @route   GET /organisations/:id
 * @desc    Récupérer une organisation par son ID
 * @access  Privé
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const organisationId = req.params.id;
  const userId = req.user.id;

  // 1. Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à cette organisation',
      code: 'FORBIDDEN'
    });
  }

  // 2. Récupérer les détails de l'organisation
  const organisations = await supabaseAdminRequest('GET', 'organisations', null, {
    select: '*',
    id: `eq.${organisationId}`
  });

  if (!organisations || organisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Organisation non trouvée',
      code: 'NOT_FOUND'
    });
  }

  // 3. Ajouter le rôle de l'utilisateur
  const organisation = {
    ...organisations[0],
    role: userOrganisations[0].role
  };

  res.json({
    success: true,
    data: organisation
  });
}));

/**
 * @route   PATCH /organisations/:id
 * @desc    Mettre à jour une organisation par son ID
 * @access  Privé
 */
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const organisationId = req.params.id;
  const userId = req.user.id;
  const { nom, type, adresse, siret } = req.body;

  // 1. Vérifier si l'utilisateur a accès à cette organisation
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'role',
    user_id: `eq.${userId}`,
    organisation_id: `eq.${organisationId}`
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas accès à cette organisation',
      code: 'FORBIDDEN'
    });
  }

  // 2. Vérifier si l'utilisateur a les droits pour modifier l'organisation (admin ou membre)
  const userRole = userOrganisations[0].role;
  if (userRole !== 'admin' && userRole !== 'member') {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas les droits pour modifier cette organisation',
      code: 'FORBIDDEN'
    });
  }

  // 3. Préparer les données à mettre à jour
  const updateData = {};
  if (nom !== undefined) updateData.name = nom;
  if (type !== undefined) updateData.type = type;
  if (adresse !== undefined) updateData.address = adresse;
  if (siret !== undefined) updateData.siret = siret;

  // 4. Mettre à jour l'organisation
  const updatedOrganisation = await supabaseAdminRequest('PATCH', `organisations?id=eq.${organisationId}`, updateData);

  if (!updatedOrganisation || updatedOrganisation.length === 0) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'organisation',
      code: 'SERVER_ERROR'
    });
  }

  // 5. Récupérer les détails mis à jour de l'organisation
  const organisations = await supabaseAdminRequest('GET', 'organisations', null, {
    select: '*',
    id: `eq.${organisationId}`
  });

  if (!organisations || organisations.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Organisation non trouvée après mise à jour',
      code: 'NOT_FOUND'
    });
  }

  // 6. Ajouter le rôle de l'utilisateur
  const organisation = {
    ...organisations[0],
    role: userRole
  };

  res.json({
    success: true,
    data: organisation
  });
}));

// Route de test pour le middleware de service
router.post('/test-service-auth', authenticateService, (req, res) => {
  res.json({ success: true, message: 'Token de service authentifié avec succès.' });
});

/**
 * @route   GET /organisations/me/status
 * @desc    Vérifier le statut de l'analyse de l'organisation de l'utilisateur
 * @access  Privé
 */
router.get('/me/status', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Récupérer l'organisation principale de l'utilisateur
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id',
    user_id: `eq.${userId}`,
    is_default: 'eq.true'
  });

  if (!userOrganisations || userOrganisations.length === 0) {
    return res.status(404).json({ success: false, error: 'Organisation par défaut non trouvée.' });
  }

  const organisationId = userOrganisations[0].organisation_id;

  // Vérifier si les key_elements sont remplis
  const organisations = await supabaseAdminRequest('GET', 'organisations', null, {
    select: 'key_elements',
    id: `eq.${organisationId}`
  });

  if (!organisations || organisations.length === 0) {
    return res.status(404).json({ success: false, error: 'Organisation non trouvée.' });
  }

  const analysisComplete = !!organisations[0].key_elements;

  res.json({ success: true, analysisComplete });
}));

export default router;
