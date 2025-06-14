const { globalShortcut } = require('electron');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * ShortcutManager v2.5 - Optimisé pour performance maximale
 */
class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.active = false;
    this.registeredAccelerators = new Set();
    this.cache = new CacheManager({ maxSize: 100, defaultTTL: 300000 });
    
    this.activeConcurrentActivations = 0;
    this.maxConcurrentActivations = 3;
    
    this.stats = {
      activations: 0,
      failures: 0,
      conflicts: 0,
      avgActivationTime: 0,
      concurrentActivations: 0
    };

    this.cache.startAutoCleanup(300000);

    console.log('ShortcutManager: Initialized with optimized performance');

    eventBus.on('performance:alert', (alert) => {
      if (alert.operation.startsWith('shortcut_')) {
        this.handlePerformanceAlert(alert);
      }
    });
  }

  /**
   * Enregistrement ultra-rapide de raccourci
   */
  async setWindowShortcut(windowId, shortcut, callback) {
    const startTime = Date.now();

    try {
      await this.removeWindowShortcut(windowId);

      if (!shortcut || !callback) {
        return false;
      }

      const accelerator = this.convertShortcutToAccelerator(shortcut);
      if (!accelerator) {
        console.warn(`ShortcutManager: Invalid shortcut format: ${shortcut}`);
        return false;
      }

      const conflict = this.checkConflictFast(accelerator, windowId);
      if (conflict) {
        console.warn(`ShortcutManager: Shortcut conflict: ${accelerator} used by ${conflict}`);
        this.stats.conflicts++;
        return false;
      }

      const success = await this.registerGlobalShortcutFast(accelerator, windowId, callback);

      if (success) {
        this.shortcuts.set(windowId, {
          accelerator,
          callback,
          original: shortcut,
          registeredAt: Date.now(),
          activationCount: 0
        });

        this.registeredAccelerators.add(accelerator);
        this.cache.set(`shortcut_${windowId}`, { accelerator, original: shortcut });

        const duration = Date.now() - startTime;
        console.log(`ShortcutManager: Registered ${accelerator} for ${windowId} in ${duration}ms`);

        eventBus.emit('shortcut:registered', { windowId, shortcut, accelerator });
        return true;
      }

      return false;
    } catch (error) {
      console.error('ShortcutManager: Registration error:', error);
      return false;
    }
  }

  /**
   * Enregistrement direct sans retry
   */
  async registerGlobalShortcutFast(accelerator, windowId, callback) {
    try {
      const success = globalShortcut.register(accelerator, () => {
        this.executeShortcutDirect(windowId, accelerator, callback);
      });

      if (!success) {
        console.warn(`ShortcutManager: Failed to register ${accelerator}`);
      }

      return success;
    } catch (error) {
      console.error(`ShortcutManager: Registration failed for ${accelerator}:`, error);
      return false;
    }
  }

  /**
   * Exécution directe sans timeout
   */
  executeShortcutDirect(windowId, accelerator, callback) {
    // Vérifier la limite de concurrence
    if (this.activeConcurrentActivations >= this.maxConcurrentActivations) {
      console.warn(`ShortcutManager: Concurrency limit reached, skipping activation`);
      return;
    }

    this.activeConcurrentActivations++;
    this.stats.concurrentActivations = Math.max(this.stats.concurrentActivations, this.activeConcurrentActivations);

    // Exécuter immédiatement
    this.processActivationNoTimeout(windowId, accelerator, callback)
      .finally(() => {
        this.activeConcurrentActivations--;
      });
  }

  /**
   * Traitement d'activation sans timeout
   */
  async processActivationNoTimeout(windowId, accelerator, callback) {
    const startTime = Date.now();

    try {
      console.log(`ShortcutManager: Activation ${accelerator} for ${windowId}`);

      const shortcutInfo = this.shortcuts.get(windowId);
      if (shortcutInfo) {
        shortcutInfo.activationCount++;
      }
      this.stats.activations++;

      await callback();

      const duration = Date.now() - startTime;
      this.updateAverageActivationTime(duration);

      eventBus.emit('shortcut:activated', {
        windowId,
        accelerator,
        duration
      });

      console.log(`ShortcutManager: Activation SUCCESS for ${windowId} in ${duration}ms`);

    } catch (error) {
      console.error('ShortcutManager: Activation error:', error);
      this.stats.failures++;

      eventBus.emit('shortcut:error', {
        windowId,
        accelerator,
        error: error.message
      });
    }
  }

  /**
   * Calcul rapide de la moyenne
   */
  updateAverageActivationTime(duration) {
    const count = this.stats.activations;
    const current = this.stats.avgActivationTime;
    this.stats.avgActivationTime = ((current * (count - 1)) + duration) / count;
  }

  /**
   * Conversion optimisée d'accélérateur
   */
  convertShortcutToAccelerator(shortcut) {
    if (!shortcut) return '';

    const cached = this.cache.get(`accel_${shortcut}`);
    if (cached) {
      return cached;
    }

    const normalized = shortcut.trim().replace(/\s*\+\s*/g, '+');
    const result = this.fastConvertParts(normalized);
    
    this.cache.set(`accel_${shortcut}`, result);
    return result;
  }

  /**
   * Conversion rapide pré-compilée
   */
  fastConvertParts(shortcut) {
    const modifiers = {
      'ctrl': 'CommandOrControl',
      'control': 'CommandOrControl', 
      'cmd': 'CommandOrControl',
      'alt': 'Alt',
      'shift': 'Shift'
    };

    const specialKeys = {
      'space': 'Space',
      'enter': 'Return',
      'esc': 'Escape',
      'tab': 'Tab',
      'delete': 'Delete',
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
    };

    const parts = shortcut.split('+');
    const processed = [];

    for (const part of parts) {
      const lower = part.toLowerCase().trim();
      
      if (modifiers[lower]) {
        processed.push(modifiers[lower]);
      } else if (specialKeys[lower]) {
        processed.push(specialKeys[lower]);
      } else if (lower.length === 1 && /[a-z0-9]/.test(lower)) {
        processed.push(lower.toUpperCase());
      } else if (lower.length === 1) {
        processed.push(part);
      } else {
        processed.push(part.toUpperCase());
      }
    }

    return processed.join('+');
  }

  /**
   * Suppression rapide de raccourci
   */
  async removeWindowShortcut(windowId) {
    try {
      const shortcutInfo = this.shortcuts.get(windowId);
      if (shortcutInfo) {
        try {
          globalShortcut.unregister(shortcutInfo.accelerator);
          this.registeredAccelerators.delete(shortcutInfo.accelerator);
        } catch (error) {
          console.warn(`ShortcutManager: Error unregistering ${shortcutInfo.accelerator}:`, error);
        }

        this.shortcuts.delete(windowId);
        this.cache.delete(`shortcut_${windowId}`);

        console.log(`ShortcutManager: Removed shortcut for ${windowId}`);
        eventBus.emit('shortcut:removed', { windowId, accelerator: shortcutInfo.accelerator });

        return true;
      }

      return false;
    } catch (error) {
      console.error('ShortcutManager: Error removing shortcut:', error);
      return false;
    }
  }

  /**
   * Vérification rapide de conflit
   */
  checkConflictFast(accelerator, excludeWindowId = null) {
    for (const [windowId, shortcutInfo] of this.shortcuts) {
      if (windowId !== excludeWindowId && shortcutInfo.accelerator === accelerator) {
        return windowId;
      }
    }
    return null;
  }

  /**
   * Validation simplifiée
   */
  validateShortcut(shortcut) {
    if (!shortcut) return { valid: false, reason: 'Empty shortcut' };

    try {
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      
      if (!accelerator) {
        return { valid: false, reason: 'Invalid format' };
      }

      const conflict = this.checkConflictFast(accelerator);
      if (conflict) {
        return { valid: false, reason: `Conflict with ${conflict}` };
      }

      const reserved = ['CommandOrControl+C', 'CommandOrControl+V', 'Alt+F4'];
      if (reserved.includes(accelerator)) {
        return { valid: false, reason: 'Reserved system shortcut' };
      }

      return { valid: true, accelerator };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Activation parallèle rapide
   */
  async activateAll() {
    const startTime = Date.now();
    
    this.active = true;
    
    const shortcuts = Array.from(this.shortcuts.entries());
    const registrationPromises = shortcuts.map(async ([windowId, info]) => {
      try {
        return await this.registerGlobalShortcutFast(info.accelerator, windowId, info.callback);
      } catch (error) {
        console.error(`ShortcutManager: Error reactivating ${windowId}:`, error);
        return false;
      }
    });

    const results = await Promise.all(registrationPromises);
    const successCount = results.filter(r => r).length;
    const failureCount = results.length - successCount;

    const duration = Date.now() - startTime;
    console.log(`ShortcutManager: Activated ${successCount}/${shortcuts.length} shortcuts in ${duration}ms`);

    eventBus.emit('shortcuts:activated', { successCount, failureCount, total: shortcuts.length });
  }

  /**
   * Désactivation rapide
   */
  deactivateAll() {
    this.active = false;

    try {
      globalShortcut.unregisterAll();
      this.registeredAccelerators.clear();
      
      console.log('ShortcutManager: Deactivated all shortcuts');
      eventBus.emit('shortcuts:deactivated');
    } catch (error) {
      console.error('ShortcutManager: Error deactivating shortcuts:', error);
    }
  }

  /**
   * Gestion d'alerte de performance
   */
  handlePerformanceAlert(alert) {
    console.warn(`ShortcutManager: Performance alert: ${alert.operation} ${alert.duration}ms`);

    if (alert.operation === 'shortcut_activation' && alert.severity === 'critical') {
      if (this.maxConcurrentActivations > 1) {
        this.maxConcurrentActivations--;
        console.log(`ShortcutManager: Reduced max concurrency to ${this.maxConcurrentActivations}`);
      }
    }
  }

  /**
   * Statistiques complètes
   */
  getStats() {
    return {
      ...this.stats,
      activeShortcuts: this.shortcuts.size,
      registeredAccelerators: this.registeredAccelerators.size,
      activeConcurrentActivations: this.activeConcurrentActivations,
      maxConcurrentActivations: this.maxConcurrentActivations,
      cacheStats: this.cache.getStats(),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Calcul du taux de succès
   */
  calculateSuccessRate() {
    const total = this.stats.activations;
    if (total === 0) return 100;
    return parseFloat(((total - this.stats.failures) / total * 100).toFixed(1));
  }

  /**
   * Obtenir tous les raccourcis
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
   * Nettoyage efficace
   */
  cleanup() {
    const startTime = Date.now();

    try {
      globalShortcut.unregisterAll();
      this.shortcuts.clear();
      this.registeredAccelerators.clear();
      this.cache.stopAutoCleanup();
      this.cache.clear();

      const duration = Date.now() - startTime;
      console.log(`ShortcutManager: Cleanup completed in ${duration}ms`);

      const finalStats = this.getStats();
      console.log('ShortcutManager: Final stats:', finalStats);

      eventBus.emit('shortcuts:cleanup', finalStats);
    } catch (error) {
      console.error('ShortcutManager: Cleanup error:', error);
    }
  }
}

module.exports = ShortcutManager;