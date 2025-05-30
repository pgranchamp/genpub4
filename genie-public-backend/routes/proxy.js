/**
 * Routes proxy pour les API externes
 * Permet de contourner les problèmes CORS en faisant transiter les requêtes par le backend
 */
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
// Importer fetch depuis node-fetch
const fetch = require('node-fetch').default;
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /proxy/aides-territoires/token
 * @desc    Obtenir un token JWT pour l'API Aides Territoires
 * @access  Privé
 */
router.post('/aides-territoires/token', authenticate, asyncHandler(async (req, res) => {
  try {
    console.log('Proxy: Obtention d\'un token Aides Territoires');
    const response = await fetch('https://aides-territoires.beta.gouv.fr/api/connexion/', {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Proxy: Erreur d'authentification Aides Territoires: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: `Erreur d'authentification Aides Territoires: ${response.status}`
      });
    }
    
    const data = await response.json();
    console.log('Proxy: Token Aides Territoires obtenu avec succès');
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Proxy: Erreur lors de l\'obtention du token Aides Territoires:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires'
    });
  }
}));

/**
 * @route   GET /proxy/aides-territoires/aids
 * @desc    Rechercher des aides via l'API Aides Territoires
 * @access  Privé
 */
router.get('/aides-territoires/aids', authenticate, asyncHandler(async (req, res) => {
  try {
    // Récupérer le token
    console.log('Proxy: Obtention d\'un token pour la recherche d\'aides');
    console.log('Proxy: Clé API utilisée:', process.env.AIDES_TERRITOIRES_API_KEY ? 'Présente (masquée)' : 'Manquante');
    
    let token;
    try {
      const tokenResponse = await fetch('https://aides-territoires.beta.gouv.fr/api/connexion/', {
        method: 'POST',
        headers: {
          'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_API_KEY
        }
      });
      
      const tokenResponseText = await tokenResponse.text();
      console.log('Proxy: Réponse brute de l\'API d\'authentification:', tokenResponseText);
      
      if (!tokenResponse.ok) {
        console.error(`Proxy: Erreur d'authentification Aides Territoires: ${tokenResponse.status}`);
        return res.status(tokenResponse.status).json({
          success: false,
          error: `Erreur d'authentification Aides Territoires: ${tokenResponse.status}`,
          details: tokenResponseText
        });
      }
      
      // Convertir la réponse texte en JSON
      const tokenData = JSON.parse(tokenResponseText);
      token = tokenData.token;
      console.log('Proxy: Token obtenu avec succès');
    } catch (error) {
      console.error('Proxy: Erreur lors de l\'obtention du token:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires',
        details: error.message
      });
    }
    
    // Construire l'URL avec les paramètres de requête
    const url = new URL('https://aides-territoires.beta.gouv.fr/api/aids/');
    
    // Transférer tous les paramètres de requête
    console.log('Proxy: Paramètres reçus:', req.query);

    // Traitement spécifique pour itemsPerPage -> limit
    if (req.query.itemsPerPage) {
      url.searchParams.append('limit', req.query.itemsPerPage);
      delete req.query.itemsPerPage; // Pour ne pas le traiter à nouveau
    }

    // Traitement spécifique pour order_by
    if (req.query.order_by) {
      url.searchParams.append('order_by', req.query.order_by);
      delete req.query.order_by; // Pour ne pas le traiter à nouveau
    }
    
    // Traitement spécial pour category_ids - les envoyer comme paramètres individuels
    // Le nom du paramètre pour l'API Aides Territoires est 'category_ids' (sans crochets pour chaque valeur)
    if (req.query.category_ids) {
      if (Array.isArray(req.query.category_ids)) {
        req.query.category_ids.forEach(id => {
          url.searchParams.append('category_ids', id);
        });
      } else if (typeof req.query.category_ids === 'string') {
        // Si c'est une chaîne, on peut la splitter si elle contient des virgules, ou la passer telle quelle
        const ids = req.query.category_ids.split(',').map(s => s.trim()).filter(s => s);
        ids.forEach(id => {
          url.searchParams.append('category_ids', id);
        });
      }
      delete req.query.category_ids; // Pour ne pas le traiter à nouveau
    }

    // Traitement spécial pour perimeter_codes - les envoyer comme paramètres individuels avec []
    // L'API Aides Territoires attend perimeter_codes[] pour chaque valeur
    if (req.query.perimeter_codes) {
      if (Array.isArray(req.query.perimeter_codes)) {
        req.query.perimeter_codes.forEach(code => {
          url.searchParams.append('perimeter_codes[]', code);
        });
      } else if (typeof req.query.perimeter_codes === 'string') {
         // Si c'est une chaîne, on peut la splitter si elle contient des virgules, ou la passer telle quelle
        const codes = req.query.perimeter_codes.split(',').map(s => s.trim()).filter(s => s);
        codes.forEach(code => {
          url.searchParams.append('perimeter_codes[]', code);
        });
      }
      delete req.query.perimeter_codes; // Pour ne pas le traiter à nouveau
    }
    
    // Traiter les autres paramètres restants
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (Array.isArray(value)) {
        value.forEach(v => {
          url.searchParams.append(key, v);
        });
      } else {
        url.searchParams.append(key, value);
      }
    });
    
    console.log(`Proxy: Appel à l'API Aides-Territoires: ${url.toString()}`);
    
    // Appeler l'API avec le token
    let aidsData;
    try {
      console.log('Proxy: Début de l\'appel à l\'API Aides-Territoires');
      
      // Définir un timeout de 30 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const aidsResponse = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      // Annuler le timeout
      clearTimeout(timeoutId);
      
      console.log('Proxy: Réponse reçue de l\'API Aides-Territoires');
      
      const aidsResponseText = await aidsResponse.text();
      console.log('Proxy: Réponse brute de l\'API Aides:', aidsResponseText.substring(0, 500) + '...');
      
      if (!aidsResponse.ok) {
        console.error(`Proxy: Erreur lors de l'appel à l'API Aides-Territoires: ${aidsResponse.status}`);
        return res.status(aidsResponse.status).json({
          success: false,
          error: `Erreur lors de l'appel à l'API Aides-Territoires: ${aidsResponse.status}`,
          details: aidsResponseText
        });
      }
      
      // Convertir la réponse texte en JSON
      aidsData = JSON.parse(aidsResponseText);
      console.log('Proxy: Données d\'aides récupérées avec succès');
      console.log('Proxy: Nombre d\'aides trouvées:', aidsData.count || 0);
      
      // Vérifier et logger les IDs des aides
      if (aidsData.results && Array.isArray(aidsData.results)) {
        console.log('Proxy: Vérification des IDs des aides:');
        aidsData.results.slice(0, 10).forEach((aide, index) => {
          console.log(`Proxy: Aide #${index} - ID: ${aide.id || 'MANQUANT'}, Nom: ${aide.name || 'Non défini'}`);
        });
        
        // Compter les aides sans ID
        const aidesWithoutId = aidsData.results.filter(aide => !aide.id).length;
        if (aidesWithoutId > 0) {
          console.warn(`Proxy: ATTENTION - ${aidesWithoutId} aides n'ont pas d'ID sur un total de ${aidsData.results.length}`);
        } else {
          console.log(`Proxy: Toutes les aides (${aidsData.results.length}) ont un ID valide`);
        }
      }
    } catch (error) {
      console.error('Proxy: Erreur lors de l\'appel à l\'API Aides:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      data: aidsData
    });
  } catch (error) {
    console.error('Proxy: Erreur lors de la recherche d\'aides:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires'
    });
  }
}));

