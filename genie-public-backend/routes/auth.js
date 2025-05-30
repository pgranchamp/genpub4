/**
 * Routes d'authentification
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const { supabaseAdminRequest } = require('../utils/supabaseClient');
const { generateToken } = require('../utils/jwt');
const { validate, schemas } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const SALT_ROUNDS = 10;

/**
 * @route   POST /signup
 * @desc    Inscription d'un utilisateur et création d'une organisation
 * @access  Public
 */
router.post('/signup', validate(schemas.signupSchema), asyncHandler(async (req, res) => {
  console.log('Requête d\'inscription reçue avec les données:', JSON.stringify(req.body, null, 2));
  const { email, password, full_name, organisation } = req.body;
  let userId;

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    console.log('Étape 1: Vérification si l\'utilisateur existe déjà');
    const existingUsers = await supabaseAdminRequest('GET', 'users', null, {
      select: 'id',
      email: `eq.${email}`
    });
    console.log('Résultat de la vérification:', existingUsers);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà',
        code: 'USER_EXISTS'
      });
    }

    // 2. Hacher le mot de passe
    console.log('Étape 2: Hachage du mot de passe');
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Créer l'utilisateur
    console.log('Étape 3: Création de l\'utilisateur');
    const userData = {
      email,
      password_hash,
      full_name
    };

    const newUser = await supabaseAdminRequest('POST', 'users', userData);
    console.log('Résultat de la création de l\'utilisateur:', newUser);
    
    if (!newUser || !newUser[0] || !newUser[0].id) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'utilisateur',
        code: 'SERVER_ERROR'
      });
    }

    userId = newUser[0].id;
    console.log('ID de l\'utilisateur créé:', userId);

    // 4. Créer l'organisation
    console.log('Étape 4: Tentative de création de l\'organisation avec les données:', organisation);
    let organisationId;
    try {
      const newOrganisation = await supabaseAdminRequest('POST', 'organisations', organisation);
      console.log('Réponse de la création de l\'organisation:', newOrganisation);
      
      if (!newOrganisation || !newOrganisation[0] || !newOrganisation[0].id) {
        // Supprimer l'utilisateur créé en cas d'échec
        await supabaseAdminRequest('DELETE', `users?id=eq.${userId}`);
        
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création de l\'organisation',
          code: 'SERVER_ERROR'
        });
      }
      
      organisationId = newOrganisation[0].id;
      console.log('ID de l\'organisation créée:', organisationId);

      // 5. Associer l'utilisateur à l'organisation (table de liaison)
      console.log('Étape 5: Association de l\'utilisateur à l\'organisation');
      const userOrganisationData = {
        user_id: userId,
        organisation_id: organisationId,
        role: 'admin' // Rôle par défaut
      };

      await supabaseAdminRequest('POST', 'users_organisations', userOrganisationData);
      console.log('Association réussie');

      // 6. Générer un token JWT
      console.log('Étape 6: Génération du token JWT');
      const token = generateToken({ id: userId, email, full_name });

      // 7. Retourner les informations utilisateur et le token
      console.log('Étape 7: Envoi de la réponse');
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            email,
            full_name
          },
          organisation: {
            id: organisationId,
            ...organisation
          },
          token
        }
      });
    } catch (error) {
      console.error('Erreur détaillée lors de la création de l\'organisation:', error);
      // Supprimer l'utilisateur créé en cas d'échec
      await supabaseAdminRequest('DELETE', `users?id=eq.${userId}`);
      
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'organisation',
        code: 'SERVER_ERROR',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Erreur lors des étapes 1-3:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'utilisateur',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
}));

