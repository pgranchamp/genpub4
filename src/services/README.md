# Services API

Ce dossier contient les services API pour le frontend React, adaptés pour le backend Express.

## Structure des services

Les services sont organisés en modules spécialisés :

- **httpClient.js** : Client HTTP de base pour les requêtes API avec authentification
- **authService.js** : Services d'authentification (login, signup, etc.)
- **organisationService.js** : Services de gestion des organisations
- **projectService.js** : Services de gestion des projets
- **aidesService.js** : Services de gestion des aides et intégration avec Aides Territoires
- **openaiService.js** : Services d'intégration avec OpenAI pour l'analyse de texte
- **index.js** : Point d'entrée qui exporte toutes les fonctions des services
- **api.js** : Fichier déprécié qui réexporte tout depuis index.js (maintenu pour compatibilité)

## Comment utiliser les services

### Méthode recommandée

Importez les services depuis le point d'entrée `services` :

```javascript
import { login, getProjects, analyserProjetEtAides } from '../services';
```

### Méthode dépréciée (mais toujours supportée)

Importez les services depuis `services/api` :

```javascript
import { login, getProjects, analyserProjetEtAides } from '../services/api';
```

## Fonctions principales

### Authentification

- `login(email, password)` : Connexion utilisateur
- `signup(email, password, full_name, organisation)` : Inscription utilisateur
- `forgotPassword(email)` : Demande de réinitialisation de mot de passe
- `resetPassword(email, reset_code, new_password)` : Réinitialisation de mot de passe
- `getMe()` : Récupération des informations de l'utilisateur connecté

### Organisations

- `createOrganisation(organisationData)` : Création d'une organisation
- `getOrganisations()` : Récupération de toutes les organisations
- `getOrganisation(organisationId)` : Récupération d'une organisation spécifique
- `updateOrganisation(organisationId, data)` : Mise à jour d'une organisation
- `updateUserOrganisation(userId, organisationId)` : Association d'un utilisateur à une organisation

### Projets

- `getProjects()` : Récupération de tous les projets
- `getProject(projectId)` : Récupération d'un projet spécifique
- `createProject(projectData, organisationId)` : Création d'un projet
- `updateProject(projectId, projectData)` : Mise à jour d'un projet
- `createProjectFromInvite(description, organisationId)` : Création d'un projet depuis une invitation
- `uploadProjectFile(projectId, file)` : Upload d'un fichier pour un projet
- `getProjectFiles(projectId)` : Récupération des fichiers d'un projet
- `deleteProjectFile(projectId, fileId)` : Suppression d'un fichier d'un projet

### Aides

- `getProjectAides(projectId)` : Récupération des aides associées à un projet
- `linkAideToProject(projectId, aideData)` : Association d'une aide à un projet
- `searchAidesTerritoires(params)` : Recherche d'aides dans l'API Aides Territoires
- `getBackerInfo(backerId)` : Récupération des informations d'un financeur
- `enrichAideWithBackerInfo(aide)` : Enrichissement d'une aide avec les informations du financeur

### OpenAI

- `generateKeywords(projectDescription)` : Génération de mots-clés à partir d'une description de projet
- `reformulateProject(projectDescription)` : Reformulation d'une description de projet (déprécié)
- `analyserProjetEtAides(project)` : Analyse sémantique d'un projet
- `analyserProjetEtRechercherAides(project)` : Analyse complète d'un projet et recherche d'aides
