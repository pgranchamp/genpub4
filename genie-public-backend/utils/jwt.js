/**
 * Utilitaire pour la gestion des tokens JWT
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // Durée de validité du token (7 jours)

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - Données utilisateur à inclure dans le token
 * @returns {string} - Token JWT généré
 */
const generateToken = (user) => {
  // Ne pas inclure de données sensibles dans le token
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token JWT à vérifier
 * @returns {Object|null} - Données décodées du token ou null si invalide
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Erreur de vérification du token JWT:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};
