/**
 * Routes d'authentification
 */
import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';
import { generateToken } from '../utils/jwt.js';
import { validate, schemas } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeAndStoreKeyElements } from '../services/organisationAnalysisService.js';

const SALT_ROUNDS = 10;

/**
 * @route   POST /signup
 * @desc    Inscription d'un utilisateur et création d'une organisation
 * @access  Public
 */
router.post('/signup', (req, res, next) => {
  // Log du corps de la requête avant la validation
  console.log('Corps de la requête reçu sur /signup:', JSON.stringify(req.body, null, 2));
  // Passer au middleware de validation
  validate(schemas.signupSchema)(req, res, next);
}, asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, organisation } = req.body;
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
      first_name,
      last_name
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

    // 4. Préparer et créer l'organisation
    console.log('Étape 4: Préparation des données de l\'organisation avec géocodage');
    let organisationDataForDb = { ...organisation }; // Copie des données reçues

    const adresseLigne1PourGeocodage = organisation.adresse_ligne1 || '';
    const codePostalPourGeocodage = organisation.code_postal || '';
    const villePourGeocodage = organisation.ville || '';

    const adresseQuery = `${organisation.nom || ''} ${adresseLigne1PourGeocodage} ${codePostalPourGeocodage} ${villePourGeocodage}`.trim().replace(/\s+/g, '+');
    
    let perimeterCode = null;
    if (adresseQuery) {
      try {
        console.log(`Géocodage de l'adresse: ${adresseQuery}`);
        const geoResponse = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresseQuery)}&limit=1`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.features && geoData.features.length > 0) {
            perimeterCode = geoData.features[0].properties.citycode;
            console.log(`Code INSEE (perimeter_code) trouvé: ${perimeterCode}`);
          } else {
            console.warn('Aucun résultat de géocodage pour l\'adresse fournie.');
          }
        } else {
          console.warn(`Erreur de l'API Adresse: ${geoResponse.status}`);
        }
      } catch (geoError) {
        console.error('Erreur lors de l\'appel à l\'API Adresse:', geoError);
      }
    } else {
      console.warn('Aucune information d\'adresse fournie pour l\'organisation, impossible de géocoder.');
    }

    const organisationPourDb = {
      name: organisationDataForDb.name,
      type: organisationDataForDb.type,
      siret: organisationDataForDb.siret,
      website_url: organisationDataForDb.website_url,
      adresse_ligne1: organisationDataForDb.adresse_ligne1, 
      code_postal: organisationDataForDb.code_postal,
      ville: organisationDataForDb.ville,
      perimeter_code: perimeterCode
    };
    
    Object.keys(organisationPourDb).forEach(key => {
      if (organisationPourDb[key] === undefined) {
        delete organisationPourDb[key];
      }
    });

    console.log('Données de l\'organisation à enregistrer (mappées pour la DB):', organisationPourDb);
    
    let organisationId;
    try {
      const newOrganisation = await supabaseAdminRequest('POST', 'organisations', organisationPourDb);
      console.log('Réponse de la création de l\'organisation:', newOrganisation);
      
      if (!newOrganisation || !newOrganisation[0] || !newOrganisation[0].id) {
        await supabaseAdminRequest('DELETE', `users?id=eq.${userId}`);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création de l\'organisation',
          code: 'SERVER_ERROR'
        });
      }
      
      organisationId = newOrganisation[0].id;
      console.log('ID de l\'organisation créée:', organisationId);

      if (organisation && organisation.website_url) {
        console.log(`[AuthSignup] URL de site web fournie: ${organisation.website_url}. Lancement de l'analyse pour l'organisation ${organisationId}.`);
        analyzeAndStoreKeyElements(organisationId, organisation.website_url)
          .catch(err => console.error(`[AuthSignup] Erreur non bloquante lors de l'analyse du site web pour l'organisation ${organisationId}:`, err));
      } else {
        console.log('[AuthSignup] Aucune URL de site web fournie. L\'analyse n\'est pas lancée.');
      }

      console.log('Étape 5: Association de l\'utilisateur à l\'organisation');
      const userOrganisationData = {
        user_id: userId,
        organisation_id: organisationId,
        role: 'admin'
      };

      await supabaseAdminRequest('POST', 'users_organisations', userOrganisationData);
      console.log('Association réussie');

      console.log('Étape 6: Génération du token JWT');
      const token = generateToken({ id: userId, email, first_name, last_name });

      console.log('Étape 7: Envoi de la réponse');
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            email,
            first_name,
            last_name
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
  console.log(`[Login] Tentative de connexion pour l'email: ${email}`);

  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id, email, first_name, last_name, password_hash, created_at',
    email: `eq.${email}`
  });

  const user = users && users.length > 0 ? users[0] : null;

  if (!user) {
    console.warn(`[Login] Échec: Utilisateur non trouvé pour l'email: ${email}`);
    return res.status(401).json({
      success: false,
      error: 'Email ou mot de passe incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }
  
  console.log(`[Login] Utilisateur trouvé: ${user.id}. Hash stocké: ${user.password_hash.substring(0, 10)}...`);
  console.log(`[Login] Mot de passe reçu (longueur): ${password.length}`);

  let isPasswordValid = false;
  try {
    isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log(`[Login] Résultat de bcrypt.compare pour l'utilisateur ${user.id}: ${isPasswordValid}`);
  } catch (compareError) {
    console.error(`[Login] Erreur lors de bcrypt.compare pour l'utilisateur ${user.id}:`, compareError);
    return res.status(500).json({ success: false, error: 'Erreur serveur lors de la vérification du mot de passe' });
  }

  if (!isPasswordValid) {
    console.warn(`[Login] Échec: Mot de passe incorrect pour l'utilisateur ${user.id}`);
    return res.status(401).json({
      success: false,
      error: 'Email ou mot de passe incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }
  
  console.log(`[Login] Connexion réussie pour l'utilisateur ${user.id}`);

  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${user.id}`
  });

  let organisations = [];
  if (userOrganisations && userOrganisations.length > 0) {
    const organisationIds = userOrganisations.map(uo => uo.organisation_id);
    const organisationIdsQuery = `in.(${organisationIds.join(',')})`;
    
    organisations = await supabaseAdminRequest('GET', 'organisations', null, {
      select: '*',
      id: organisationIdsQuery
    });

    organisations = organisations.map(org => {
      const userOrg = userOrganisations.find(uo => uo.organisation_id === org.id);
      return {
        ...org,
        role: userOrg ? userOrg.role : null
      };
    });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
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

  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id,email,first_name,last_name,created_at',
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

  const userOrganisations = await supabaseAdminRequest('GET', 'users_organisations', null, {
    select: 'organisation_id,role',
    user_id: `eq.${userId}`
  });

  let organisations = [];
  if (userOrganisations && userOrganisations.length > 0) {
    const organisationIds = userOrganisations.map(uo => uo.organisation_id);
    const organisationIdsQuery = `in.(${organisationIds.join(',')})`;
    
    organisations = await supabaseAdminRequest('GET', 'organisations', null, {
      select: '*',
      id: organisationIdsQuery
    });

    organisations = organisations.map(org => {
      const userOrg = userOrganisations.find(uo => uo.organisation_id === org.id);
      return {
        ...org,
        role: userOrg ? userOrg.role : null
      };
    });
  }

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

  const users = await supabaseAdminRequest('GET', 'users', null, {
    select: 'id',
    email: `eq.${email}`
  });

  if (!users || users.length === 0) {
    return res.json({
      success: true,
      message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation.'
    });
  }

  const userId = users[0].id;

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetCodeExpires = new Date(Date.now() + 3600000);

  await supabaseAdminRequest('PATCH', `users?id=eq.${userId}`, {
    reset_code: resetCode,
    reset_code_expires: resetCodeExpires.toISOString()
  });

  res.json({
    success: true,
    message: 'Si votre email est enregistré, vous recevrez un code de réinitialisation.',
    reset_code: resetCode
  });
}));

/**
 * @route   POST /reset-password
 * @desc    Réinitialisation du mot de passe avec un code
 * @access  Public
 */
router.post('/reset-password', validate(schemas.resetPasswordSchema), asyncHandler(async (req, res) => {
  const { email, reset_code, new_password } = req.body;

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

  const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

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

export default router;
