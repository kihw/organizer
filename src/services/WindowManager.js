const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * WindowManager v2.2 - ULTRA-SIMPLIFIED: Direct platform calls with minimal overhead
 * CRITICAL FIXES: Removed all complex fallback chains and unnecessary abstractions
 */
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.windowCache = new CacheManager({ maxSize: 50, defaultTTL: 5000 }); // Aggressive caching
    this.activationCache = new CacheManager({ maxSize: 20, defaultTTL: 500 }); // Very short cache
    this.isScanning = false;
    this.lastSuccessfulScan = 0;
    this.consecutiveFailures = 0;
    this.stats = {
      scans: 0,
      activations: 0,
      failures: 0,
      cacheHits: 0,
      avgScanTime: 0,
      avgActivationTime: 0,
      successRate: 100
    };

    // Direct platform manager - no fallbacks
    this.platformManager = this.createPlatformManager();

    console.log('WindowManager: Initialized with ULTRA-SIMPLIFIED direct detection');
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
   * ULTRA-FAST: Direct window detection with minimal validation
   */
  async getDofusWindows() {
    const startTime = Date.now();

    try {
      // Ultra-fast cache check
      const cacheKey = 'windows';
      const cached = this.windowCache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        console.log(`WindowManager: Cache hit - returning ${cached.length} windows`);
        return cached;
      }

      // Fail-fast if no platform manager
      if (!this.platformManager) {
        console.error('WindowManager: No platform manager - cannot detect windows');
        return [];
      }

      // Prevent concurrent scans with simple lock
      if (this.isScanning) {
        console.log('WindowManager: Scan in progress - returning empty array');
        return [];
      }

      this.isScanning = true;
      this.stats.scans++;

      console.log('WindowManager: Starting ultra-fast platform detection...');

      // Direct platform call with aggressive timeout
      const windows = await this.performUltraFastDetection();

      // Cache aggressively for performance
      if (windows && windows.length >= 0) {
        this.windowCache.set(cacheKey, windows);
        this.lastSuccessfulScan = Date.now();
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
      }

      const duration = Date.now() - startTime;
      this.updateScanStats(duration);

      console.log(`WindowManager: Detection completed - found ${windows.length} windows in ${duration}ms`);
      return windows;

    } catch (error) {
      console.error('WindowManager: Detection failed:', error.message);
      this.stats.failures++;
      this.consecutiveFailures++;
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * ULTRA-FAST: Direct platform detection with minimal overhead
   */
  async performUltraFastDetection() {
    try {
      // Ultra-aggressive timeout based on consecutive failures
      const timeout = this.consecutiveFailures > 3 ? 1000 : 2000;

      const windows = await Promise.race([
        this.platformManager.getDofusWindows(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Detection timeout (${timeout}ms)`)), timeout)
        )
      ]);

      // Minimal validation - trust the platform manager
      return this.validateMinimal(windows || []);

    } catch (error) {
      console.warn('WindowManager: Platform detection failed:', error.message);
      return [];
    }
  }

  /**
   * MINIMAL: Basic validation only
   */
  validateMinimal(windows) {
    if (!Array.isArray(windows)) {
      console.warn('WindowManager: Invalid windows data - not an array');
      return [];
    }

    // Minimal filtering - only check essential fields
    return windows.filter(window => 
      window && 
      window.id && 
      typeof window.id === 'string' &&
      window.title
    );
  }

  /**
   * ULTRA-FAST: Direct activation with minimal overhead
   */
  async activateWindow(windowId) {
    const startTime = Date.now();

    try {
      if (!windowId) {
        console.warn('WindowManager: No windowId provided');
        return false;
      }

      // Ultra-fast cache check
      const cacheKey = `act_${windowId}`;
      if (this.activationCache.get(cacheKey)) {
        console.log(`WindowManager: Recent activation cached for ${windowId}`);
        return true;
      }

      this.stats.activations++;

      // Fail-fast if no platform manager
      if (!this.platformManager) {
        console.error('WindowManager: No platform manager for activation');
        return false;
      }

      console.log(`WindowManager: Fast-activating window ${windowId}`);

      // Direct platform activation with aggressive timeout
      const success = await Promise.race([
        this.platformManager.activateWindow(windowId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Activation timeout')), 800)
        )
      ]);

      const duration = Date.now() - startTime;

      if (success) {
        // Cache successful activation
        this.activationCache.set(cacheKey, true);
        this.updateActivationStats(duration, true);
        this.updateActiveStateMinimal(windowId);

        // Emit event for monitoring
        eventBus.emit('window:activated', { windowId, duration });
        console.log(`WindowManager: Successfully activated ${windowId} in ${duration}ms`);
        return true;
      } else {
        this.updateActivationStats(duration, false);
        console.warn(`WindowManager: Failed to activate ${windowId}`);
        eventBus.emit('window:activation_failed', { windowId });
        return false;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`WindowManager: Activation error for ${windowId}:`, error.message);
      this.updateActivationStats(duration, false);
      return false;
    }
  }

  /**
   * MINIMAL: Update active state with minimal processing
   */
  updateActiveStateMinimal(activeWindowId) {
    // Only update if we have windows in memory
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

      // Direct delegation with timeout
      const success = await Promise.race([
        this.platformManager.organizeWindows(layout),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Organization timeout')), 5000)
        )
      ]);

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
      activationCacheSize: this.activationCache.cache.size
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

      if (this.platformManager && typeof this.platformManager.cleanup === 'function') {
        this.platformManager.cleanup();
      }

      const duration = Date.now() - startTime;
      console.log(`WindowManager: Cleanup completed in ${duration}ms`);
      
      // Final stats
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
      recommendations: this.generateRecommendations(stats)
    };
  }

  determineHealthStatus(stats, timeSinceLastScan) {
    if (stats.successRate < 80 || this.consecutiveFailures > 5) {
      return 'critical';
    }
    if (stats.avgScanTime > 100 || stats.avgActivationTime > 200) {
      return 'degraded';
    }
    if (timeSinceLastScan > 30000) { // 30 seconds
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