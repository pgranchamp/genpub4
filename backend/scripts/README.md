# 🔒 SUITE D'OUTILS DE SÉCURITÉ - GÉNIE PUBLIC V4

Cette suite d'outils permet d'effectuer un audit complet de la sécurité de l'application avant la mise en production.

## 📋 Vue d'ensemble

La suite comprend 4 outils principaux :

1. **Security Audit** - Audit général de sécurité
2. **RLS Checker** - Vérification spécialisée RLS et policies
3. **Permissions Test** - Tests des permissions et isolation des données
4. **Security Monitor** - Monitoring en temps réel

## 🚀 Utilisation rapide

### Via npm scripts (recommandé)

```bash
# Depuis le dossier backend/
npm run security:audit        # Audit général
npm run security:rls          # Vérification RLS
npm run security:permissions  # Tests permissions
npm run security:monitor      # Monitoring temps réel
npm run security:all          # Tous les audits (sauf monitoring)
```

### Exécution directe

```bash
# Depuis le dossier backend/
node scripts/security-audit.js
node scripts/rls-checker.js
node scripts/permissions-test.js
node scripts/security-monitor.js
```

## 🔍 Détail des outils

### 1. Security Audit (`security-audit.js`)

**Objectif** : Audit général de sécurité de la base de données

**Fonctionnalités** :
- ✅ Vérification connexion Supabase
- 📋 Inventaire des tables
- 🔒 Statut RLS par table
- 📜 Inventaire des policies
- 🧪 Tests des permissions
- ⚠️ Analyse des risques
- 💡 Recommandations prioritaires

**Sortie** :
- `backend/reports/security-audit-report.json` - Rapport détaillé
- `backend/reports/security-audit-summary.txt` - Résumé lisible

**Exemple d'utilisation** :
```bash
npm run security:audit
```

### 2. RLS Checker (`rls-checker.js`)

**Objectif** : Vérification spécialisée de Row Level Security

**Fonctionnalités** :
- 🔒 Vérification RLS via tables système PostgreSQL
- 🔄 Méthode alternative de détection RLS
- 🧪 Tests pratiques des permissions
- 📜 Inventaire détaillé des policies
- 💡 Recommandations RLS spécifiques
- 📝 Génération de scripts SQL

**Sortie** :
- `backend/reports/rls-check-report.json` - Rapport détaillé
- `backend/reports/rls-recommendations.sql` - Scripts SQL recommandés

**Exemple d'utilisation** :
```bash
npm run security:rls
```

### 3. Permissions Test (`permissions-test.js`)

**Objectif** : Tests des permissions et isolation des données

**Fonctionnalités** :
- 📋 Tests d'accès aux tables
- 🔒 Tests d'isolation des données utilisateurs
- ✏️ Tests des opérations CRUD (simulés)
- 🛡️ Tests des contraintes de sécurité
- 📊 Résumé par catégorie de tests
- 💡 Recommandations basées sur les résultats

**Sortie** :
- `backend/reports/permissions-test-report.json` - Rapport détaillé

**Exemple d'utilisation** :
```bash
npm run security:permissions
```

### 4. Security Monitor (`security-monitor.js`)

**Objectif** : Monitoring de sécurité en temps réel

**Fonctionnalités** :
- 🔐 Métriques d'authentification
- 🔍 Détection d'activité suspecte
- ⚡ Métriques de performance
- ❌ Analyse des erreurs
- 🚨 Alertes automatiques
- 💾 Sauvegarde continue des logs

**Sortie** :
- `backend/logs/security-metrics-YYYY-MM-DD.json` - Logs quotidiens
- Interface temps réel dans le terminal

**Exemple d'utilisation** :
```bash
npm run security:monitor
# Ctrl+C pour arrêter
```

**Options** :
```bash
node scripts/security-monitor.js --help     # Aide
node scripts/security-monitor.js --config   # Configuration
```

## 📊 Interprétation des résultats

### Niveaux de risque

