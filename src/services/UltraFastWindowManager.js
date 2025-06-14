const WindowManager = require('./WindowManager');
const UltraFastWindowManagerWindows = require('./UltraFastWindowManagerWindows');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');

/**
 * UltraFastWindowManager - Gestionnaire ultra-rapide pour activation <100ms
 * Remplace complètement l'ancien système lent
 */
class UltraFastWindowManager {
  constructor() {
    this.lastDetectedWindows = [];
    this.isScanning = false;
    this.consecutiveFailures = 0;
    this.lastSuccessfulScan = 0;
    
    // Statistiques globales
    this.stats = {
      scans: 0,
      activations: 0,
      failures: 0,
      avgScanTime: 0,
      avgActivationTime: 0,
      successRate: 100,
      ultraFastActivations: 0 // <100ms
    };

    // Gestionnaire spécifique à la plateforme
    this.platformManager = this.createUltraFastPlatformManager();

    console.log('UltraFastWindowManager: Initialized for <100ms activation');
  }

  /**
   * Création du gestionnaire ultra-rapide
   */
  createUltraFastPlatformManager() {
    try {
      if (process.platform === 'win32') {
        const manager = new UltraFastWindowManagerWindows();
        console.log('UltraFastWindowManager: Ultra-fast Windows manager created');
        return manager;
      } else {
        console.warn('UltraFastWindowManager: Non-Windows platform - using fallback');
        return {
          getDofusWindows: async () => [],
          activateWindow: async () => false,
          getDofusClasses: () => ({}),
          setWindowClass: () => false,
          cleanup: () => {}
        };
      }
    } catch (error) {
      console.error('UltraFastWindowManager: Failed to create ultra-fast platform manager:', error);
      return null;
    }
  }

  /**
   * Activation ultra-rapide de fenêtre - OBJECTIF <100ms
   */
  async activateWindow(windowId) {
    const startTime = Date.now();

    try {
      if (!windowId) {
        console.warn('UltraFastWindowManager: No windowId provided');
        return false;
      }

      if (!this.platformManager) {
        console.error('UltraFastWindowManager: No platform manager');
        return false;
      }

      console.log(`UltraFastWindowManager: Ultra-fast activation for ${windowId}`);

      // Activation ultra-rapide directe
      const success = await this.platformManager.activateWindow(windowId);

      const duration = Date.now() - startTime;
      this.updateActivationStats(duration, success);

      if (success) {
        this.updateActiveStateUltraFast(windowId);
        
        // Émettre l'événement avec métriques
        eventBus.emit('window:activated_ultra_fast', { 
          windowId, 
          duration,
          ultraFast: duration < 100
        });
        
        console.log(`UltraFastWindowManager: SUCCESS in ${duration}ms ${duration < 100 ? '⚡' : '⚠️'}`);
        return true;
      } else {
        console.warn(`UltraFastWindowManager: FAILED in ${duration}ms`);
        eventBus.emit('window:activation_failed', { windowId });
        return false;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`UltraFastWindowManager: Error in ${duration}ms:`, error.message);
      this.updateActivationStats(duration, false);
      return false;
    }
  }

