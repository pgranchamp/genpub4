import express from 'express';
import process from 'node:process';
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

  try {
    // La logique pour 'project-analyzer' a été déplacée.
    // Cette route ne gère plus que les workflows d'onboarding simples.
    const enrichedPayload = { ...payload };

    const endpoint = 'webhook';
    const webhookUrl = `${N8N_BASE_URL}/${endpoint}/${workflow}`;
    
    console.log(`[Proxy Onboarding] Relais vers: ${webhookUrl}`);

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });

    const responseText = await n8nResponse.text();
    let responseData;

    if (responseText) {
        try {
            responseData = JSON.parse(responseText);
        } catch {
            console.error('[Proxy Onboarding] Réponse non-JSON de n8n:', responseText);
            return res.status(500).json({
                success: false,
                error: 'Réponse invalide du service d\'onboarding (non-JSON).',
                details: responseText,
            });
        }
    } else {
        responseData = {};
    }
    
    if (!n8nResponse.ok) {
      console.error('[Proxy Onboarding] Erreur de n8n:', responseData);
      return res.status(n8nResponse.status).json({
        success: false,
        error: 'Erreur du service d\'onboarding.',
        details: responseData,
      });
    }

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('[Proxy Onboarding] Erreur de communication avec n8n:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Impossible de communiquer avec le service d\'onboarding.',
      details: error.message,
    });
  }
}));

export default router;
