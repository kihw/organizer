# Git Workflow - Dofus Organizer v0.2

## Structure des branches

### Branches principales
- `main` : Version stable en production (v0.1.0 actuellement)
- `develop` : Branche de développement principal
- `dev/v0.2` : Branche de développement pour la v0.2

### Branches de fonctionnalités
- `feature/shortcut-performance` : Amélioration des performances des raccourcis
- `feature/window-management-optimization` : Optimisation de la gestion des fenêtres
- `feature/event-bus` : Implémentation du système EventBus
- `feature/cache-manager` : Système de cache intelligent
- `feature/performance-monitoring` : Monitoring des performances

## Workflow de développement v0.2

### 1. Setup initial

```bash
# Créer et taguer la release v0.1
git checkout main
git tag v0.1.0
git push origin v0.1.0

# Créer la branche de développement v0.2
git checkout -b dev/v0.2
git push origin dev/v0.2
```

### 2. Développement des fonctionnalités

Pour chaque fonctionnalité majeure :

```bash
# Créer une branche de fonctionnalité depuis dev/v0.2
git checkout dev/v0.2
git pull origin dev/v0.2
git checkout -b feature/shortcut-performance

# Développer la fonctionnalité
# ... commits ...

# Pousser la branche
git push origin feature/shortcut-performance

# Créer une Pull Request vers dev/v0.2
```

### 3. Intégration et tests

```bash
# Merger les fonctionnalités dans dev/v0.2
git checkout dev/v0.2
git merge feature/shortcut-performance
git push origin dev/v0.2
```

### 4. Release v0.2

```bash
# Créer la branche de release
git checkout dev/v0.2
git checkout -b release/v0.2

# Finaliser la release (tests, documentation, etc.)
# ... commits de finalisation ...

# Merger dans main
git checkout main
git merge release/v0.2

# Taguer la version
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

## Conventions de commit

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `perf`: Amélioration de performance
- `refactor`: Refactoring de code
- `docs`: Documentation
- `test`: Tests
- `chore`: Tâches de maintenance

### Exemples pour v0.2
```bash
feat(shortcuts): implement ultra-fast shortcut activation
perf(windows): optimize window detection with caching
refactor(core): add EventBus architecture
feat(monitoring): add performance metrics collection
fix(shortcuts): resolve conflict detection issues
```

## Milestones v0.2

### Phase 1 - Core Improvements (Semaines 1-2)
- [ ] Refactoring ShortcutManager v2.0
- [ ] Optimisation WindowManager
- [ ] Système de Monitoring

### Phase 2 - Advanced Features (Semaines 3-4)
- [ ] Raccourcis séquentiels
- [ ] Support multi-écrans
- [ ] Feedback visuel

### Phase 3 - Polish & Testing (Semaines 5-6)
- [ ] Interface utilisateur améliorée
- [ ] Tests automatisés
- [ ] Documentation

## Gestion des issues

### Labels pour v0.2
- `v0.2` : Toutes les issues liées à la v0.2
- `performance` : Améliorations de performance
- `shortcuts` : Raccourcis clavier
- `windows` : Gestion des fenêtres
- `critical` : Bugs critiques
- `enhancement` : Améliorations

### Template d'issue pour v0.2
```markdown
## Description
[Description de la fonctionnalité/bug]

## Objectifs v0.2
- [ ] Améliorer les performances
- [ ] Optimiser l'expérience utilisateur

## Critères d'acceptation
- [ ] Critère 1
- [ ] Critère 2

## Tests
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests de performance
```