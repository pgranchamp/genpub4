/**
 * Middleware d'authentification avec Supabase
 */
import { supabaseAdmin } from '../utils/supabaseClient.js';

export const supabaseAuthenticate = async (req, res, next) => {
  console.log('[AuthMiddleware] Exécution du middleware supabaseAuthenticate');
  const authHeader = req.headers.authorization;
  console.log('[AuthMiddleware] Header Authorization:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé - Token manquant',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  console.log('[AuthMiddleware] Token extrait:', token);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('[AuthMiddleware] Erreur d\'authentification Supabase:', error);
      return res.status(401).json({
        success: false,
        error: 'Accès non autorisé - Token invalide',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('[AuthMiddleware] Utilisateur authentifié:', user.id);
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur inattendue dans le middleware d\'authentification:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'authentification',
      code: 'SERVER_ERROR'
    });
  }
};
