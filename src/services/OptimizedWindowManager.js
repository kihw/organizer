const WindowManager = require('./WindowManager');
const WindowDisplayOptimizer = require('../core/WindowDisplayOptimizer');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');

/**
 * OptimizedWindowManager - Gestionnaire de fenêtres avec optimisation d'affichage
 * Objectif: Réactivité visuelle instantanée (<20ms)
 */
class OptimizedWindowManager extends WindowManager {
  constructor() {
    super();
    this.displayOptimizer = new WindowDisplayOptimizer();
    this.activationQueue = [];
    this.isProcessingQueue = false;
    this.maxConcurrentActivations = 1; // Une seule activation à la fois pour éviter les conflits
    
    console.log('OptimizedWindowManager: Initialized with display optimization');
  }

  /**
   * Activation de fenêtre avec optimisation d'affichage
   */
  async activateWindow(windowId) {
    return performanceMonitor.measureAsync('optimized_window_activation', async () => {
      const startTime = Date.now();
      
      try {
        console.log(`OptimizedWindowManager: Starting optimized activation for ${windowId}`);
        
        // 1. Validation rapide
        if (!windowId) {
          console.warn('OptimizedWindowManager: No windowId provided');
          return false;
        }
        
        // 2. Vérification de la queue
        if (this.isProcessingQueue) {
          console.log('OptimizedWindowManager: Adding to queue');
          return this.queueActivation(windowId);
        }
        
        this.isProcessingQueue = true;
        
        // 3. Activation optimisée avec affichage prédictif
        const activationPromise = this.performActualActivation(windowId);
        const success = await this.displayOptimizer.optimizeWindowDisplay(windowId, activationPromise);
        
        const duration = Date.now() - startTime;
        
        if (success) {
          console.log(`OptimizedWindowManager: Optimized activation SUCCESS for ${windowId} in ${duration}ms`);
          
          // Émettre l'événement avec les métriques
          eventBus.emit('window:activated_optimized', {
            windowId,
            duration,
            optimized: true
          });
          
          return true;
        } else {
          console.warn(`OptimizedWindowManager: Optimized activation FAILED for ${windowId}`);
          return false;
        }
        
      } catch (error) {
        console.error(`OptimizedWindowManager: Error during optimized activation:`, error);
        return false;
      } finally {
        this.isProcessingQueue = false;
        this.processNextInQueue();
      }
    });
  }

  /**
   * Activation réelle de la fenêtre (délégation au parent)
   */
  async performActualActivation(windowId) {
    return super.activateWindow(windowId);
  }

  /**
   * Gestion de la queue d'activation
   */
  async queueActivation(windowId) {
    return new Promise((resolve) => {
      this.activationQueue.push({
        windowId,
        resolve,
        timestamp: Date.now()
      });
      
      console.log(`OptimizedWindowManager: Queued activation for ${windowId} (queue size: ${this.activationQueue.length})`);
    });
  }

  /**
   * Traitement du prochain élément de la queue
   */
  async processNextInQueue() {
    if (this.activationQueue.length === 0 || this.isProcessingQueue) {
      return;
    }
    
    const next = this.activationQueue.shift();
    if (next) {
      console.log(`OptimizedWindowManager: Processing queued activation for ${next.windowId}`);
      
      const result = await this.activateWindow(next.windowId);
      next.resolve(result);
    }
  }

  /**
   * Activation de la fenêtre suivante avec optimisation
   */
  async activateNextWindow() {
    return performanceMonitor.measureAsync('optimized_next_window', async () => {
      const enabledWindows = this.lastDetectedWindows.filter(w => w.enabled);
      if (enabledWindows.length === 0) return false;

      // Trier par initiative (descendant), puis par nom de personnage
      enabledWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });

      // Trouver la fenêtre active actuelle
      const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);

      // Obtenir la fenêtre suivante (cycle vers la première si à la fin)
      const nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
      const nextWindow = enabledWindows[nextIndex];

