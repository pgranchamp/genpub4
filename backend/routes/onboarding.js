import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import { authenticate } from '../middleware/auth.js';

const N8N_BASE_URL = process.env.N8N_BASE_URL;

/**
 * @route   POST /onboarding/message
 * @desc    Relayer un message au workflow d'onboarding n8n
 * @access  Privé
 */
router.post('/message', authenticate, asyncHandler(async (req, res) => {
  const { workflow, payload } = req.body;

  if (!workflow || !payload) {
    return res.status(400).json({ success: false, error: 'Le nom du workflow et le payload sont requis.' });
  }

  // Utiliser le webhook de production
  const endpoint = 'webhook';
  const webhookUrl = `${N8N_BASE_URL}/${endpoint}/${workflow}`;
  
  console.log(`[Proxy Onboarding] Relais vers: ${webhookUrl}`);

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await n8nResponse.json();
    
    if (!n8nResponse.ok) {
      console.error('[Proxy Onboarding] Erreur de la part de n8n:', responseData);
      return res.status(n8nResponse.status).json({
        success: false,
        error: 'Erreur du service d\'onboarding.',
        details: responseData,
      });
    }

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('[Proxy Onboarding] Erreur de communication avec n8n:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de communiquer avec le service d\'onboarding.',
    });
  }
}));

export default router;
