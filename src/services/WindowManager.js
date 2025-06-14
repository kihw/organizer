const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * WindowManager v2.3 - CRITICAL FIX: Ensure proper data return and synchronization
 * FIXED: Guarantee that detected windows are properly returned to the interface
 */
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.windowCache = new CacheManager({ maxSize: 50, defaultTTL: 2000 }); // Reduced TTL for faster updates
    this.activationCache = new CacheManager({ maxSize: 20, defaultTTL: 500 });
    this.isScanning = false;
    this.lastSuccessfulScan = 0;
    this.consecutiveFailures = 0;
    this.lastDetectedWindows = []; // CRITICAL: Store last detected windows
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

    console.log('WindowManager: Initialized with CRITICAL data return fix');
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

      // CRITICAL: Always try fresh detection, ignore cache for now
      console.log('WindowManager: Bypassing cache for guaranteed fresh detection');

      // Fail-fast if no platform manager
      if (!this.platformManager) {
        console.error('WindowManager: No platform manager - returning last detected windows');
        return this.lastDetectedWindows;
      }

      // Prevent concurrent scans with simple lock
      if (this.isScanning) {
        console.log('WindowManager: Scan in progress - returning last detected windows');
        return this.lastDetectedWindows;
      }

      this.isScanning = true;
      this.stats.scans++;

      console.log('WindowManager: Starting platform detection with guaranteed return...');

      // CRITICAL FIX: Direct platform call with proper error handling
      const windows = await this.performGuaranteedDetection();

      // CRITICAL: Always update last detected windows
      if (windows && Array.isArray(windows)) {
        this.lastDetectedWindows = windows;
        console.log(`WindowManager: CRITICAL FIX - Updated lastDetectedWindows with ${windows.length} windows`);
        
        // Cache the result
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
      
      // CRITICAL: Always return something, even if it's the last detected windows
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

      // CRITICAL: Increased timeout and better error handling
      const timeout = 5000; // 5 seconds timeout

      const windows = await Promise.race([
        this.platformManager.getDofusWindows(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Detection timeout (${timeout}ms)`)), timeout)
        )
      ]);

      console.log(`WindowManager: Platform detection returned ${windows ? windows.length : 'null'} windows`);

      // CRITICAL: Validate and ensure we return an array
      return this.validateAndEnsureArray(windows);

    } catch (error) {
      console.warn('WindowManager: Platform detection failed:', error.message);
      // Return empty array instead of null/undefined
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

    // Basic validation - only check essential fields
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
   * CRITICAL FIX: Direct activation with minimal overhead
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
    // Update in lastDetectedWindows
    this.lastDetectedWindows.forEach(window => {
      if (window && window.id) {
        window.isActive = window.id === activeWindowId;
      }
    });

    // Also update in windows map if it exists
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