const { globalShortcut } = require('electron');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * ShortcutManager v2.3 - ULTRA-OPTIMIZED: Direct activation with parallel processing
 * CRITICAL FIXES: Removed sequential queue bottleneck, implemented parallel processing
 */
class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.active = false;
    this.registeredAccelerators = new Set();
    this.cache = new CacheManager({ maxSize: 100, defaultTTL: 300000 }); // Reduced cache size
    this.conflictResolver = new Map();
    
    // REMOVED: Problematic sequential queue system
    // NEW: Direct activation with concurrency control
    this.activeConcurrentActivations = 0;
    this.maxConcurrentActivations = 3;
    this.activationTimeouts = new Map();
    
    this.stats = {
      activations: 0,
      failures: 0,
      conflicts: 0,
      avgActivationTime: 0,
      concurrentActivations: 0,
      timeouts: 0
    };

    // Optimized cache cleanup - less frequent
    this.cache.startAutoCleanup(300000); // 5 minutes

    console.log('ShortcutManager: Initialized with ULTRA-OPTIMIZED parallel processing');

    // Performance monitoring
    eventBus.on('performance:alert', (alert) => {
      if (alert.operation.startsWith('shortcut_')) {
        this.handlePerformanceAlert(alert);
      }
    });
  }

  /**
   * ULTRA-FAST: Shortcut registration with minimal overhead
   */
  async setWindowShortcut(windowId, shortcut, callback) {
    const startTime = Date.now();

    try {
      // Fast removal of existing shortcut
      await this.removeWindowShortcut(windowId);

      if (!shortcut || !callback) {
        return false;
      }

      // Ultra-fast validation and conversion
      const accelerator = this.convertShortcutToAcceleratorFast(shortcut);
      if (!accelerator) {
        console.warn(`ShortcutManager: Invalid shortcut format: ${shortcut}`);
        return false;
      }

      // Quick conflict check
      const conflict = this.checkConflictFast(accelerator, windowId);
      if (conflict) {
        console.warn(`ShortcutManager: Shortcut conflict: ${accelerator} used by ${conflict}`);
        this.stats.conflicts++;
        return false;
      }

      // Direct registration without retry overhead
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

        // Minimal caching
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
   * ULTRA-FAST: Direct registration without retry overhead
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
   * ULTRA-FAST: Direct shortcut execution with parallel processing
   */
  executeShortcutDirect(windowId, accelerator, callback) {
    // Check concurrency limit
    if (this.activeConcurrentActivations >= this.maxConcurrentActivations) {
      console.warn(`ShortcutManager: Concurrency limit reached, skipping activation`);
      return;
    }

    this.activeConcurrentActivations++;
    this.stats.concurrentActivations = Math.max(this.stats.concurrentActivations, this.activeConcurrentActivations);

    // Execute immediately in parallel
    this.processActivationDirect(windowId, accelerator, callback)
      .finally(() => {
        this.activeConcurrentActivations--;
      });
  }

  /**
   * ULTRA-FAST: Direct activation processing without queue overhead
   */
  async processActivationDirect(windowId, accelerator, callback) {
    const startTime = Date.now();

    try {
      console.log(`ShortcutManager: Direct activation ${accelerator} for ${windowId}`);

      // Update stats
      const shortcutInfo = this.shortcuts.get(windowId);
      if (shortcutInfo) {
        shortcutInfo.activationCount++;
      }
      this.stats.activations++;

      // Set timeout for activation
      const timeoutId = setTimeout(() => {
        console.warn(`ShortcutManager: Activation timeout for ${windowId}`);
        this.stats.timeouts++;
      }, 100); // 100ms timeout

      this.activationTimeouts.set(windowId, timeoutId);

      // Execute callback directly
      await callback();

      // Clear timeout
      clearTimeout(timeoutId);
      this.activationTimeouts.delete(windowId);

      const duration = Date.now() - startTime;
      this.updateAverageActivationTime(duration);

      // Emit success event
      eventBus.emit('shortcut:activated', {
        windowId,
        accelerator,
        duration
      });

    } catch (error) {
      console.error('ShortcutManager: Activation error:', error);
      this.stats.failures++;

      // Clear timeout on error
      const timeoutId = this.activationTimeouts.get(windowId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.activationTimeouts.delete(windowId);
      }

      eventBus.emit('shortcut:error', {
        windowId,
        accelerator,
        error: error.message
      });
    }
  }

  /**
   * OPTIMIZED: Fast average calculation
   */
  updateAverageActivationTime(duration) {
    const count = this.stats.activations;
    const current = this.stats.avgActivationTime;
    this.stats.avgActivationTime = ((current * (count - 1)) + duration) / count;
  }

  /**
   * ULTRA-FAST: Shortcut removal with minimal overhead
   */
  async removeWindowShortcut(windowId) {
    try {
      const shortcutInfo = this.shortcuts.get(windowId);
      if (shortcutInfo) {
        // Clear any pending timeout
        const timeoutId = this.activationTimeouts.get(windowId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.activationTimeouts.delete(windowId);
        }

        // Unregister global shortcut
        try {
          globalShortcut.unregister(shortcutInfo.accelerator);
          this.registeredAccelerators.delete(shortcutInfo.accelerator);
        } catch (error) {
          console.warn(`ShortcutManager: Error unregistering ${shortcutInfo.accelerator}:`, error);
        }

        // Clean up data structures
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
   * ULTRA-FAST: Optimized accelerator conversion with minimal string processing
   */
  convertShortcutToAcceleratorFast(shortcut) {
    if (!shortcut) return '';

    // Quick cache check
    const cached = this.cache.get(`accel_${shortcut}`);
    if (cached) {
      return cached;
    }

    // Fast normalization
    const normalized = shortcut.trim().replace(/\s*\+\s*/g, '+');
    
    // Fast conversion with pre-compiled mappings
    const result = this.fastConvertParts(normalized);
    
    // Cache result
    this.cache.set(`accel_${shortcut}`, result);
    
    return result;
  }

  /**
   * OPTIMIZED: Pre-compiled fast conversion
   */
  fastConvertParts(shortcut) {
    // Fast lookup tables
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
   * FAST: Quick conflict check
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
   * FAST: Simplified validation
   */
  validateShortcut(shortcut) {
    if (!shortcut) return { valid: false, reason: 'Empty shortcut' };

    try {
      const accelerator = this.convertShortcutToAcceleratorFast(shortcut);
      
      if (!accelerator) {
        return { valid: false, reason: 'Invalid format' };
      }

      // Quick conflict check
      const conflict = this.checkConflictFast(accelerator);
      if (conflict) {
        return { valid: false, reason: `Conflict with ${conflict}` };
      }

      // Basic system shortcut check
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
   * FAST: Parallel activation of all shortcuts
   */
  async activateAll() {
    const startTime = Date.now();
    
    this.active = true;
    
    // Parallel registration for speed
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
   * FAST: Quick deactivation
   */
  deactivateAll() {
    this.active = false;

    try {
      // Clear all timeouts
      for (const timeoutId of this.activationTimeouts.values()) {
        clearTimeout(timeoutId);
      }
      this.activationTimeouts.clear();

      globalShortcut.unregisterAll();
      this.registeredAccelerators.clear();
      
      console.log('ShortcutManager: Deactivated all shortcuts');
      eventBus.emit('shortcuts:deactivated');
    } catch (error) {
      console.error('ShortcutManager: Error deactivating shortcuts:', error);
    }
  }

  /**
   * OPTIMIZED: Performance alert handling
   */
  handlePerformanceAlert(alert) {
    console.warn(`ShortcutManager: Performance alert: ${alert.operation} ${alert.duration}ms`);

    if (alert.operation === 'shortcut_activation' && alert.severity === 'critical') {
      // Reduce concurrency if needed
      if (this.maxConcurrentActivations > 1) {
        this.maxConcurrentActivations--;
        console.log(`ShortcutManager: Reduced max concurrency to ${this.maxConcurrentActivations}`);
      }
    }
  }

  /**
   * OPTIMIZED: Comprehensive statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeShortcuts: this.shortcuts.size,
      registeredAccelerators: this.registeredAccelerators.size,
      activeConcurrentActivations: this.activeConcurrentActivations,
      maxConcurrentActivations: this.maxConcurrentActivations,
      pendingTimeouts: this.activationTimeouts.size,
      cacheStats: this.cache.getStats(),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * NEW: Calculate success rate
   */
  calculateSuccessRate() {
    const total = this.stats.activations;
    if (total === 0) return 100;
    return parseFloat(((total - this.stats.failures) / total * 100).toFixed(1));
  }

  /**
   * OPTIMIZED: Get all shortcuts with minimal processing
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
   * FAST: Efficient cleanup
   */
  cleanup() {
    const startTime = Date.now();

    try {
      // Clear all timeouts first
      for (const timeoutId of this.activationTimeouts.values()) {
        clearTimeout(timeoutId);
      }
      this.activationTimeouts.clear();

      // Unregister all shortcuts
      globalShortcut.unregisterAll();

      // Clean up data structures
      this.shortcuts.clear();
      this.registeredAccelerators.clear();

      // Stop cache cleanup
      this.cache.stopAutoCleanup();
      this.cache.clear();

      const duration = Date.now() - startTime;
      console.log(`ShortcutManager: Cleanup completed in ${duration}ms`);

      // Final stats
      const finalStats = this.getStats();
      console.log('ShortcutManager: Final stats:', finalStats);

      eventBus.emit('shortcuts:cleanup', finalStats);
    } catch (error) {
      console.error('ShortcutManager: Cleanup error:', error);
    }
  }

  /**
   * NEW: Health diagnostics
   */
  diagnose() {
    const stats = this.getStats();
    
    return {
      status: this.determineHealthStatus(stats),
      stats: stats,
      issues: this.identifyIssues(stats),
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * NEW: Determine health status
   */
  determineHealthStatus(stats) {
    if (stats.successRate < 90 || stats.avgActivationTime > 100) {
      return 'critical';
    }
    if (stats.successRate < 95 || stats.avgActivationTime > 50) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * NEW: Identify performance issues
   */
  identifyIssues(stats) {
    const issues = [];
    
    if (stats.successRate < 95) {
      issues.push(`Low success rate: ${stats.successRate}%`);
    }
    if (stats.avgActivationTime > 50) {
      issues.push(`Slow activation: ${stats.avgActivationTime}ms avg`);
    }
    if (stats.conflicts > 5) {
      issues.push(`High conflict count: ${stats.conflicts}`);
    }
    if (stats.timeouts > 0) {
      issues.push(`Activation timeouts: ${stats.timeouts}`);
    }
    if (stats.pendingTimeouts > 0) {
      issues.push(`Pending timeouts: ${stats.pendingTimeouts}`);
    }

    return issues;
  }

  /**
   * NEW: Generate optimization recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.avgActivationTime > 50) {
      recommendations.push('Reduce callback complexity or increase concurrency limit');
    }
    if (stats.successRate < 95) {
      recommendations.push('Check system resources and shortcut conflicts');
    }
    if (stats.conflicts > 3) {
      recommendations.push('Review shortcut assignments to reduce conflicts');
    }
    if (stats.timeouts > 0) {
      recommendations.push('Optimize window activation callbacks');
    }
    if (stats.pendingTimeouts > 1) {
      recommendations.push('Consider increasing activation timeout threshold');
    }

    return recommendations;
  }
}

module.exports = ShortcutManager;