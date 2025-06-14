const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * WindowManager v2.1 - SIMPLIFIED: Direct detection with reliable platform delegation
 * MAJOR SIMPLIFICATION: Removed complex fallback chains and over-engineering
 */
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.windowCache = new CacheManager({ maxSize: 100, defaultTTL: 15000 }); // Reduced cache
    this.activationCache = new CacheManager({ maxSize: 50, defaultTTL: 1000 }); // Short-term only
    this.isScanning = false;
    this.stats = {
      scans: 0,
      activations: 0,
      failures: 0,
      cacheHits: 0,
      avgScanTime: 0,
      avgActivationTime: 0
    };

    // Platform-specific manager
    this.platformManager = this.createPlatformManager();

    console.log('WindowManager: Initialized with SIMPLIFIED direct detection');
  }

  /**
   * Creates platform-specific window manager
   */
  createPlatformManager() {
    try {
      if (process.platform === 'win32') {
        const WindowManagerWindows = require('./WindowManagerWindows');
        return new WindowManagerWindows();
      } else {
        // For Linux/macOS, implement basic functionality
        return {
          getDofusWindows: () => [],
          activateWindow: () => false,
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
   * SIMPLIFIED: Direct window detection without complex fallbacks
   */
  async getDofusWindows() {
    const timer = performanceMonitor.startTimer('window_detection');

    try {
      // Simple cache check
      const cacheKey = 'dofus_windows';
      const cached = this.windowCache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        timer.stop();
        console.log(`WindowManager: Returning ${cached.length} cached windows`);
        return cached;
      }

      // Prevent concurrent scans
      if (this.isScanning) {
        console.log('WindowManager: Scan already in progress, waiting...');
        // Simple wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.windowCache.get(cacheKey) || [];
      }

      this.isScanning = true;
      this.stats.scans++;

      console.log('WindowManager: Starting direct platform detection...');

      // Direct platform detection with simple timeout
      const windows = await this.performDirectDetection();

      // Cache the results
      this.windowCache.set(cacheKey, windows, 15000); // 15 second cache

      const duration = timer.stop();
      this.updateAverageScanTime(duration);

      console.log(`WindowManager: Detection completed - found ${windows.length} windows in ${duration.toFixed(0)}ms`);
      return windows;

    } catch (error) {
      console.error('WindowManager: Detection failed:', error.message);
      this.stats.failures++;
      timer.stop();
      return []; // Return empty array instead of fallback
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * SIMPLIFIED: Direct detection with single timeout
   */
  async performDirectDetection() {
    if (!this.platformManager) {
      console.warn('WindowManager: No platform manager available');
      return [];
    }

    try {
      // Simple timeout wrapper
      const windows = await Promise.race([
        this.platformManager.getDofusWindows(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Detection timeout')), 3000)
        )
      ]);

      // Validate and enrich window data
      return this.validateAndEnrichWindows(windows || []);

    } catch (error) {
      console.warn('WindowManager: Platform detection failed:', error.message);
      return [];
    }
  }

  /**
   * Validates and enriches window data
   */
  validateAndEnrichWindows(windows) {
    if (!Array.isArray(windows)) {
      console.warn('WindowManager: Invalid windows data received');
      return [];
    }

    return windows
      .filter(window => window && window.id && window.title)
      .map(window => ({
        ...window,
        detectedAt: Date.now(),
        enabled: window.enabled !== false // Default to enabled
      }));
  }

  /**
   * SIMPLIFIED: Direct activation through platform manager
   */
  async activateWindow(windowId) {
    const timer = performanceMonitor.startTimer('window_activation', { windowId });

    try {
      if (!windowId) {
        console.warn('WindowManager: No windowId provided for activation');
        return false;
      }

      console.log(`WindowManager: Activating window ${windowId}`);

      // Check recent activation cache
      const recentActivation = this.activationCache.get(`activation_${windowId}`);
      if (recentActivation) {
        console.log(`WindowManager: Recent activation cached for ${windowId}`);
        timer.stop();
        return true;
      }

      this.stats.activations++;

      // Direct platform activation
      if (!this.platformManager) {
        console.error('WindowManager: No platform manager available for activation');
        timer.stop();
        return false;
      }

      const success = await Promise.race([
        this.platformManager.activateWindow(windowId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Activation timeout')), 1000)
        )
      ]);

      const duration = timer.stop();

      if (success) {
        // Cache successful activation
        this.activationCache.set(`activation_${windowId}`, Date.now());
        this.updateAverageActivationTime(duration);
        this.updateActiveState(windowId);

        eventBus.emit('window:activated', { windowId, duration });
        console.log(`WindowManager: Successfully activated ${windowId} in ${duration.toFixed(0)}ms`);
        return true;
      } else {
        this.stats.failures++;
        console.warn(`WindowManager: Failed to activate ${windowId}`);
        eventBus.emit('window:activation_failed', { windowId });
        return false;
      }

    } catch (error) {
      console.error(`WindowManager: Activation error for ${windowId}:`, error.message);
      this.stats.failures++;
      timer.stop();
      return false;
    }
  }

  /**
   * Updates the active state of windows
   */
  updateActiveState(activeWindowId) {
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * Organizes windows using platform manager
   */
  async organizeWindows(layout = 'grid') {
    const timer = performanceMonitor.startTimer('window_organization', { layout });

    try {
      if (!this.platformManager) {
        console.warn('WindowManager: No platform manager for organization');
        return false;
      }

      console.log(`WindowManager: Organizing windows in ${layout} layout`);

      const success = await Promise.race([
        this.platformManager.organizeWindows(layout),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Organization timeout')), 2000)
        )
      ]);

      const duration = timer.stop();

      if (success) {
        this.invalidateCache();
        eventBus.emit('windows:organized', { layout, duration });
        console.log(`WindowManager: Organized windows in ${duration.toFixed(0)}ms`);
      }

      return success;
    } catch (error) {
      console.error('WindowManager: Organization failed:', error.message);
      timer.stop();
      return false;
    }
  }

  /**
   * Invalidates all caches
   */
  invalidateCache() {
    this.windowCache.clear();
    this.activationCache.clear();
    console.log('WindowManager: Caches invalidated');
  }

  /**
   * Updates average scan time
   */
  updateAverageScanTime(duration) {
    const count = this.stats.scans;
    const current = this.stats.avgScanTime;
    this.stats.avgScanTime = ((current * (count - 1)) + duration) / count;
  }

  /**
   * Updates average activation time
   */
  updateAverageActivationTime(duration) {
    const count = this.stats.activations;
    const current = this.stats.avgActivationTime;
    this.stats.avgActivationTime = ((current * (count - 1)) + duration) / count;
  }

  /**
   * Gets performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgScanTime: parseFloat(this.stats.avgScanTime.toFixed(2)),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      windowCacheStats: this.windowCache.getStats(),
      activationCacheStats: this.activationCache.getStats()
    };
  }

  /**
   * Delegates class management to platform manager
   */
  getDofusClasses() {
    return this.platformManager ? this.platformManager.getDofusClasses() : {};
  }

  setWindowClass(windowId, classKey) {
    return this.platformManager ? this.platformManager.setWindowClass(windowId, classKey) : false;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    const timer = performanceMonitor.startTimer('window_manager_cleanup');

    try {
      this.windowCache.clear();
      this.activationCache.clear();

      if (this.platformManager && typeof this.platformManager.cleanup === 'function') {
        this.platformManager.cleanup();
      }

      console.log('WindowManager: Cleanup completed');
      eventBus.emit('windows:cleanup');
    } catch (error) {
      console.error('WindowManager: Cleanup error:', error);
    }

    timer.stop();
  }
}

module.exports = WindowManager;