/**
 * Middleware d'authentification
 */
const { verifyToken } = require('../utils/jwt');

/**
 * Middleware pour vérifier l'authentification via JWT
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const authenticate = (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Accès non autorisé - Token manquant',
        code: 'UNAUTHORIZED'
      });
    }

    // Extraire le token (supprimer "Bearer ")
    const token = authHeader.split(' ')[1];
    
    // Vérifier et décoder le token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Accès non autorisé - Token invalide',
        code: 'UNAUTHORIZED'
      });
    }

    // Ajouter les données utilisateur décodées à l'objet requête
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé',
      code: 'UNAUTHORIZED'
    });
  }
};

module.exports = {
  authenticate
};