- 🟢 **FAIBLE** : Sécurité acceptable
- 🟡 **MOYEN** : Améliorations recommandées
- 🟠 **ÉLEVÉ** : Actions requises
- 🔴 **CRITIQUE** : Actions immédiates nécessaires

### Statuts des tests

- ✅ **PASSED** : Test réussi
- ❌ **FAILED** : Test échoué, action requise
- ⚠️ **WARNING** : Avertissement, vérification recommandée

## 🛠️ Workflow recommandé

### Phase 1 : Audit initial (sans risque)

```bash
# 1. Audit général
npm run security:audit

# 2. Vérification RLS détaillée
npm run security:rls

# 3. Tests des permissions
npm run security:permissions
```

### Phase 2 : Analyse des résultats

1. Examiner les rapports dans `backend/reports/`
2. Identifier les actions critiques
3. Planifier les corrections

### Phase 3 : Corrections (avec précaution)

1. Appliquer les scripts SQL générés (`rls-recommendations.sql`)
2. Tester sur un environnement de développement d'abord
3. Re-exécuter les audits pour vérifier les corrections
4. Documenter les changements effectués

### Phase 4 : Monitoring continu

```bash
# Démarrer le monitoring en production
npm run security:monitor
```

## 🚨 Actions critiques identifiées

### RLS désactivé sur tables sensibles

Si l'audit détecte que RLS est désactivé sur les tables `users` ou `organisations` :

```sql
-- CRITIQUE: Réactiver RLS immédiatement
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
```

### Policies manquantes

Créer des policies appropriées après activation RLS :

```sql
-- Exemple pour la table users
CREATE POLICY "users_policy" ON public.users
  FOR ALL TO authenticated
  USING (id = auth.uid());

-- Exemple pour la table projects
CREATE POLICY "projects_policy" ON public.projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

## 📁 Structure des rapports

```
backend/
├── reports/                          # Rapports d'audit
│   ├── security-audit-report.json    # Audit général
│   ├── security-audit-summary.txt    # Résumé lisible
│   ├── rls-check-report.json         # Rapport RLS détaillé
│   ├── rls-recommendations.sql       # Scripts SQL recommandés
│   └── permissions-test-report.json  # Tests permissions
├── logs/                             # Logs de monitoring
│   └── security-metrics-*.json       # Métriques quotidiennes
└── scripts/                          # Scripts d'audit
    ├── security-audit.js
    ├── rls-checker.js
    ├── permissions-test.js
    ├── security-monitor.js
    └── README.md
```

## ⚙️ Configuration

### Variables d'environnement requises

```bash
# .env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Permissions requises

Les scripts utilisent la clé `service_role` de Supabase qui a tous les privilèges. Assurez-vous que :

1. La clé est correctement configurée dans `.env`
2. L'accès réseau à Supabase est autorisé
3. Les tables existent dans la base de données

## 🔧 Dépannage

### Erreur de connexion Supabase

```bash
❌ Connexion Supabase échouée: Invalid API key
```

**Solution** : Vérifier la variable `SUPABASE_SERVICE_ROLE_KEY` dans `.env`

### Erreur "Table not found"

```bash
❌ relation "users" does not exist
```

**Solution** : Vérifier que les migrations ont été appliquées

### RLS bloque les requêtes

```bash
⚠️ Accès bloqué par RLS (comportement attendu si RLS activé)
```

**Explication** : C'est normal si RLS est correctement configuré. Les scripts détectent cette situation.

## 📞 Support

Pour toute question sur l'utilisation de ces outils :

1. Consulter ce README
2. Examiner les rapports générés
3. Vérifier les logs d'erreur
4. Tester sur un environnement de développement

## 🔄 Mise à jour des outils

Les scripts sont conçus pour être maintenus et étendus. Pour ajouter de nouveaux tests :

1. Modifier les scripts existants
2. Ajouter de nouveaux scripts dans `backend/scripts/`
3. Mettre à jour les npm scripts dans `package.json`
4. Documenter les changements dans ce README

---

**⚠️ IMPORTANT** : Ces outils sont conçus pour un audit de sécurité. Toujours tester les modifications sur un environnement de développement avant la production.
