/**
 * Middleware de validation des données avec Joi
 */
import Joi from 'joi';

/**
 * Crée un middleware de validation pour un schéma Joi donné
 * @param {Joi.Schema} schema - Schéma Joi pour la validation
 * @param {string} source - Source des données à valider ('body', 'query', 'params')
 * @returns {Function} - Middleware Express
 */
export const validate = (schema, source = 'body') => {
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
  first_name: Joi.string().required().messages({
    'any.required': 'Le prénom est requis'
  }),
  last_name: Joi.string().required().messages({
    'any.required': 'Le nom de famille est requis'
  }),
  organisation: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Le nom de l\'organisation est requis'
    }),
    type: Joi.string().valid(
      'association', 
      'entreprise_privee', 
      'particulier', 
      'agriculteur', 
      'commune', 
      'intercommunalite_pays', 
      'departement', 
      'region', 
      'collectivite_outre_mer', 
      'etablissement_public_etat', 
      'entreprise_publique_locale'
    ).required().messages({
      'any.required': 'Le type d\'organisation est requis',
      'any.only': 'Le type d\'organisation n\'est pas valide'
    }),
    siret: Joi.string().length(14).pattern(/^[0-9]+$/).allow('', null).messages({
      'string.length': 'Le SIRET doit contenir 14 chiffres',
      'string.pattern.base': 'Le SIRET ne doit contenir que des chiffres'
    }),
    website_url: Joi.string().allow('', null),
    adresse_ligne1: Joi.string().required().messages({
      'any.required': 'L\'adresse (ligne 1) de l\'organisation est requise'
    }),
    code_postal: Joi.string().pattern(/^[0-9]{5}$/).required().messages({
      'any.required': 'Le code postal de l\'organisation est requis',
      'string.pattern.base': 'Le code postal doit être composé de 5 chiffres'
    }),
    ville: Joi.string().required().messages({
      'any.required': 'La ville de l\'organisation est requise'
    })
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

export const schemas = {
  signupSchema,
  loginSchema,
  organisationSchema,
  projectSchema,
  projectAideSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  projectFromInviteSchema
};