  /**
   * Détection ultra-rapide des fenêtres
   */
  async getDofusWindows() {
    const startTime = Date.now();

    try {
      console.log('UltraFastWindowManager: Starting ultra-fast detection...');

      if (!this.platformManager) {
        console.error('UltraFastWindowManager: No platform manager - returning last detected');
        return this.lastDetectedWindows;
      }

      if (this.isScanning) {
        console.log('UltraFastWindowManager: Scan in progress - returning cached');
        return this.lastDetectedWindows;
      }

      this.isScanning = true;
      this.stats.scans++;

      // Détection ultra-rapide
      const windows = await this.platformManager.getDofusWindows();

      if (windows && Array.isArray(windows)) {
        this.lastDetectedWindows = windows;
        this.lastSuccessfulScan = Date.now();
        this.consecutiveFailures = 0;
        
        console.log(`UltraFastWindowManager: Detected ${windows.length} windows`);
      } else {
        console.warn('UltraFastWindowManager: Invalid detection result');
        this.consecutiveFailures++;
      }

      const duration = Date.now() - startTime;
      this.updateScanStats(duration);

      console.log(`UltraFastWindowManager: Detection completed in ${duration}ms`);
      return this.lastDetectedWindows;

    } catch (error) {
      console.error('UltraFastWindowManager: Detection failed:', error.message);
      this.stats.failures++;
      this.consecutiveFailures++;
      return this.lastDetectedWindows;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Mise à jour ultra-rapide de l'état actif
   */
  updateActiveStateUltraFast(activeWindowId) {
    // Mise à jour directe et rapide
    this.lastDetectedWindows.forEach(window => {
      if (window && window.id) {
        window.isActive = window.id === activeWindowId;
      }
    });
  }

  /**
   * Activation de la fenêtre suivante ultra-rapide
   */
  async activateNextWindow() {
    return performanceMonitor.measureAsync('ultra_fast_next_window', async () => {
      const enabledWindows = this.lastDetectedWindows.filter(w => w.enabled);
      if (enabledWindows.length === 0) return false;

      // Tri ultra-rapide par initiative
      enabledWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });

      // Trouver la fenêtre suivante
      const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);
      const nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
      const nextWindow = enabledWindows[nextIndex];

      if (nextWindow) {
        console.log(`UltraFastWindowManager: Next window: ${nextWindow.character}`);
        return await this.activateWindow(nextWindow.id);
      }

      return false;
    });
  }

  /**
   * Mise à jour des statistiques de scan
   */
  updateScanStats(duration) {
    const count = this.stats.scans;
    this.stats.avgScanTime = ((this.stats.avgScanTime * (count - 1)) + duration) / count;
    this.updateSuccessRate();
  }

  /**
   * Mise à jour des statistiques d'activation
   */
  updateActivationStats(duration, success) {
    this.stats.activations++;
    
    if (!success) {
      this.stats.failures++;
    } else if (duration < 100) {
      this.stats.ultraFastActivations++;
    }
    
    const count = this.stats.activations;
    this.stats.avgActivationTime = ((this.stats.avgActivationTime * (count - 1)) + duration) / count;
    this.updateSuccessRate();
  }

  /**
   * Mise à jour du taux de succès
   */
  updateSuccessRate() {
    const total = this.stats.scans + this.stats.activations;
    if (total > 0) {
      this.stats.successRate = ((total - this.stats.failures) / total * 100);
    }
  }

  /**
   * Statistiques ultra-rapides
   */
  getStats() {
    const platformStats = this.platformManager ? this.platformManager.getPerformanceStats() : {};
    
    return {
      ...this.stats,
      avgScanTime: parseFloat(this.stats.avgScanTime.toFixed(2)),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      successRate: parseFloat(this.stats.successRate.toFixed(1)),
      ultraFastRate: this.stats.activations > 0 ? 
        parseFloat((this.stats.ultraFastActivations / this.stats.activations * 100).toFixed(1)) : 0,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulScan: this.lastSuccessfulScan,
      lastDetectedCount: this.lastDetectedWindows.length,
      platform: platformStats,
      target: '<100ms activation',
      status: this.stats.avgActivationTime < 100 ? 'EXCELLENT' : 
              this.stats.avgActivationTime < 200 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }

  /**
   * Rapport de santé ultra-rapide
   */
  getHealthStatus() {
    const stats = this.getStats();
    const now = Date.now();
    const timeSinceLastScan = now - this.lastSuccessfulScan;

    return {
      status: this.determineHealthStatus(stats, timeSinceLastScan),
      stats: stats,
      issues: this.identifyIssues(stats, timeSinceLastScan),
      recommendations: this.generateRecommendations(stats),
      lastDetectedWindows: this.lastDetectedWindows.length
    };
  }

  /**
   * Détermination du statut de santé
   */
  determineHealthStatus(stats, timeSinceLastScan) {
    if (stats.successRate < 80 || this.consecutiveFailures > 5) {
      return 'critical';
    }
    if (stats.avgActivationTime > 100 || stats.avgScanTime > 100) {
      return 'degraded';
    }
    if (timeSinceLastScan > 30000) {
      return 'stale';
    }
    return 'excellent';
  }

  /**
   * Identification des problèmes
   */
  identifyIssues(stats, timeSinceLastScan) {
    const issues = [];
    
    if (stats.avgActivationTime > 100) {
      issues.push(`Slow activation: ${stats.avgActivationTime}ms (target: <100ms)`);
    }
    if (stats.ultraFastRate < 80) {
      issues.push(`Low ultra-fast rate: ${stats.ultraFastRate}% (target: >80%)`);
    }
    if (stats.successRate < 95) {
      issues.push(`Low success rate: ${stats.successRate}%`);
    }
    if (this.consecutiveFailures > 3) {
      issues.push(`${this.consecutiveFailures} consecutive failures`);
    }

    return issues;
  }

  /**
   * Génération de recommandations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.avgActivationTime > 100) {
      recommendations.push('Optimize PowerShell commands or use native module');
    }
    if (stats.ultraFastRate < 80) {
      recommendations.push('Increase cache usage and reduce command complexity');
    }
    if (stats.successRate < 95) {
      recommendations.push('Check system resources and window handles');
    }

    return recommendations;
  }

  // Méthodes déléguées
  getDofusClasses() {
    return this.platformManager ? this.platformManager.getDofusClasses() : {};
  }

  setWindowClass(windowId, classKey) {
    return this.platformManager ? this.platformManager.setWindowClass(windowId, classKey) : false;
  }

  /**
   * Nettoyage ultra-rapide
   */
  cleanup() {
    const startTime = Date.now();

    try {
      this.lastDetectedWindows = [];

      if (this.platformManager && typeof this.platformManager.cleanup === 'function') {
        this.platformManager.cleanup();
      }

      const duration = Date.now() - startTime;
      console.log(`UltraFastWindowManager: Cleanup completed in ${duration}ms`);
      
      const finalStats = this.getStats();
      console.log('UltraFastWindowManager: Final ultra-fast stats:', finalStats);

      eventBus.emit('windows:cleanup_ultra_fast', finalStats);
    } catch (error) {
      console.error('UltraFastWindowManager: Cleanup error:', error);
    }
  }
}

module.exports = UltraFastWindowManager;