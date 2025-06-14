const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * WindowManager v2.4 - NO TIMEOUT: Remove timeout that was causing false failures
 * CRITICAL FIX: Let PowerShell take the time it needs without timeout interference
 */
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.windowCache = new CacheManager({ maxSize: 50, defaultTTL: 2000 });
    this.activationCache = new CacheManager({ maxSize: 20, defaultTTL: 500 });
    this.isScanning = false;
    this.lastSuccessfulScan = 0;
    this.consecutiveFailures = 0;
    this.lastDetectedWindows = [];
    this.stats = {
      scans: 0,
      activations: 0,
      failures: 0,
      cacheHits: 0,
      avgScanTime: 0,
      avgActivationTime: 0,
      successRate: 100
    };

    this.platformManager = this.createPlatformManager();

    console.log('WindowManager: Initialized with NO TIMEOUT for reliable activation');
  }

  /**
   * SIMPLIFIED: Creates platform-specific manager with fail-fast approach
   */
  createPlatformManager() {
    try {
      if (process.platform === 'win32') {
        const WindowManagerWindows = require('./WindowManagerWindows');
        const manager = new WindowManagerWindows();
        console.log('WindowManager: Windows platform manager created');
        return manager;
      } else {
        console.warn('WindowManager: Non-Windows platform detected - limited functionality');
        return {
          getDofusWindows: async () => {
            console.log('WindowManager: Linux/macOS support not implemented');
            return [];
          },
          activateWindow: async () => false,
          getDofusClasses: () => ({}),
          setWindowClass: () => false,
          organizeWindows: () => false,
          cleanup: () => {}
        };
      }
    } catch (error) {
      console.error('WindowManager: Failed to create platform manager:', error);
      return null;
    }
  }

  /**
   * CRITICAL FIX: Direct window detection with guaranteed return
   */
  async getDofusWindows() {
    const startTime = Date.now();

    try {
      console.log('WindowManager: CRITICAL FIX - Starting guaranteed detection...');
      console.log('WindowManager: Bypassing cache for guaranteed fresh detection');

      if (!this.platformManager) {
        console.error('WindowManager: No platform manager - returning last detected windows');
        return this.lastDetectedWindows;
      }

      if (this.isScanning) {
        console.log('WindowManager: Scan in progress - returning last detected windows');
        return this.lastDetectedWindows;
      }

      this.isScanning = true;
      this.stats.scans++;

      console.log('WindowManager: Starting platform detection with guaranteed return...');

      const windows = await this.performGuaranteedDetection();

      if (windows && Array.isArray(windows)) {
        this.lastDetectedWindows = windows;
        console.log(`WindowManager: CRITICAL FIX - Updated lastDetectedWindows with ${windows.length} windows`);
        
        this.windowCache.set('windows', windows);
        this.lastSuccessfulScan = Date.now();
        this.consecutiveFailures = 0;
      } else {
        console.warn('WindowManager: Invalid windows data, keeping last detected');
        this.consecutiveFailures++;
      }

      const duration = Date.now() - startTime;
      this.updateScanStats(duration);

      console.log(`WindowManager: CRITICAL FIX - Returning ${this.lastDetectedWindows.length} windows in ${duration}ms`);
      return this.lastDetectedWindows;

    } catch (error) {
      console.error('WindowManager: Detection failed:', error.message);
      this.stats.failures++;
      this.consecutiveFailures++;
      
      console.log(`WindowManager: Error fallback - returning ${this.lastDetectedWindows.length} last detected windows`);
      return this.lastDetectedWindows;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * CRITICAL FIX: Guaranteed detection with proper error handling
   */
  async performGuaranteedDetection() {
    try {
      console.log('WindowManager: Performing guaranteed platform detection...');

      // REMOVED: No timeout - let platform manager take the time it needs
      const windows = await this.platformManager.getDofusWindows();

      console.log(`WindowManager: Platform detection returned ${windows ? windows.length : 'null'} windows`);
      return this.validateAndEnsureArray(windows);

    } catch (error) {
      console.warn('WindowManager: Platform detection failed:', error.message);
      return [];
    }
  }

  /**
   * CRITICAL: Ensure we always return a valid array
   */
  validateAndEnsureArray(windows) {
    if (!windows) {
      console.log('WindowManager: Null/undefined windows, returning empty array');
      return [];
    }

    if (!Array.isArray(windows)) {
      console.warn('WindowManager: Invalid windows data - not an array, returning empty array');
      return [];
    }

    const validWindows = windows.filter(window => 
      window && 
      window.id && 
      typeof window.id === 'string' &&
      window.title &&
      window.character
    );

    console.log(`WindowManager: Validated ${validWindows.length}/${windows.length} windows`);
    return validWindows;
  }

  /**
   * NO TIMEOUT: Direct activation without timeout interference
   */
  async activateWindow(windowId) {
    const startTime = Date.now();

    try {
      if (!windowId) {
        console.warn('WindowManager: No windowId provided');
        return false;
      }

      const cacheKey = `act_${windowId}`;
      if (this.activationCache.get(cacheKey)) {
        console.log(`WindowManager: Recent activation cached for ${windowId}`);
        return true;
      }

      this.stats.activations++;

      if (!this.platformManager) {
        console.error('WindowManager: No platform manager for activation');
        return false;
      }

      console.log(`WindowManager: NO TIMEOUT activation for ${windowId}`);

      // REMOVED: No timeout - let platform manager take the time it needs
      const success = await this.platformManager.activateWindow(windowId);

      const duration = Date.now() - startTime;

      if (success) {
        this.activationCache.set(cacheKey, true);
        this.updateActivationStats(duration, true);
        this.updateActiveStateMinimal(windowId);

        eventBus.emit('window:activated', { windowId, duration });
        console.log(`WindowManager: NO TIMEOUT activation SUCCESS for ${windowId} in ${duration}ms`);
        return true;
      } else {
        this.updateActivationStats(duration, false);
        console.warn(`WindowManager: NO TIMEOUT activation FAILED for ${windowId}`);
        eventBus.emit('window:activation_failed', { windowId });
        return false;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`WindowManager: NO TIMEOUT activation error for ${windowId}:`, error.message);
      this.updateActivationStats(duration, false);
      return false;
    }
  }

  /**
   * MINIMAL: Update active state with minimal processing
   */
  updateActiveStateMinimal(activeWindowId) {
    this.lastDetectedWindows.forEach(window => {
      if (window && window.id) {
        window.isActive = window.id === activeWindowId;
      }
    });

    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * SIMPLIFIED: Window organization with direct delegation
   */
  async organizeWindows(layout = 'grid') {
    const startTime = Date.now();

    try {
      if (!this.platformManager) {
        console.warn('WindowManager: No platform manager for organization');
        return false;
      }

      console.log(`WindowManager: Organizing windows in ${layout} layout`);

      // REMOVED: No timeout for organization
      const success = await this.platformManager.organizeWindows(layout);

      const duration = Date.now() - startTime;

      if (success) {
        this.invalidateCache();
        eventBus.emit('windows:organized', { layout, duration });
        console.log(`WindowManager: Organized windows in ${duration}ms`);
      }

      return success;
    } catch (error) {
      console.error('WindowManager: Organization failed:', error.message);
      return false;
    }
  }

  /**
   * FAST: Cache invalidation
   */
  invalidateCache() {
    this.windowCache.clear();
    this.activationCache.clear();
    console.log('WindowManager: Caches invalidated');
  }

  /**
   * OPTIMIZED: Statistics tracking with minimal overhead
   */
  updateScanStats(duration) {
    const count = this.stats.scans;
    this.stats.avgScanTime = ((this.stats.avgScanTime * (count - 1)) + duration) / count;
    this.updateSuccessRate();
  }

  updateActivationStats(duration, success) {
    if (!success) {
      this.stats.failures++;
    }
    
    const count = this.stats.activations;
    this.stats.avgActivationTime = ((this.stats.avgActivationTime * (count - 1)) + duration) / count;
    this.updateSuccessRate();
  }

  updateSuccessRate() {
    const total = this.stats.scans + this.stats.activations;
    if (total > 0) {
      this.stats.successRate = ((total - this.stats.failures) / total * 100);
    }
  }

  /**
   * FAST: Performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgScanTime: parseFloat(this.stats.avgScanTime.toFixed(2)),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      successRate: parseFloat(this.stats.successRate.toFixed(1)),
      consecutiveFailures: this.consecutiveFailures,
      cacheHitRate: this.stats.scans > 0 ? (this.stats.cacheHits / this.stats.scans * 100).toFixed(1) : 0,
      lastSuccessfulScan: this.lastSuccessfulScan,
      windowCacheSize: this.windowCache.cache.size,
      activationCacheSize: this.activationCache.cache.size,
      lastDetectedCount: this.lastDetectedWindows.length
    };
  }

  /**
   * DIRECT: Class management delegation
   */
  getDofusClasses() {
    return this.platformManager ? this.platformManager.getDofusClasses() : {};
  }

  setWindowClass(windowId, classKey) {
    return this.platformManager ? this.platformManager.setWindowClass(windowId, classKey) : false;
  }

  /**
   * FAST: Resource cleanup
   */
  cleanup() {
    const startTime = Date.now();

    try {
      this.windowCache.clear();
      this.activationCache.clear();
      this.windows.clear();
      this.lastDetectedWindows = [];

      if (this.platformManager && typeof this.platformManager.cleanup === 'function') {
        this.platformManager.cleanup();
      }

      const duration = Date.now() - startTime;
      console.log(`WindowManager: Cleanup completed in ${duration}ms`);
      
      const finalStats = this.getStats();
      console.log('WindowManager: Final performance stats:', finalStats);

      eventBus.emit('windows:cleanup', finalStats);
    } catch (error) {
      console.error('WindowManager: Cleanup error:', error);
    }
  }

  /**
   * NEW: Health check for diagnostics
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

  determineHealthStatus(stats, timeSinceLastScan) {
    if (stats.successRate < 80 || this.consecutiveFailures > 5) {
      return 'critical';
    }
    if (stats.avgScanTime > 100 || stats.avgActivationTime > 200) {
      return 'degraded';
    }
    if (timeSinceLastScan > 30000) {
      return 'stale';
    }
    return 'healthy';
  }

  identifyIssues(stats, timeSinceLastScan) {
    const issues = [];
    
    if (stats.successRate < 90) {
      issues.push(`Low success rate: ${stats.successRate}%`);
    }
    if (stats.avgScanTime > 100) {
      issues.push(`Slow detection: ${stats.avgScanTime}ms avg`);
    }
    if (stats.avgActivationTime > 200) {
      issues.push(`Slow activation: ${stats.avgActivationTime}ms avg`);
    }
    if (this.consecutiveFailures > 3) {
      issues.push(`${this.consecutiveFailures} consecutive failures`);
    }
    if (timeSinceLastScan > 10000) {
      issues.push(`No successful scan for ${Math.round(timeSinceLastScan/1000)}s`);
    }

    return issues;
  }

  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.avgScanTime > 100) {
      recommendations.push('Consider increasing cache TTL');
    }
    if (stats.successRate < 90) {
      recommendations.push('Check platform manager implementation');
    }
    if (this.consecutiveFailures > 3) {
      recommendations.push('Restart application or check system resources');
    }
    if (stats.cacheHitRate < 50) {
      recommendations.push('Optimize caching strategy');
    }

    return recommendations;
  }
}

module.exports = WindowManager;