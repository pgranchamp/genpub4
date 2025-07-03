# Descriptif sommaire - Workflow aideSelectionService

## Vue d'ensemble
Ce workflow effectue une première sélection automatisée des aides publiques retournées par l'API Aides Territoires. Il analyse et filtre les résultats pour faciliter le travail de tri manuel ultérieur.

## Fonctionnalité principale
- **Entrée** : Données d'aides depuis l'API Aides Territoires
- **Traitement** : Analyse automatique de la pertinence de chaque aide
- **Sortie** : Classification des aides en catégories (pertinent/pas pertinent/à revoir)

## Endpoint
- **URL** : `/webhook/aideSelectionService`
- **Méthode** : POST
- **Format** : JSON

## Bénéfices
- Réduction du temps de tri manuel
- Classification cohérente des aides
- Statistiques de traitement intégrées
- Traçabilité des décisions automatisées

---

# Documentation technique - aideSelectionService

## Architecture du workflow

### 1. Réception des données
- **Webhook Trigger** : Point d'entrée `/webhook/aideSelectionService`
- **Format attendu** : Payload JSON contenant les aides à traiter

### 2. Traitement automatisé
Le workflow analyse chaque aide selon des critères prédéfinis :
- Analyse du titre et de la description
- Vérification de la pertinence selon le contexte
- Attribution d'une catégorie de décision

### 3. Classification des résultats
Chaque aide est classée dans une des catégories :
- **"pas pertinent"** → `category: "rejected"`
- **"à revoir"** → `category: "to_review"`
- **"pertinent"** → `category: "accepted"`

### 4. Format de sortie
```json
{
  "processed_results": [
    {
      "id": 6210,
      "title": "Titre de l'aide",
      "url": "URL de l'aide",
      "decision": "pas pertinent|à revoir|pertinent",
      "processed_at": "2025-06-18T12:15:21.093Z",
      "category": "rejected|to_review|accepted"
    }
  ],
  "summary": {
    "total_processed": 1,
    "rejected": 1,
    "to_review": 0,
    "processing_date": "2025-06-18T12:15:21.093Z"
  },
  "raw_stats": {
    "totalProcessed": 1,
    "aVoir": 0,
    "pasPertinent": 1
  }
}
```

## Utilisation
1. Envoyer une requête POST vers `/webhook/aideSelectionService`
2. Le payload doit contenir les données d'aides à analyser
3. Récupérer la réponse avec les aides classifiées et les statistiques

## Intégration
Ce workflow s'intègre dans une chaîne de traitement plus large :
- **En amont** : API Aides Territoires
- **En aval** : Interface de validation manuelle ou autre traitement