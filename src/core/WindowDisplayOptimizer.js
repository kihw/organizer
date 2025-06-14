/**
 * WindowDisplayOptimizer - Optimisation ultra-rapide de l'affichage des fenêtres
 * Objectif: Réactivité maximale après activation de raccourci (<20ms)
 */
class WindowDisplayOptimizer {
  constructor() {
    this.displayCache = new Map();
    this.pendingUpdates = new Set();
    this.updateQueue = [];
    this.isProcessing = false;
    this.frameId = null;
    this.lastUpdateTime = 0;
    this.updateThrottle = 16; // 60fps max
    
    // Optimisations spécifiques par plateforme
    this.platformOptimizations = this.initializePlatformOptimizations();
    
    console.log('WindowDisplayOptimizer: Initialized for ultra-fast window display');
  }

  /**
   * Initialise les optimisations spécifiques à la plateforme
   */
  initializePlatformOptimizations() {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return {
          useDirectComposition: true,
          enableHardwareAcceleration: true,
          bypassDWM: false, // Garder DWM pour la compatibilité
          useAsyncActivation: true,
          batchWindowOperations: true
        };
      
      case 'darwin':
        return {
          useQuartzComposer: true,
          enableMetalAcceleration: true,
          useNativeAnimations: false, // Désactiver pour la vitesse
          batchWindowOperations: true
        };
      
      case 'linux':
        return {
          useXComposite: true,
          enableOpenGLAcceleration: true,
          bypassCompositor: true, // Pour X11
          batchWindowOperations: true
        };
      
      default:
        return {
          batchWindowOperations: true
        };
    }
  }

  /**
   * Optimisation principale: Affichage immédiat avec prédiction
   */
  async optimizeWindowDisplay(windowId, activationPromise) {
    const startTime = performance.now();
    
    try {
      // 1. Affichage prédictif immédiat (0ms)
      this.applyPredictiveDisplay(windowId);
      
      // 2. Optimisation en parallèle
      const optimizationPromise = this.performParallelOptimizations(windowId);
      
      // 3. Attendre l'activation réelle
      const [activationResult] = await Promise.allSettled([
        activationPromise,
        optimizationPromise
      ]);
      
      // 4. Correction si nécessaire
      if (activationResult.status === 'fulfilled' && activationResult.value) {
        await this.finalizeDisplay(windowId);
      } else {
        this.revertPredictiveDisplay(windowId);
      }
      
      const duration = performance.now() - startTime;
      console.log(`WindowDisplayOptimizer: Display optimized in ${duration.toFixed(2)}ms`);
      
      return activationResult.status === 'fulfilled' && activationResult.value;
      
    } catch (error) {
      console.error('WindowDisplayOptimizer: Error during optimization:', error);
      this.revertPredictiveDisplay(windowId);
      return false;
    }
  }

  /**
   * Affichage prédictif immédiat (0ms de latence perçue)
   */
  applyPredictiveDisplay(windowId) {
    // Mise à jour immédiate de l'état visuel
    this.updateVisualStateImmediate(windowId);
    
    // Cache de l'état pour rollback si nécessaire
    this.displayCache.set(windowId, {
      timestamp: Date.now(),
      predictive: true,
      originalState: this.captureCurrentState(windowId)
    });
    
    // Notification immédiate aux composants UI
    this.notifyDisplayChange(windowId, 'predictive');
  }

  /**
   * Mise à jour visuelle immédiate
   */
  updateVisualStateImmediate(windowId) {
    // Mise à jour du dock
    this.updateDockStateImmediate(windowId);
    
    // Mise à jour de la configuration
    this.updateConfigStateImmediate(windowId);
    
    // Feedback visuel instantané
    this.showInstantFeedback(windowId);
  }

  /**
   * Mise à jour immédiate du dock
   */
  updateDockStateImmediate(windowId) {
    const dockElement = document.querySelector(`[data-window-id="${windowId}"]`);
    if (dockElement) {
      // Suppression immédiate de l'état actif des autres
      document.querySelectorAll('.dock-item.active').forEach(item => {
        item.classList.remove('active');
      });
      
      // Application immédiate de l'état actif
      dockElement.classList.add('active', 'activating');
      
      // Animation de feedback
      dockElement.style.transform = 'scale(1.1)';
      dockElement.style.transition = 'transform 0.1s ease-out';
      
      // Retour à la normale après l'animation
      setTimeout(() => {
        dockElement.style.transform = '';
        dockElement.classList.remove('activating');
      }, 100);
    }
  }

  /**
   * Mise à jour immédiate de la configuration
   */
  updateConfigStateImmediate(windowId) {
    const configElements = document.querySelectorAll('.window-item');
    configElements.forEach(element => {
      const elementWindowId = element.dataset.windowId;
      if (elementWindowId === windowId) {
        element.classList.add('active');
        element.style.borderColor = '#3498db';
        element.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.3)';
      } else {
        element.classList.remove('active');
        element.style.borderColor = '';
        element.style.boxShadow = '';
      }
    });
  }

  /**
   * Feedback visuel instantané
   */
  showInstantFeedback(windowId) {
    // Créer un indicateur de feedback temporaire
    const feedback = document.createElement('div');
    feedback.className = 'instant-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.2s ease-out;
      pointer-events: none;
    `;
    feedback.textContent = '⚡ Activating...';
    
    document.body.appendChild(feedback);
    
    // Animation d'apparition
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateY(0)';
    });
    
    // Suppression automatique
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 200);
    }, 1000);
  }

  /**
   * Optimisations en parallèle
   */
  async performParallelOptimizations(windowId) {
    const optimizations = [
      this.preloadWindowResources(windowId),
      this.optimizeSystemResources(),
      this.prepareDisplayBuffers(windowId)
    ];
    
    await Promise.allSettled(optimizations);
  }

  /**
   * Préchargement des ressources de fenêtre
   */
  async preloadWindowResources(windowId) {
    // Précharger les données de fenêtre
    const windowData = await this.getWindowDataFast(windowId);
    
    // Préparer les éléments DOM
    this.prepareWindowElements(windowId, windowData);
    
    // Optimiser les images/avatars
    this.preloadWindowAssets(windowId, windowData);
  }

  /**
   * Optimisation des ressources système
   */
  async optimizeSystemResources() {
    if (this.platformOptimizations.batchWindowOperations) {
      // Grouper les opérations système
      this.batchPendingOperations();
    }
    
    if (this.platformOptimizations.enableHardwareAcceleration) {
      // Activer l'accélération matérielle si disponible
      this.enableHardwareAcceleration();
    }
  }

  /**
   * Préparation des buffers d'affichage
   */
  async prepareDisplayBuffers(windowId) {
    // Préparer les buffers pour un rendu rapide
    const buffers = this.createDisplayBuffers(windowId);
    
    // Optimiser la pipeline de rendu
    this.optimizeRenderingPipeline(buffers);
  }

  /**
   * Finalisation de l'affichage après activation réussie
   */
  async finalizeDisplay(windowId) {
    const cachedState = this.displayCache.get(windowId);
    
    if (cachedState && cachedState.predictive) {
      // Confirmer l'état prédictif
      this.confirmPredictiveState(windowId);
      
      // Nettoyer le cache
      this.displayCache.delete(windowId);
      
      // Optimisations post-activation
      await this.performPostActivationOptimizations(windowId);
    }
  }

  /**
   * Annulation de l'affichage prédictif en cas d'échec
   */
  revertPredictiveDisplay(windowId) {
    const cachedState = this.displayCache.get(windowId);
    
    if (cachedState && cachedState.predictive) {
      // Restaurer l'état original
      this.restoreOriginalState(windowId, cachedState.originalState);
      
      // Nettoyer le cache
      this.displayCache.delete(windowId);
      
      // Afficher un feedback d'erreur
      this.showErrorFeedback(windowId);
    }
  }

  /**
   * Capture de l'état actuel pour rollback
   */
  captureCurrentState(windowId) {
    return {
      activeElements: Array.from(document.querySelectorAll('.active')).map(el => ({
        element: el,
        classes: Array.from(el.classList)
      })),
      timestamp: Date.now()
    };
  }

  /**
   * Restauration de l'état original
   */
  restoreOriginalState(windowId, originalState) {
    // Restaurer les classes CSS
    originalState.activeElements.forEach(({ element, classes }) => {
      element.className = classes.join(' ');
    });
    
    // Supprimer les styles inline ajoutés
    document.querySelectorAll('[style*="border-color"], [style*="box-shadow"]').forEach(el => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    });
  }

  /**
   * Notification de changement d'affichage
   */
  notifyDisplayChange(windowId, type) {
    const event = new CustomEvent('windowDisplayChange', {
      detail: { windowId, type, timestamp: Date.now() }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Obtention rapide des données de fenêtre
   */
  async getWindowDataFast(windowId) {
    // Utiliser le cache si disponible
    const cached = this.displayCache.get(`data_${windowId}`);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.data;
    }
    
    // Sinon, récupération rapide
    try {
      const { ipcRenderer } = require('electron');
      const data = await ipcRenderer.invoke('get-window-data-fast', windowId);
      
      // Mettre en cache
      this.displayCache.set(`data_${windowId}`, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.warn('WindowDisplayOptimizer: Fast data retrieval failed:', error);
      return null;
    }
  }

  /**
   * Feedback d'erreur
   */
  showErrorFeedback(windowId) {
    const feedback = document.createElement('div');
    feedback.className = 'error-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.2s ease-out;
      pointer-events: none;
    `;
    feedback.textContent = '❌ Activation failed';
    
    document.body.appendChild(feedback);
    
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateY(0)';
    });
    
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 200);
    }, 2000);
  }

  /**
   * Optimisations post-activation
   */
  async performPostActivationOptimizations(windowId) {
    // Optimiser la mémoire
    this.optimizeMemoryUsage();
    
    // Nettoyer les caches expirés
    this.cleanupExpiredCaches();
    
    // Préparer pour la prochaine activation
    this.prepareForNextActivation();
  }

  /**
   * Nettoyage des caches expirés
   */
  cleanupExpiredCaches() {
    const now = Date.now();
    const maxAge = 30000; // 30 secondes
    
    for (const [key, value] of this.displayCache) {
      if (now - value.timestamp > maxAge) {
        this.displayCache.delete(key);
      }
    }
  }

  /**
   * Optimisation de l'utilisation mémoire
   */
  optimizeMemoryUsage() {
    // Forcer le garbage collection si disponible
    if (global.gc) {
      global.gc();
    }
    
    // Nettoyer les références inutiles
    this.pendingUpdates.clear();
    this.updateQueue.length = 0;
  }

  /**
   * Préparation pour la prochaine activation
   */
  prepareForNextActivation() {
    // Réinitialiser les états
    this.isProcessing = false;
    
    // Préparer les optimisations pour la prochaine fois
    this.preloadCommonResources();
  }

  /**
   * Préchargement des ressources communes
   */
  preloadCommonResources() {
    // Précharger les CSS critiques
    this.preloadCriticalCSS();
    
    // Préparer les animations
    this.prepareAnimations();
  }

  /**
   * Statistiques de performance
   */
  getPerformanceStats() {
    return {
      cacheSize: this.displayCache.size,
      pendingUpdates: this.pendingUpdates.size,
      queueLength: this.updateQueue.length,
      lastUpdateTime: this.lastUpdateTime,
      platformOptimizations: this.platformOptimizations
    };
  }

  /**
   * Nettoyage
   */
  cleanup() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    
    this.displayCache.clear();
    this.pendingUpdates.clear();
    this.updateQueue.length = 0;
    
    console.log('WindowDisplayOptimizer: Cleaned up');
  }
}

module.exports = WindowDisplayOptimizer;