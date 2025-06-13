# API Génie Public

Backend Express.js pour le projet Génie Public, connecté à Supabase (PostgreSQL).

## 📋 Description

Cette API permet de gérer les utilisateurs, organisations, projets et aides du projet Génie Public. Elle utilise une architecture basée sur des tables de liaison explicites pour gérer les relations entre les entités.

## 🚀 Installation

1. Cloner le dépôt
2. Installer les dépendances

```bash
npm install
```

3. Configurer les variables d'environnement en créant un fichier `.env` à la racine du projet (voir `.env.example`)

```
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service
JWT_SECRET=votre-secret-jwt
PORT=3000
AIDES_TERRITOIRES_API_KEY=votre-clé-api
```

4. Démarrer le serveur

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Pour accéder aux routes protégées, vous devez inclure le token dans l'en-tête de vos requêtes :

```
Authorization: Bearer votre-token-jwt
```

## 📝 Routes disponibles

### Authentification

- `POST /auth/signup` : Inscription d'un utilisateur et création d'une organisation
- `POST /auth/login` : Connexion d'un utilisateur

### Organisations

- `POST /organisations` : Création d'une organisation
- `GET /organisations` : Récupération des organisations de l'utilisateur
- `GET /organisations/:id` : Récupération d'une organisation par son ID

### Projets

- `POST /projects` : Création d'un projet et association à une organisation
- `GET /projects` : Récupération des projets des organisations de l'utilisateur
- `GET /projects/:id` : Récupération d'un projet par son ID
- `GET /projects/:id/aides` : Récupération des aides associées à un projet
- `POST /projects/:id/aides` : Association d'une aide à un projet

## 🗄️ Structure de la base de données

L'API utilise une base de données PostgreSQL avec les tables suivantes :

### Tables principales

- `users` : Utilisateurs du système
- `organisations` : Organisations (collectivités, associations, etc.)
- `projects` : Projets créés par les organisations
- `aides` : Aides disponibles pour les projets
- `project_files` : Fichiers associés aux projets

### Tables de liaison

- `users_organisations` : Association entre utilisateurs et organisations
- `projects_organisations` : Association entre projets et organisations
- `projects_aides` : Association entre projets et aides
- `projects_files` : Association entre projets et fichiers

## 🔧 Architecture

- `/routes` : Définition des routes de l'API
- `/middleware` : Middleware pour l'authentification et la validation
- `/utils` : Utilitaires (client Supabase, gestion JWT)

## 📦 Technologies utilisées

- Express.js : Framework web
- Supabase : Base de données PostgreSQL
- bcrypt : Hachage des mots de passe
- jsonwebtoken : Gestion des tokens JWT
- Joi : Validation des données
- Axios : Requêtes HTTP vers l'API Supabase
