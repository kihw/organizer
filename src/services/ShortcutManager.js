const { globalShortcut } = require('electron');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * ShortcutManager v2.0 - Ultra-rapide et fiable
 * Améliore considérablement les performances et la fiabilité des raccourcis
 */
class ShortcutManagerV2 {
  constructor() {
    this.shortcuts = new Map();
    this.active = false;
    this.registeredAccelerators = new Set();
    this.cache = new CacheManager({ maxSize: 500, defaultTTL: 600000 }); // 10 minutes
    this.conflictResolver = new Map();
    this.activationQueue = [];
    this.isProcessingQueue = false;
    this.stats = {
      activations: 0,
      failures: 0,
      conflicts: 0,
      avgActivationTime: 0
    };
    
    // Démarrer le nettoyage automatique du cache
    this.cache.startAutoCleanup();
    
    console.log('ShortcutManagerV2: Initialized with enhanced performance and reliability');
    
    // Écouter les événements de performance
    eventBus.on('performance:alert', (alert) => {
      if (alert.operation.startsWith('shortcut_')) {
        this.handlePerformanceAlert(alert);
      }
    });
  }

  /**
   * Définit un raccourci pour une fenêtre avec validation avancée
   */
  async setWindowShortcut(windowId, shortcut, callback) {
    const timer = performanceMonitor.startTimer('shortcut_registration');
    
    try {
      // Supprimer l'ancien raccourci
      await this.removeWindowShortcut(windowId);
      
      if (!shortcut || !callback) {
        timer.stop();
        return false;
      }

      // Validation et conversion
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      if (!accelerator) {
        console.warn(`ShortcutManagerV2: Invalid shortcut format: ${shortcut}`);
        timer.stop();
        return false;
      }

      // Vérifier les conflits
      const conflict = this.checkConflict(accelerator, windowId);
      if (conflict) {
        console.warn(`ShortcutManagerV2: Shortcut conflict detected: ${accelerator} already used by ${conflict}`);
        this.stats.conflicts++;
        timer.stop();
        return false;
      }

      // Enregistrer le raccourci avec gestion d'erreur robuste
      const success = await this.registerGlobalShortcut(accelerator, windowId, callback);
      
      if (success) {
        this.shortcuts.set(windowId, {
          accelerator,
          callback,
          original: shortcut,
          registeredAt: Date.now(),
          activationCount: 0
        });
        
        this.registeredAccelerators.add(accelerator);
        
        // Mettre en cache pour accès rapide
        this.cache.set(`shortcut_${windowId}`, {
          accelerator,
          original: shortcut
        });
        
        console.log(`ShortcutManagerV2: Successfully registered shortcut ${accelerator} for window ${windowId}`);
        
        // Émettre un événement de succès
        eventBus.emit('shortcut:registered', { windowId, shortcut, accelerator });
        
        timer.stop();
        return true;
      } else {
        console.warn(`ShortcutManagerV2: Failed to register shortcut: ${accelerator}`);
        timer.stop();
        return false;
      }
    } catch (error) {
      console.error('ShortcutManagerV2: Error setting shortcut:', error);
      timer.stop();
      return false;
    }
  }