/**
 * @route   POST /login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
router.post('/login', validate(schemas.loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Récupérer l'utilisateur par email
  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: '*',
    email: `eq.${email}`
  });

  if (!users || users.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Email ou mot de passe incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }

  const user = users[0];

  // 2. Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Email ou mot de passe incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // 3. Récupérer les organisations de l'utilisateur
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${user.id}`
  });

  let organisations = [];
  if (userOrganisations && userOrganisations.length > 0) {
    // Récupérer les détails des organisations
    const organisationIds = userOrganisations.map(uo => uo.organisation_id);
    const organisationIdsQuery = `in.(${organisationIds.join(',')})`;
    
    organisations = await supabaseAdminRequest('GET', 'organisations', null, {
      select: '*',
      id: organisationIdsQuery
    });

    // Ajouter le rôle à chaque organisation
    organisations = organisations.map(org => {
      const userOrg = userOrganisations.find(uo => uo.organisation_id === org.id);
      return {
        ...org,
        role: userOrg ? userOrg.role : null
      };
    });
  }

  // 4. Générer un token JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name
  });

  // 5. Retourner les informations utilisateur, organisations et le token
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at
      },
      organisations,
      token
    }
  });
}));

/**
 * @route   GET /me
 * @desc    Récupérer les informations de l'utilisateur connecté
 * @access  Privé
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Récupérer l'utilisateur par ID
  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id,email,full_name,created_at',
    id: `eq.${userId}`
  });

  if (!users || users.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Utilisateur non trouvé',
      code: 'NOT_FOUND'
    });
  }

  const user = users[0];

  // 2. Récupérer les organisations de l'utilisateur
  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${userId}`
  });

  let organisations = [];
  if (userOrganisations && userOrganisations.length > 0) {
    // Récupérer les détails des organisations
    const organisationIds = userOrganisations.map(uo => uo.organisation_id);
    const organisationIdsQuery = `in.(${organisationIds.join(',')})`;
    
    organisations = await supabaseAdminRequest('GET', 'organisations', null, {
      select: '*',
      id: organisationIdsQuery
    });

    // Ajouter le rôle à chaque organisation
    organisations = organisations.map(org => {
      const userOrg = userOrganisations.find(uo => uo.organisation_id === org.id);
      return {
        ...org,
        role: userOrg ? userOrg.role : null
      };
    });
  }

  // 3. Retourner les informations utilisateur et organisations
  res.json({
    success: true,
    data: {
      user,
      organisations
    }
  });
}));

/**
 * @route   POST /forgot-password
 * @desc    Demande de réinitialisation de mot de passe
 * @access  Public
 */
router.post('/forgot-password', validate(schemas.forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Vérifier si l'utilisateur existe
  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id',
    email: `eq.${email}`
  });

  if (!users || users.length === 0) {
    // Pour des raisons de sécurité, ne pas indiquer si l'email existe ou non
    return res.json({
      success: true,
      message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation.'
    });
  }

  const userId = users[0].id;

  // 2. Générer un code de réinitialisation aléatoire
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetCodeExpires = new Date(Date.now() + 3600000); // 1 heure

  // 3. Stocker le code de réinitialisation dans la base de données
  await supabaseAdminRequest('PATCH', `users?id=eq.${userId}`, {
    reset_code: resetCode,
    reset_code_expires: resetCodeExpires.toISOString()
  });

  // 4. Dans une application réelle, envoyer un email avec le code de réinitialisation
  // Pour le développement, nous retournons le code directement
  res.json({
    success: true,
    message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation.',
    // En production, ne pas inclure le code dans la réponse
    reset_code: resetCode // À supprimer en production
  });
}));

/**
 * @route   POST /reset-password
 * @desc    Réinitialisation du mot de passe avec un code
 * @access  Public
 */
router.post('/reset-password', validate(schemas.resetPasswordSchema), asyncHandler(async (req, res) => {
  const { email, reset_code, new_password } = req.body;

  // 1. Récupérer l'utilisateur par email
  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id,reset_code,reset_code_expires',
    email: `eq.${email}`
  });

  if (!users || users.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Code de réinitialisation invalide ou expiré',
      code: 'INVALID_RESET_CODE'
    });
  }

  const user = users[0];

  // 2. Vérifier si le code de réinitialisation est valide et non expiré
  if (user.reset_code !== reset_code) {
    return res.status(400).json({
      success: false,
      error: 'Code de réinitialisation invalide ou expiré',
      code: 'INVALID_RESET_CODE'
    });
  }

  const resetCodeExpires = new Date(user.reset_code_expires);
  if (resetCodeExpires < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Code de réinitialisation invalide ou expiré',
      code: 'INVALID_RESET_CODE'
    });
  }

  // 3. Hacher le nouveau mot de passe
  const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

  // 4. Mettre à jour le mot de passe et supprimer le code de réinitialisation
  await supabaseAdminRequest('PATCH', `users?id=eq.${user.id}`, {
    password_hash,
    reset_code: null,
    reset_code_expires: null
  });

  res.json({
    success: true,
    message: 'Mot de passe réinitialisé avec succès'
  });
}));

module.exports = router;
