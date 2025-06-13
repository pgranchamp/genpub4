import express from 'express';
import { supabaseAdminRequest } from '../utils/supabaseClient.js';
import {
  reformulateProjectInstitutional,
  extractProjectKeywords,
  selectAidCategories,
} from '../services/analysis/projectAnalyzer.js';

const router = express.Router();

// Middleware pour vérifier le Bearer Token
const checkAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('[checkAuth] Token reçu:', token);
  console.log('[checkAuth] Token attendu:', process.env.N8N_SERVICE_API_KEY);

  if (token == null) {
    console.log('[checkAuth] Échec: Token manquant.');
    return res.sendStatus(401); // Unauthorized
  }

  if (token === process.env.N8N_SERVICE_API_KEY) {
    console.log('[checkAuth] Succès: Token valide.');
    next();
  } else {
    console.log('[checkAuth] Échec: Token invalide.');
    return res.sendStatus(403); // Forbidden
  }
};

router.use(checkAuth);

// Route pour la reformulation de projet
router.post('/reformulate', async (req, res) => {
  const { projectDescription, keyElements } = req.body;
  if (!projectDescription || !keyElements) {
    return res.status(400).json({ error: 'Les champs projectDescription et keyElements sont requis.' });
  }
  try {
    const result = await reformulateProjectInstitutional(projectDescription, keyElements);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la reformulation du projet.' });
  }
});

// Route pour l'extraction de mots-clés
router.post('/keywords', async (req, res) => {
  const { projectDescription, keyElements } = req.body;
  if (!projectDescription || !keyElements) {
    return res.status(400).json({ error: 'Les champs projectDescription et keyElements sont requis.' });
  }
  try {
    const result = await extractProjectKeywords(projectDescription, keyElements);
    res.json({ keywords: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'extraction des mots-clés.' });
  }
});

// Route pour la sélection de catégories
router.post('/categories', async (req, res) => {
  const { reformulation, keywords, key_elements } = req.body;
  if (!reformulation || !keywords || !key_elements) {
    return res.status(400).json({ error: 'Les champs reformulation, keywords et key_elements sont requis.' });
  }
  try {
    // Récupérer la liste complète des catégories depuis Supabase
    const categoriesList = await supabaseAdminRequest('GET', 'categories_aides_territoire', null, {
      select: 'id,categorie,groupe'
    });

    if (!categoriesList) {
      throw new Error('Impossible de récupérer la liste des catégories depuis la base de données.');
    }

    // Regrouper les catégories par groupe pour correspondre au format attendu par le service
    const groupesMap = {};
    categoriesList.forEach(cat => {
      if (!groupesMap[cat.groupe]) {
        groupesMap[cat.groupe] = {
          id: cat.id,
          groupe: cat.groupe,
          categories: []
        };
      }
      groupesMap[cat.groupe].categories.push({
        id: cat.id,
        categorie: cat.categorie
      });
    });
    const formattedCategoriesList = Object.values(groupesMap);

    const result = await selectAidCategories(reformulation, keywords, key_elements, formattedCategoriesList);
    res.json({ categories: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la sélection des catégories.' });
  }
});

export default router;