/**
 * @route   GET /proxy/aides-territoires/backers/:id
 * @desc    Récupérer les informations d'un financeur par son ID
 * @access  Privé
 */
router.get('/aides-territoires/backers/:id', authenticate, asyncHandler(async (req, res) => {
  try {
    // Récupérer le token
    console.log(`Proxy: Obtention d'un token pour récupérer le financeur ${req.params.id}`);
    
    let token;
    try {
      const tokenResponse = await fetch('https://aides-territoires.beta.gouv.fr/api/connexion/', {
        method: 'POST',
        headers: {
          'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_API_KEY
        }
      });
      
      if (!tokenResponse.ok) {
        console.error(`Proxy: Erreur d'authentification Aides Territoires: ${tokenResponse.status}`);
        return res.status(tokenResponse.status).json({
          success: false,
          error: `Erreur d'authentification Aides Territoires: ${tokenResponse.status}`
        });
      }
      
      const tokenData = await tokenResponse.json();
      token = tokenData.token;
      console.log('Proxy: Token obtenu avec succès');
    } catch (error) {
      console.error('Proxy: Erreur lors de l\'obtention du token:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires',
        details: error.message
      });
    }
    
    // Construire l'URL pour récupérer le financeur
    const url = `https://aides-territoires.beta.gouv.fr/api/backers/${req.params.id}`;
    console.log(`Proxy: Appel à l'API Aides-Territoires pour le financeur: ${url}`);
    
    // Appeler l'API avec le token
    try {
      const backerResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!backerResponse.ok) {
        console.error(`Proxy: Erreur lors de l'appel à l'API Aides-Territoires pour le financeur: ${backerResponse.status}`);
        return res.status(backerResponse.status).json({
          success: false,
          error: `Erreur lors de l'appel à l'API Aides-Territoires: ${backerResponse.status}`
        });
      }
      
      const backerData = await backerResponse.json();
      console.log(`Proxy: Données du financeur ${req.params.id} récupérées avec succès:`, backerData.name);
      
      res.json({
        success: true,
        data: backerData
      });
    } catch (error) {
      console.error(`Proxy: Erreur lors de l'appel à l'API Aides-Territoires pour le financeur:`, error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires',
        details: error.message
      });
    }
  } catch (error) {
    console.error(`Proxy: Erreur lors de la récupération du financeur ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion à l\'API Aides Territoires'
    });
  }
}));

module.exports = router;
