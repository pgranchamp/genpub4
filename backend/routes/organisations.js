/**
 * Routes pour la gestion des organisations
 */
import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { supabaseAuthenticate } from '../middleware/supabaseAuth.js';
import { analyzeAndStoreKeyElements } from '../services/organisationAnalysisService.js';

/**
 * @route   POST /api/organisations/setup
 * @desc    Finaliser l'inscription en créant une organisation et en la liant à l'utilisateur
 * @access  Privé (requiert un token Supabase valide)
 */
router.post('/setup', supabaseAuthenticate, asyncHandler(async (req, res) => {
  console.log('[/api/organisations/setup] Requête reçue');
  const { userId, organisation } = req.body;
  console.log('[/api/organisations/setup] Body:', req.body);
  const authUserId = req.user.id;

  // Sécurité : Vérifier que l'ID utilisateur de la requête correspond à celui du token
  if (userId !== authUserId) {
    return res.status(403).json({ success: false, error: 'Interdit. L\'ID utilisateur ne correspond pas au token.' });
  }

  try {
    // 1. Créer l'organisation
    const { data: newOrganisationData, error: orgError } = await supabaseAdmin
      .from('organisations')
      .insert(organisation)
      .select();

    if (orgError) throw orgError;
    const newOrganisation = newOrganisationData[0];

    // 2. Lier l'organisation à l'utilisateur
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ organisation_id: newOrganisation.id })
      .eq('id', userId);

    if (userUpdateError) {
      // Rollback: supprimer l'organisation si la liaison échoue
      await supabaseAdmin.from('organisations').delete().eq('id', newOrganisation.id);
      throw userUpdateError;
    }
    
    // Lancer l'analyse du site web en arrière-plan
    if (newOrganisation.website_url) {
      analyzeAndStoreKeyElements(newOrganisation.id, newOrganisation.website_url)
        .catch(err => console.error(`Erreur non bloquante lors de l'analyse du site web pour l'organisation ${newOrganisation.id}:`, err));
    }

    res.status(201).json({ success: true, data: newOrganisation });

  } catch (error) {
    console.error(`Erreur lors de la configuration de l'organisation pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création de l\'organisation.' });
  }
}));

/**
 * @route   GET /api/organisations/me
 * @desc    Récupérer l'organisation de l'utilisateur connecté
 * @access  Privé
 */
router.get('/me', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('organisation_id')
    .eq('id', userId)
    .single();

  if (userError || !user || !user.organisation_id) {
    return res.status(404).json({ success: false, error: 'Organisation non trouvée pour cet utilisateur.' });
  }

  const { data: organisation, error: orgError } = await supabaseAdmin
    .from('organisations')
    .select('*')
    .eq('id', user.organisation_id)
    .single();

  if (orgError) throw orgError;

  res.json({ success: true, data: organisation });
}));

/**
 * @route   PATCH /api/organisations/:id
 * @desc    Mettre à jour une organisation
 * @access  Privé (seul un membre de l'organisation peut la modifier)
 */
router.patch('/:id', supabaseAuthenticate, asyncHandler(async (req, res) => {
  const organisationId = req.params.id;
  const userId = req.user.id;
  const updateData = req.body;

  // 1. Vérifier que l'utilisateur appartient bien à l'organisation qu'il tente de modifier
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('organisation_id')
    .eq('id', userId)
    .single();

  if (userError || user.organisation_id !== organisationId) {
    return res.status(403).json({ success: false, error: 'Accès interdit. Vous n\'appartenez pas à cette organisation.' });
  }

  // 2. Mettre à jour l'organisation
  const { data: updatedOrganisation, error: updateError } = await supabaseAdmin
    .from('organisations')
    .update(updateData)
    .eq('id', organisationId)
    .select();

  if (updateError) throw updateError;

  res.json({ success: true, data: updatedOrganisation[0] });
}));

export default router;
