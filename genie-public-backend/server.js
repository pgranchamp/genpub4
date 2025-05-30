/**
 * Serveur Express pour le projet Génie Public
 * Connecté à Supabase (PostgreSQL)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth');
const organisationsRoutes = require('./routes/organisations');
const projectsRoutes = require('./routes/projects');
const proxyRoutes = require('./routes/proxy');
const categoriesRoutes = require('./routes/categories');

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
app.use('/auth', authRoutes);
app.use('/organisations', organisationsRoutes);
app.use('/projects', projectsRoutes);
app.use('/proxy', proxyRoutes);
app.use('/categories', categoriesRoutes);

// Route de base
app.get('/', (req, res) => {
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
