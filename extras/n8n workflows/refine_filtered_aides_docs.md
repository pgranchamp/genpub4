# Descriptif sommaire - Workflow refineFilteredAides

## Vue d'ensemble
Ce workflow effectue une analyse approfondie de la pertinence d'une aide publique spécifique par rapport à un projet donné. Il récupère et analyse le contenu détaillé de l'aide pour fournir une évaluation précise et argumentée. Il est actuellement paramétré pour traiter précisement le format de Aides Territoires

## Fonctionnalité principale
- **Entrée** : Détails aide + contexte projet
- **Traitement** : Scraping intelligent + analyse IA de pertinence
- **Sortie** : Score de compatibilité avec justification détaillée

## Endpoints
- **Webhook** : `/refineFilteredAides` (POST)
- **Chat** : Interface conversationnelle pour tests

## Bénéfices
- Analyse fine de chaque aide vs projet
- Scraping multi-format (HTML, PDF)
- Scoring standardisé (0-100)
- Recommandations actionables pour améliorer la compatibilité

---

# Documentation technique - refineFilteredAides

## Architecture du workflow

### 1. Sources d'entrée multiples
- **Webhook Trigger** : `/refineFilteredAides` pour intégration API
- **Chat Input** : Interface conversationnelle pour tests
- **Parser universel** : Normalisation automatique des formats d'entrée

### 2. Pipeline de traitement intelligent

#### Étape 1 : Récupération des données de l'aide
- **HTTP Request** : Scraping de la page principale de l'aide
- **Parser structuré** : Extraction de 17 champs clés (titre, porteur, description, critères, etc.)
- **Gestion d'erreurs** : Fallbacks et patterns multiples pour robustesse

#### Étape 2 : Enrichissement conditionnel (Switch)
Le workflow décide automatiquement du traitement selon l'URL "plus d'infos" :

- **Si URL = .pdf/.PDF** → `Extract from File` (extraction PDF)
- **Si URL vide** → Passage direct à l'IA
- **Si URL HTTP** → `URL_plus_info` (scraping page externe + parser généraliste)

#### Étape 3 : Analyse IA de pertinence
- **Modèle** : GPT-4o-latest (température 0.1 pour cohérence)
- **Format forcé** : JSON structuré
- **Contexte complet** : Projet + aide + contenu enrichi

### 3. Parsers spécialisés

#### Parser principal (pages Aides-Territoires)
Extraction de 17 champs structurés :
- **Métadonnées** : titre, porteur, description, zone géographique
- **Éligibilité** : bénéficiaires, critères, dépenses éligibles
- **Financement** : types, montants, modalités
- **Thématiques** : extraction ciblée sidebar (filtrage intelligent)
- **Contact** : informations avec déduplication
- **URL externe** : bouton "Plus d'informations"

#### Parser généraliste (pages externes)
Pour sites tiers (BPI, etc.) :
- **Contenu principal** : extraction intelligente (suppression nav/footer)
- **Métadonnées** : title, description, keywords, author
- **Structure** : titres H1-H3, liens externes
- **Qualité** : score de qualité du contenu (0-100)
- **Optimisation** : limite 3000 caractères avec coupure propre

### 4. Format de sortie standardisé
```json
{
  "pertinence": {
    "niveau_pertinence": "TRÈS PERTINENTE|PERTINENTE|PAS PERTINENTE|PAS PERTINENTE DU TOUT",
    "score_compatibilite": 85,
    "justification": "Analyse détaillée en 2-3 phrases",
    "points_positifs": ["Point 1", "Point 2", "Point 3"],
    "points_negatifs": ["Point 1", "Point 2"],
    "recommandations": "Conseils pour améliorer la compatibilité"
  },
  "receivedData": {
    "body": {
      "projectContext": {
        "projectId": "proj_123"
      },
      "aideDetails": {
        "id": 6210,
        "name": "Nom de l'aide",
        "url": "https://..."
      }
    }
  },
  "porteur_aide": "Organisme porteur"
}
```

## Flux de données détaillé

### Entrée attendue
```json
{
  "aideDetails": {
    "id": 6210,
    "name": "Nom de l'aide",
    "url": "https://aides-territoires.beta.gouv.fr/..."
  },
  "projectContext": {
    "projectId": "proj_123",
    "reformulation": "Description projet reformulée",
    "keywords": ["mot-clé1", "mot-clé2"],
    "key_elements": "Secteur d'activité organisation"
  }
}
```

### Pipeline complet
1. **UniversalParse** → Normalisation données d'entrée
2. **HTTP Request** → Récupération page aide principale
3. **Parser** → Extraction structurée (17 champs)
4. **Switch** → Décision enrichissement selon URL externe
   - **Branche PDF** : Extract from File
   - **Branche HTTP** : URL_plus_info + Code (parser généraliste)
   - **Branche directe** : Pas d'enrichissement
5. **AI Agent** → Analyse de pertinence avec contexte complet
6. **Edit Fields** → Restructuration finale des données
7. **Respond to Webhook** → Retour résultat structuré

## Spécificités techniques

### Gestion multi-format
- **Pages HTML** : Parser spécialisé Aides-Territoires + parser généraliste
- **Fichiers PDF** : Extraction automatique de texte
- **URLs manquantes** : Fonctionnement dégradé sans enrichissement

### Robustesse du scraping
- **Headers HTTP** : User-Agent et Accept pour contournement anti-bot
- **Patterns multiples** : Fallbacks pour chaque champ extrait
- **Gestion d'erreurs** : `onError: continueErrorOutput` sur HTTP requests
- **Nettoyage intelligent** : Suppression navigation, JSON-LD, contenu parasite

### Optimisations IA
- **Température basse** (0.1) : Cohérence des évaluations
- **Format JSON forcé** : Structuration garantie des réponses
- **Contexte enrichi** : Données projet + aide + contenu externe
- **Prompting spécialisé** : Échelle de pertinence standardisée

## Utilisation

### Via Webhook
```bash
POST /refineFilteredAides
Content-Type: application/json

{
  "aideDetails": {...},
  "projectContext": {...}
}
```

### Via Chat
Interface pour tests et debugging du workflow.

## Points clés de performance
- **Scraping intelligent** : Adaptation automatique au type de contenu
- **Analyse contextuelle** : Prise en compte du projet ET de l'aide
- **Scoring standardisé** : Évaluation cohérente et comparable
- **Enrichissement conditionnel** : Optimisation ressources selon disponibilité