  /**
   * Enregistre un raccourci global avec retry automatique
   */
  async registerGlobalShortcut(accelerator, windowId, callback, retryCount = 3) {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const success = globalShortcut.register(accelerator, () => {
          this.executeShortcut(windowId, accelerator, callback);
        });
        
        if (success) {
          return true;
        } else if (attempt < retryCount) {
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          console.log(`ShortcutManagerV2: Retry ${attempt} for ${accelerator}`);
        }
      } catch (error) {
        console.error(`ShortcutManagerV2: Registration attempt ${attempt} failed:`, error);
        if (attempt === retryCount) {
          throw error;
        }
      }
    }
    
    return false;
  }

  /**
   * Exécute un raccourci avec monitoring et queue
   */
  executeShortcut(windowId, accelerator, callback) {
    const activationData = {
      windowId,
      accelerator,
      callback,
      timestamp: Date.now(),
      id: `${windowId}_${Date.now()}`
    };
    
    // Ajouter à la queue pour traitement séquentiel
    this.activationQueue.push(activationData);
    
    // Traiter la queue si pas déjà en cours
    if (!this.isProcessingQueue) {
      this.processActivationQueue();
    }
  }

  /**
   * Traite la queue d'activation des raccourcis
   */
  async processActivationQueue() {
    if (this.isProcessingQueue || this.activationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.activationQueue.length > 0) {
      const activation = this.activationQueue.shift();
      await this.processActivation(activation);
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Traite une activation individuelle
   */
  async processActivation(activation) {
    const timer = performanceMonitor.startTimer('shortcut_activation', {
      windowId: activation.windowId,
      accelerator: activation.accelerator
    });
    
    try {
      console.log(`ShortcutManagerV2: Executing shortcut ${activation.accelerator} for window ${activation.windowId}`);
      
      // Mettre à jour les statistiques
      const shortcutInfo = this.shortcuts.get(activation.windowId);
      if (shortcutInfo) {
        shortcutInfo.activationCount++;
      }
      
      this.stats.activations++;
      
      // Exécuter le callback
      await activation.callback();
      
      const duration = timer.stop();
      
      // Mettre à jour la moyenne des temps d'activation
      this.updateAverageActivationTime(duration);
      
      // Émettre un événement de succès
      eventBus.emit('shortcut:activated', {
        windowId: activation.windowId,
        accelerator: activation.accelerator,
        duration
      });
      
    } catch (error) {
      console.error('ShortcutManagerV2: Error executing shortcut callback:', error);
      this.stats.failures++;
      timer.stop();
      
      // Émettre un événement d'erreur
      eventBus.emit('shortcut:error', {
        windowId: activation.windowId,
        accelerator: activation.accelerator,
        error: error.message
      });
    }
  }

  /**
   * Met à jour la moyenne des temps d'activation
   */
  updateAverageActivationTime(duration) {
    const totalActivations = this.stats.activations;
    const currentAvg = this.stats.avgActivationTime;
    
    this.stats.avgActivationTime = ((currentAvg * (totalActivations - 1)) + duration) / totalActivations;
  }

  /**
   * Supprime un raccourci de fenêtre
   */
  async removeWindowShortcut(windowId) {
    const timer = performanceMonitor.startTimer('shortcut_removal');
    
    try {
      const shortcutInfo = this.shortcuts.get(windowId);
      if (shortcutInfo) {
        // Désenregistrer le raccourci global
        try {
          globalShortcut.unregister(shortcutInfo.accelerator);
          this.registeredAccelerators.delete(shortcutInfo.accelerator);
        } catch (error) {
          console.warn(`ShortcutManagerV2: Error unregistering ${shortcutInfo.accelerator}:`, error);
        }
        
        // Supprimer des structures de données
        this.shortcuts.delete(windowId);
        this.cache.delete(`shortcut_${windowId}`);
        
        console.log(`ShortcutManagerV2: Removed shortcut ${shortcutInfo.accelerator} for window ${windowId}`);
        
        // Émettre un événement
        eventBus.emit('shortcut:removed', { windowId, accelerator: shortcutInfo.accelerator });
        
        timer.stop();
        return true;
      }
      
      timer.stop();
      return false;
    } catch (error) {
      console.error('ShortcutManagerV2: Error removing shortcut:', error);
      timer.stop();
      return false;
    }
  }

  /**
   * Conversion optimisée de raccourci vers accélérateur
   */
  convertShortcutToAccelerator(shortcut) {
    if (!shortcut) return '';
    
    // Vérifier le cache d'abord
    const cached = this.cache.get(`accelerator_${shortcut}`);
    if (cached) {
      return cached;
    }
    
    console.log(`ShortcutManagerV2: Converting shortcut "${shortcut}" to accelerator`);
    
    // Nettoyer et normaliser
    let accelerator = shortcut.trim().replace(/\s*\+\s*/g, '+');
    
    // Mappings des modificateurs
    const modifierMappings = {
      'ctrl': 'CommandOrControl',
      'control': 'CommandOrControl',
      'cmd': 'CommandOrControl',
      'command': 'CommandOrControl',
      'alt': 'Alt',
      'shift': 'Shift',
      'win': 'Super',
      'super': 'Super',
      'meta': 'Super'
    };
    
    // Mappings des touches spéciales
    const keyMappings = {
      'space': 'Space',
      'enter': 'Return',
      'return': 'Return',
      'backspace': 'Backspace',
      'tab': 'Tab',
      'escape': 'Escape',
      'esc': 'Escape',
      'delete': 'Delete',
      'del': 'Delete',
      'insert': 'Insert',
      'ins': 'Insert',
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp',
      'pagedown': 'PageDown',
      'up': 'Up',
      'down': 'Down',
      'left': 'Left',
      'right': 'Right',
      'plus': 'Plus',
      'minus': 'Minus',
      // Touches de fonction
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
    };
    
    // Traiter chaque partie
    const parts = accelerator.split('+').map(part => part.trim().toLowerCase());
    const processedParts = [];
    
    parts.forEach(part => {
      if (modifierMappings[part]) {
        processedParts.push(modifierMappings[part]);
      } else if (keyMappings[part]) {
        processedParts.push(keyMappings[part]);
      } else if (part.length === 1 && part.match(/[a-z0-9]/)) {
        processedParts.push(part.toUpperCase());
      } else if (part.length === 1) {
        processedParts.push(part);
      } else if (!['control', 'alt', 'shift', 'meta'].includes(part)) {
        processedParts.push(part.toUpperCase());
      }
    });
    
    const result = processedParts.join('+');
    
    // Mettre en cache le résultat
    this.cache.set(`accelerator_${shortcut}`, result);
    
    console.log(`ShortcutManagerV2: Converted "${shortcut}" to "${result}"`);
    return result;
  }

  /**
   * Validation avancée des raccourcis
   */
  validateShortcut(shortcut) {
    if (!shortcut) return { valid: false, reason: 'Empty shortcut' };
    
    try {
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      
      if (!accelerator) {
        return { valid: false, reason: 'Invalid format' };
      }
      
      // Vérifier les conflits
      const conflict = this.checkConflict(accelerator);
      if (conflict) {
        return { valid: false, reason: `Conflict with ${conflict}` };
      }
      
      // Vérifier les raccourcis système réservés
      const systemShortcuts = [
        'CommandOrControl+C', 'CommandOrControl+V', 'CommandOrControl+X',
        'CommandOrControl+Z', 'CommandOrControl+Y', 'CommandOrControl+A',
        'Alt+F4', 'CommandOrControl+Alt+Delete'
      ];
      
      if (systemShortcuts.includes(accelerator)) {
        return { valid: false, reason: 'Reserved system shortcut' };
      }
      
      return { valid: true, accelerator };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Vérifie les conflits de raccourcis
   */
  checkConflict(accelerator, excludeWindowId = null) {
    for (const [windowId, shortcutInfo] of this.shortcuts) {
      if (windowId !== excludeWindowId && shortcutInfo.accelerator === accelerator) {
        return windowId;
      }
    }
    return null;
  }

  /**
   * Active tous les raccourcis
   */
  async activateAll() {
    const timer = performanceMonitor.startTimer('shortcuts_activation_all');
    
    this.active = true;
    let successCount = 0;
    let failureCount = 0;
    
    // Réenregistrer tous les raccourcis
    const shortcuts = Array.from(this.shortcuts.entries());
    
    for (const [windowId, info] of shortcuts) {
      try {
        const success = await this.registerGlobalShortcut(info.accelerator, windowId, info.callback);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`ShortcutManagerV2: Error reactivating shortcut for ${windowId}:`, error);
        failureCount++;
      }
    }
    
    timer.stop();
    
    console.log(`ShortcutManagerV2: Activated ${successCount}/${shortcuts.length} shortcuts (${failureCount} failures)`);
    
    // Émettre un événement
    eventBus.emit('shortcuts:activated', { successCount, failureCount, total: shortcuts.length });
  }

  /**
   * Désactive tous les raccourcis
   */
  deactivateAll() {
    const timer = performanceMonitor.startTimer('shortcuts_deactivation_all');
    
    this.active = false;
    
    try {
      globalShortcut.unregisterAll();
      this.registeredAccelerators.clear();
      console.log('ShortcutManagerV2: Deactivated all shortcuts');
      
      // Émettre un événement
      eventBus.emit('shortcuts:deactivated');
    } catch (error) {
      console.error('ShortcutManagerV2: Error deactivating shortcuts:', error);
    }
    
    timer.stop();
  }

  /**
   * Gère les alertes de performance
   */
  handlePerformanceAlert(alert) {
    console.warn(`ShortcutManagerV2: Performance alert for ${alert.operation}: ${alert.duration}ms`);
    
    // Si les activations sont trop lentes, optimiser
    if (alert.operation === 'shortcut_activation' && alert.severity === 'critical') {
      this.optimizeActivationProcess();
    }
  }

  /**
   * Optimise le processus d'activation
   */
  optimizeActivationProcess() {
    console.log('ShortcutManagerV2: Optimizing activation process due to performance issues');
    
    // Vider la queue si elle est trop pleine
    if (this.activationQueue.length > 10) {
      console.warn('ShortcutManagerV2: Clearing activation queue due to backlog');
      this.activationQueue.length = 0;
    }
    
    // Nettoyer le cache
    this.cache.cleanup();
  }

  /**
   * Obtient les statistiques de performance
   */
  getStats() {
    return {
      ...this.stats,
      activeShortcuts: this.shortcuts.size,
      registeredAccelerators: this.registeredAccelerators.size,
      queueLength: this.activationQueue.length,
      cacheStats: this.cache.getStats(),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2))
    };
  }

  /**
   * Obtient tous les raccourcis actifs
   */
  getAllShortcuts() {
    const shortcuts = {};
    this.shortcuts.forEach((info, windowId) => {
      shortcuts[windowId] = {
        original: info.original,
        accelerator: info.accelerator,
        activationCount: info.activationCount,
        registeredAt: new Date(info.registeredAt).toISOString()
      };
    });
    return shortcuts;
  }

  /**
   * Nettoyage complet
   */
  cleanup() {
    const timer = performanceMonitor.startTimer('shortcuts_cleanup');
    
    try {
      // Désenregistrer tous les raccourcis
      globalShortcut.unregisterAll();
      
      // Nettoyer les structures de données
      this.shortcuts.clear();
      this.registeredAccelerators.clear();
      this.activationQueue.length = 0;
      
      // Arrêter le nettoyage automatique du cache
      this.cache.stopAutoCleanup();
      this.cache.clear();
      
      console.log('ShortcutManagerV2: Complete cleanup performed');
      
      // Émettre un événement
      eventBus.emit('shortcuts:cleanup');
    } catch (error) {
      console.error('ShortcutManagerV2: Error during cleanup:', error);
    }
    
    timer.stop();
  }

  /**
   * Diagnostic complet du système
   */
  diagnose() {
    const stats = this.getStats();
    const metrics = performanceMonitor.getMetrics();
    const alerts = performanceMonitor.getAlerts(5);
    
    return {
      status: stats.avgActivationTime < 50 ? 'healthy' : 'degraded',
      stats,
      performance: {
        shortcutActivation: metrics.shortcut_activation || null,
        shortcutRegistration: metrics.shortcut_registration || null
      },
      recentAlerts: alerts,
      recommendations: this.generateRecommendations(stats, metrics)
    };
  }

  /**
   * Génère des recommandations d'optimisation
   */
  generateRecommendations(stats, metrics) {
    const recommendations = [];
    
    if (stats.avgActivationTime > 100) {
      recommendations.push('Consider reducing the number of active shortcuts');
    }
    
    if (stats.queueLength > 5) {
      recommendations.push('Activation queue is backing up - check for slow callbacks');
    }
    
    if (stats.failures / stats.activations > 0.05) {
      recommendations.push('High failure rate detected - check shortcut conflicts');
    }
    
    const cacheHitRate = parseFloat(stats.cacheStats.hitRate);
    if (cacheHitRate < 80) {
      recommendations.push('Low cache hit rate - consider increasing cache size');
    }
    
    return recommendations;
  }
}

module.exports = ShortcutManagerV2;