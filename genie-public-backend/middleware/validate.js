/**
 * Middleware de validation des données avec Joi
 */
const Joi = require('joi');

/**
 * Crée un middleware de validation pour un schéma Joi donné
 * @param {Joi.Schema} schema - Schéma Joi pour la validation
 * @param {string} source - Source des données à valider ('body', 'query', 'params')
 * @returns {Function} - Middleware Express
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errorDetails,
        code: 'BAD_REQUEST'
      });
    }

    // Remplacer les données validées
    req[source] = value;
    next();
  };
};

// Schémas de validation communs

/**
 * Schéma de validation pour l'inscription
 */
const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'L\'email doit être valide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
    'any.required': 'Le mot de passe est requis'
  }),
  full_name: Joi.string().required().messages({
    'any.required': 'Le nom complet est requis'
  }),
  organisation: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Le nom de l\'organisation est requis'
    }),
    type: Joi.string().allow('', null),
    siret: Joi.string().allow('', null),
    address: Joi.string().allow('', null)
  }).required().messages({
    'any.required': 'Les informations de l\'organisation sont requises'
  })
});

/**
 * Schéma de validation pour la connexion
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'L\'email doit être valide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est requis'
  })
});

/**
 * Schéma de validation pour la création d'une organisation
 */
const organisationSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Le nom de l\'organisation est requis'
  }),
  type: Joi.string().allow('', null),
  siret: Joi.string().allow('', null),
  address: Joi.string().allow('', null)
});

/**
 * Schéma de validation pour la création d'un projet
 */
const projectSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Le titre du projet est requis'
  }),
  summary: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  organisation_id: Joi.string().required().messages({
    'any.required': 'L\'ID de l\'organisation est requis'
  })
});

/**
 * Schéma de validation pour l'association d'une aide à un projet
 */
const projectAideSchema = Joi.object({
  aide_id: Joi.string().required().messages({
    'any.required': 'L\'ID de l\'aide est requis'
  }),
  status: Joi.string().allow('', null),
  notes: Joi.string().allow('', null)
});

/**
 * Schéma de validation pour la demande de réinitialisation de mot de passe
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'L\'email doit être valide',
    'any.required': 'L\'email est requis'
  })
});

/**
 * Schéma de validation pour la réinitialisation de mot de passe
 */
const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'L\'email doit être valide',
    'any.required': 'L\'email est requis'
  }),
  reset_code: Joi.string().required().messages({
    'any.required': 'Le code de réinitialisation est requis'
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'Le nouveau mot de passe doit contenir au moins 8 caractères',
    'any.required': 'Le nouveau mot de passe est requis'
  })
});

/**
 * Schéma de validation pour la création d'un projet à partir d'une invite
 */
const projectFromInviteSchema = Joi.object({
  description: Joi.string().required().messages({
    'any.required': 'La description du projet est requise'
  }),
  organisation_id: Joi.string().required().messages({
    'any.required': 'L\'ID de l\'organisation est requis'
  })
});

module.exports = {
  validate,
  schemas: {
    signupSchema,
    loginSchema,
    organisationSchema,
    projectSchema,
    projectAideSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    projectFromInviteSchema
  }
};
