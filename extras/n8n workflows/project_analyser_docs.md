# Descriptif sommaire - Workflow Project_Analyser

## Vue d'ensemble
Ce workflow analyse automatiquement une description de projet brute et génère trois éléments clés pour faciliter la recherche d'aides publiques : une reformulation professionnelle, des mots-clés pertinents et une sélection de catégories d'aides adaptées.

## Fonctionnalité principale
- **Entrée** : Description de projet + informations organisation
- **Traitement** : Analyse IA multi-étapes (reformulation → mots-clés → catégories)
- **Sortie** : Package complet pour recherche d'aides publiques

## Endpoints
- **Webhook** : `/project-analyzer` (POST)
- **Chat** : Interface conversationnelle intégrée

## Bénéfices
- Professionnalisation automatique des descriptions
- Identification précise des mots-clés administratifs
- Mapping intelligent vers les catégories Aides-Territoires
- Gain de temps significatif dans la préparation des demandes

---

# Documentation technique - Project_Analyser

## Architecture du workflow

### 1. Sources d'entrée multiples
- **Webhook Trigger** : `/project-analyzer` pour intégration API
- **Chat Input** : Interface conversationnelle pour tests/usage direct
- **Parser universel** : Gestion automatique des différents formats d'entrée

### 2. Pipeline d'analyse IA (3 étapes)

#### Étape 1 : Agent Reformule
- **Modèle** : GPT-4o-latest
- **Fonction** : Reformulation professionnelle et institutionnelle
- **Sortie** : Titre accrocheur + description administrative

#### Étape 2 : Agent Keywords
- **Modèle** : GPT-4o-latest
- **Fonction** : Extraction de 8 mots-clés administratifs
- **Ciblage** : Thématiques, publics cibles, actions concrètes

#### Étape 3 : Agent Categories
- **Modèle** : GPT-4
- **Fonction** : Sélection de 3-7 catégories Aides-Territoires
- **Base de données** : Supabase (table `categories_aides_territoire`)
- **Logique** : Classement par pertinence décroissante

### 3. Intégration Supabase
- **Table** : `categories_aides_territoire`
- **Fonction** : Tool pour l'agent de catégorisation
- **Usage** : Mapping intelligent projet → catégories d'aides

### 4. Format de sortie
```json
{
  "categories": [104, 113, 107, 120, 118],
  "keywords": [
    "inclusion numérique",
    "cohésion sociale",
    "jeunes en insertion",
    "ateliers de formation",
    "développement durable",
    "création de lien social",
    "territoire rural",
    "innovation sociale"
  ],
  "reformulation": {
    "title": "Titre professionnel du projet",
    "reformulation": "Description reformulée en langage administratif"
  }
}
```

## Flux de données

### Entrée attendue
```json
{
  "projectDescription": "Description brute du projet",
  "organisationKeyElements": "Informations clés sur l'organisation"
}
```

### Pipeline de traitement
1. **UniverselParse** → Normalisation des données d'entrée
2. **Agent Reformule** → Professionnalisation du texte
3. **Agent Keywords** → Extraction de mots-clés (basé sur reformulation)
4. **Agent Categories** → Sélection catégories (basé sur reformulation + mots-clés + Supabase)
5. **toJSON** → Assemblage final des résultats

## Utilisation

### Via Webhook
```bash
POST /project-analyzer
Content-Type: application/json

{
  "projectDescription": "Notre association souhaite...",
  "organisationKeyElements": "Association loi 1901..."
}
```

### Via Chat
Interface conversationnelle pour tests et usage interactif.

## Points techniques clés
- **Parser universel** : Gestion robuste des formats d'entrée variés
- **Agents IA spécialisés** : Chaque étape optimisée pour sa fonction
- **Base Supabase** : Référentiel à jour des catégories Aides-Territoires
- **Gestion d'erreurs** : Validation et fallbacks à chaque étape