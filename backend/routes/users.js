import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { analyzeAndStoreKeyElements } from '../services/organisationAnalysisService.js';

/**
 * @route   POST /api/users/create
 * @desc    Créer un utilisateur et son organisation depuis le backend
 * @access  Public
 */
router.post('/create', asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, organisationData } = req.body;

  // 1. Créer l'utilisateur via l'API d'administration
  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Marquer l'email comme confirmé
    user_metadata: {
      first_name: firstName,
      last_name: lastName
    }
  });

  if (userError) {
    return res.status(400).json({ success: false, error: userError.message });
  }

  // 2. Créer l'organisation
  const { data: newOrgData, error: orgError } = await supabaseAdmin
    .from('organisations')
    .insert(organisationData)
    .select();

  if (orgError) {
    // Rollback: supprimer l'utilisateur si la création de l'orga échoue
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'organisation.' });
  }
  const newOrganisation = newOrgData[0];

  // 3. Lier l'organisation à l'utilisateur dans notre table public.users
  // Le trigger s'est déjà occupé de créer la ligne dans public.users
  const { error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({ organisation_id: newOrganisation.id })
    .eq('id', user.id);

  if (updateUserError) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    await supabaseAdmin.from('organisations').delete().eq('id', newOrganisation.id);
    return res.status(500).json({ success: false, error: 'Erreur lors de la liaison de l\'organisation.' });
  }

  // Lancer l'analyse du site web en arrière-plan
  if (newOrganisation.website_url) {
    analyzeAndStoreKeyElements(newOrganisation.id, newOrganisation.website_url)
      .catch(err => console.error(`Erreur non bloquante lors de l'analyse du site web pour l'organisation ${newOrganisation.id}:`, err));
  }

  res.status(201).json({ success: true, data: { user, organisation: newOrganisation } });
}));

export default router;
