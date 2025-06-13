import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import { authenticate } from '../middleware/auth.js';
import { searchAidesTerritoires } from '../services/aidesTerritoiresService.js';
import { filterAidesFromAPI } from '../services/analysis/projectAnalyzer.js'; // Assurez-vous que cette fonction est bien dans ce fichier

/**
 * @route   POST /aides/search-and-filter
 * @desc    Rechercher et filtrer les aides en une seule étape
 * @access  Privé
 */
router.post('/search-and-filter', authenticate, asyncHandler(async (req, res) => {
  const { projectContext, keywords, key_elements, id_categories_aides_territoire, organisationType, perimeterCode } = req.body;

  if (!projectContext || !keywords || !key_elements || !id_categories_aides_territoire) {
    return res.status(400).json({ error: 'Les champs projectContext, keywords, key_elements et id_categories_aides_territoire sont requis.' });
  }

  const mapOrganisationTypeToOrganizationTypeSlugs = (orgType) => {
    const lowerOrgType = orgType?.toLowerCase();
    switch (lowerOrgType) {
      case 'association': return ['association'];
      case 'entreprise':
      case 'entreprise_privee': return ['private-sector'];
      case 'commune': return ['commune'];
      case 'epci': return ['epci'];
      case 'departement': return ['department'];
      case 'region': return ['region'];
      default: return [];
    }
  };

  try {
    // 1. Construire les paramètres pour l'API Aides-Territoires
    const searchParams = {
      category_ids: id_categories_aides_territoire,
    };

    if (organisationType) {
      searchParams.organization_type_slugs = mapOrganisationTypeToOrganizationTypeSlugs(organisationType);
    }

    if (perimeterCode) {
      searchParams.perimeter_codes = [perimeterCode];
    }

    // 2. Récupérer les aides
    const allAides = await searchAidesTerritoires(searchParams);

    // 3. Filtrer les aides avec OpenAI (en utilisant la fonction existante)
    // Note: filterAidesFromAPI doit être adaptée pour ne pas dépendre du frontend
    const filteredAides = await filterAidesFromAPI(projectContext, keywords, allAides);

    res.json({ success: true, data: filteredAides });

  } catch (error) {
    console.error('Erreur dans /search-and-filter:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recherche et du filtrage des aides.' });
  }
}));

export default router;
