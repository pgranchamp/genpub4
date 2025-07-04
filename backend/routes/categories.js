/**
 * Routes pour la gestion des catégories
 */
import express from 'express';
const router = express.Router();
import { supabaseAdmin } from '../utils/supabaseClient.js';
import asyncHandler from 'express-async-handler';

/**
 * @route   GET /categories/aides-territoire
 * @desc    Récupérer tous les groupes et leurs catégories d'aides territoire
 * @access  Privé
 */
router.get('/aides-territoire', asyncHandler(async (req, res) => {
  try {
    console.log('Récupération des groupes et catégories d\'aides depuis Supabase');
    
    // Requête à Supabase pour récupérer les catégories
    const { data: categories, error } = await supabaseAdmin
      .from('categories_aides_territoire')
      .select('id,categorie,groupe');
    
    if (error) throw error;

    if (!categories) {
      console.error('Erreur Supabase lors de la récupération des catégories');
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des catégories'
      });
    }
    
    // Regrouper les catégories par groupe
    const groupesMap = {};
    categories.forEach(cat => {
      if (!groupesMap[cat.groupe]) {
        groupesMap[cat.groupe] = {
          id: cat.id, // Utiliser l'ID de la première catégorie du groupe comme ID de groupe
          groupe: cat.groupe,
          categories: []
        };
      }
      
      groupesMap[cat.groupe].categories.push({
        id: cat.id,
        categorie: cat.categorie
      });
    });
    
    // Convertir l'objet en tableau
    const data = Object.values(groupesMap);
    
    if (!data) {
      console.error('Erreur Supabase lors de la récupération des catégories');
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des catégories'
      });
    }
    
    console.log(`${data.length} groupes avec leurs catégories récupérés`);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des catégories'
    });
  }
}));

export default router;