      if (nextWindow) {
        console.log(`OptimizedWindowManager: Activating next window: ${nextWindow.character}`);
        return await this.activateWindow(nextWindow.id);
      }

      return false;
    });
  }

  /**
   * Détection des fenêtres avec mise à jour optimisée de l'affichage
   */
  async getDofusWindows() {
    return performanceMonitor.measureAsync('optimized_window_detection', async () => {
      const startTime = Date.now();
      
      try {
        // Détection normale
        const windows = await super.getDofusWindows();
        
        // Optimisation de l'affichage si des changements sont détectés
        if (this.hasWindowChanges(windows)) {
          await this.optimizeDisplayForChanges(windows);
        }
        
        const duration = Date.now() - startTime;
        console.log(`OptimizedWindowManager: Detection with display optimization completed in ${duration}ms`);
        
        return windows;
        
      } catch (error) {
        console.error('OptimizedWindowManager: Error during optimized detection:', error);
        return this.lastDetectedWindows || [];
      }
    });
  }

  /**
   * Vérification des changements de fenêtres
   */
  hasWindowChanges(newWindows) {
    if (!this.lastDetectedWindows || this.lastDetectedWindows.length !== newWindows.length) {
      return true;
    }
    
    // Vérification rapide des IDs
    const currentIds = new Set(this.lastDetectedWindows.map(w => w.id));
    const newIds = new Set(newWindows.map(w => w.id));
    
    if (currentIds.size !== newIds.size) {
      return true;
    }
    
    for (const id of newIds) {
      if (!currentIds.has(id)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Optimisation de l'affichage pour les changements
   */
  async optimizeDisplayForChanges(windows) {
    // Mise à jour optimisée des interfaces
    this.updateInterfacesOptimized(windows);
    
    // Préchargement des ressources pour les nouvelles fenêtres
    const newWindows = this.getNewWindows(windows);
    if (newWindows.length > 0) {
      await this.preloadNewWindowResources(newWindows);
    }
  }

  /**
   * Mise à jour optimisée des interfaces
   */
  updateInterfacesOptimized(windows) {
    // Utiliser requestAnimationFrame pour des mises à jour fluides
    requestAnimationFrame(() => {
      // Émettre l'événement de mise à jour
      eventBus.emit('windows:updated_optimized', {
        windows,
        timestamp: Date.now(),
        optimized: true
      });
    });
  }

  /**
   * Obtention des nouvelles fenêtres
   */
  getNewWindows(windows) {
    if (!this.lastDetectedWindows) {
      return windows;
    }
    
    const existingIds = new Set(this.lastDetectedWindows.map(w => w.id));
    return windows.filter(w => !existingIds.has(w.id));
  }

  /**
   * Préchargement des ressources pour les nouvelles fenêtres
   */
  async preloadNewWindowResources(newWindows) {
    const preloadPromises = newWindows.map(window => 
      this.displayOptimizer.preloadWindowResources(window.id)
    );
    
    await Promise.allSettled(preloadPromises);
    console.log(`OptimizedWindowManager: Preloaded resources for ${newWindows.length} new windows`);
  }

  /**
   * Statistiques de performance optimisées
   */
  getOptimizedStats() {
    const baseStats = super.getStats();
    const optimizerStats = this.displayOptimizer.getPerformanceStats();
    
    return {
      ...baseStats,
      displayOptimization: optimizerStats,
      queueSize: this.activationQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      optimizationEnabled: true
    };
  }

  /**
   * Nettoyage avec optimisations
   */
  cleanup() {
    // Nettoyer la queue
    this.activationQueue.forEach(item => {
      item.resolve(false);
    });
    this.activationQueue.length = 0;
    
    // Nettoyer l'optimiseur d'affichage
    this.displayOptimizer.cleanup();
    
    // Nettoyage parent
    super.cleanup();
    
    console.log('OptimizedWindowManager: Optimized cleanup completed');
  }
}

module.exports = OptimizedWindowManager;