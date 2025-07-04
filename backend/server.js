/**
 * Serveur Express pour le projet Génie Public
 * Connecté à Supabase (PostgreSQL)
 */
import 'dotenv/config';
import process from 'node:process';
import express from 'express';
import cors from 'cors';

// Routes
import organisationsRoutes from './routes/organisations.js';
import projectsRoutes from './routes/projects.js';
import usersRoutes from './routes/users.js';
import proxyRoutes from './routes/proxy.js';
import categoriesRoutes from './routes/categories.js';
import onboardingRoutes from './routes/onboarding.js';
import aidesRoutes from './routes/aides.js';

// Configuration
const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging des requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/organisations', organisationsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/onboarding', onboardingRoutes); // Utiliser la nouvelle route
app.use('/api/aides', aidesRoutes);

// Route de base
app.get('/api', (req, res) => {
  res.json({
    message: 'API Génie Public',
    version: '1.0.0',
    status: 'online'
  });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  
  res.status(500).json({
    success: false,
    error: 'Erreur serveur',
    message: err.message,
    code: 'SERVER_ERROR'
  });
});

// Middleware pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    code: 'NOT_FOUND'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
});
