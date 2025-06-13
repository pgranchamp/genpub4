/**
 * Middleware d'authentification pour les services internes (ex: n8n)
 */

/**
 * Middleware pour vérifier un token de service statique.
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction middleware suivante
 */
export const authenticateService = (req, res, next) => {
  const serviceApiKey = process.env.N8N_SERVICE_API_KEY;
  if (!serviceApiKey) {
    console.error('[AuthService] N8N_SERVICE_API_KEY n\'est pas défini dans les variables d\'environnement.');
    return res.status(500).json({
      success: false,
      error: 'Configuration du serveur incomplète',
      code: 'SERVER_CONFIG_ERROR'
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de service manquant ou mal formaté',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  if (token === serviceApiKey) {
    // Le token est valide, on peut continuer
    next();
  } else {
    // Le token est invalide
    return res.status(403).json({
      success: false,
      error: 'Token de service invalide',
      code: 'FORBIDDEN'
    });
  }
};
