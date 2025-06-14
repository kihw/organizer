const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const CacheManager = require('../core/CacheManager');

/**
 * WindowManager v2.0 - Optimisé pour les performances et la fiabilité
 * Améliore considérablement la détection et l'activation des fenêtres
 */
class WindowManagerV2 {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.windowCache = new CacheManager({ maxSize: 200, defaultTTL: 30000 }); // 30 secondes
    this.activationCache = new CacheManager({ maxSize: 100, defaultTTL: 5000 }); // 5 secondes
    this.connectionPool = new ConnectionPool();
    this.retryManager = new RetryManager();
    this.isScanning = false;
    this.scanQueue = [];
    this.stats = {
      scans: 0,
      activations: 0,
      failures: 0,
      cacheHits: 0,
      avgScanTime: 0,
      avgActivationTime: 0
    };
    
    // Démarrer le nettoyage automatique
    this.windowCache.startAutoCleanup(15000); // 15 secondes
    this.activationCache.startAutoCleanup(2000); // 2 secondes
    
    // Importer le bon WindowManager selon la plateforme
    this.platformManager = this.createPlatformManager();
    
    console.log('WindowManagerV2: Initialized with enhanced performance and caching');
    
    // Démarrer le monitoring automatique
    this.startPerformanceMonitoring();
  }

  /**
   * Crée le gestionnaire de fenêtres spécifique à la plateforme
   */
  createPlatformManager() {
    if (process.platform === 'win32') {
      const WindowManagerWindows = require('./WindowManagerWindows');
      return new WindowManagerWindows();
    } else {
      const WindowManager = require('./WindowManager');
      return new WindowManager();
    }
  }

  /**
   * Démarre le monitoring automatique des performances
   */
  startPerformanceMonitoring() {
    // Surveiller les métriques toutes les 30 secondes
    setInterval(() => {
      this.analyzePerformance();
    }, 30000);
  }

  /**
   * Analyse les performances et optimise si nécessaire
   */
  analyzePerformance() {
    const metrics = performanceMonitor.getMetrics();
    const windowDetection = metrics.window_detection;
    
    if (windowDetection && windowDetection.avgTime > 200) {
      console.warn('WindowManagerV2: Slow window detection, optimizing...');
      this.optimizeDetection();
    }
    
    const windowActivation = metrics.window_activation;
    if (windowActivation && windowActivation.avgTime > 300) {
      console.warn('WindowManagerV2: Slow window activation, optimizing...');
      this.optimizeActivation();
    }
  }

  /**
   * Optimise la détection des fenêtres
   */
  optimizeDetection() {
    // Augmenter la durée de cache
    this.windowCache = new CacheManager({ maxSize: 300, defaultTTL: 60000 }); // 1 minute
    
    // Nettoyer les anciens caches
    this.windowCache.cleanup();
    
    console.log('WindowManagerV2: Detection optimization applied');
  }

  /**
   * Optimise l'activation des fenêtres
   */
  optimizeActivation() {
    // Augmenter la taille du pool de connexions
    this.connectionPool.resize(10);
    
    // Nettoyer le cache d'activation
    this.activationCache.clear();
    
    console.log('WindowManagerV2: Activation optimization applied');
  }

  /**
   * Obtient les fenêtres Dofus avec cache intelligent
   */
  async getDofusWindows() {
    const timer = performanceMonitor.startTimer('window_detection');
    
    try {
      // Vérifier le cache d'abord
      const cacheKey = 'dofus_windows';
      const cached = this.windowCache.get(cacheKey);
      
      if (cached) {
        this.stats.cacheHits++;
        timer.stop();
        console.log(`WindowManagerV2: Returning ${cached.length} cached windows`);
        return cached;
      }
      
      // Éviter les scans simultanés
      if (this.isScanning) {
        return new Promise((resolve) => {
          this.scanQueue.push(resolve);
        });
      }
      
      this.isScanning = true;
      this.stats.scans++;
      
      console.log('WindowManagerV2: Scanning for Dofus windows...');
      
      // Déléguer au gestionnaire de plateforme
      const windows = await this.platformManager.getDofusWindows();
      
      // Post-traitement et enrichissement
      const enrichedWindows = await this.enrichWindowData(windows);
      
      // Mettre en cache
      this.windowCache.set(cacheKey, enrichedWindows, 30000); // 30 secondes
      
      // Mettre à jour les statistiques
      const duration = timer.stop();
      this.updateAverageScanTime(duration);
      
      // Traiter la queue d'attente
      this.processScanQueue(enrichedWindows);
      
      console.log(`WindowManagerV2: Found ${enrichedWindows.length} Dofus windows`);
      
      // Émettre un événement
      eventBus.emit('windows:detected', { 
        count: enrichedWindows.length, 
        duration,
        fromCache: false 
      });
      
      return enrichedWindows;
      
    } catch (error) {
      console.error('WindowManagerV2: Error getting Dofus windows:', error);
      this.stats.failures++;
      timer.stop();
      
      // Émettre un événement d'erreur
      eventBus.emit('windows:error', { error: error.message });
      
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Enrichit les données des fenêtres avec des informations supplémentaires
   */
  async enrichWindowData(windows) {
    const enriched = [];
    
    for (const window of windows) {
      try {
        // Ajouter des métadonnées de performance
        const enrichedWindow = {
          ...window,
          detectedAt: Date.now(),
          performanceScore: this.calculatePerformanceScore(window),
          reliability: this.calculateReliability(window.id)
        };
        
        enriched.push(enrichedWindow);
      } catch (error) {
        console.warn(`WindowManagerV2: Error enriching window ${window.id}:`, error);
        enriched.push(window); // Ajouter quand même la fenêtre de base
      }
    }
    
    return enriched;
  }

  /**
   * Calcule un score de performance pour une fenêtre
   */
  calculatePerformanceScore(window) {
    let score = 100;
    
    // Pénaliser les fenêtres sans titre clair
    if (!window.character || window.character === 'Unknown') {
      score -= 20;
    }
    
    // Pénaliser les fenêtres sans classe détectée
    if (!window.dofusClass || window.dofusClass === 'feca') {
      score -= 10;
    }
    
    // Bonus pour les fenêtres avec raccourci
    if (window.shortcut) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcule la fiabilité d'une fenêtre basée sur l'historique
   */
  calculateReliability(windowId) {
    const history = this.activationCache.get(`history_${windowId}`) || { successes: 0, failures: 0 };
    const total = history.successes + history.failures;
    
    if (total === 0) return 100; // Nouvelle fenêtre
    
    return Math.round((history.successes / total) * 100);
  }

  /**
   * Traite la queue des scans en attente
   */
  processScanQueue(windows) {
    while (this.scanQueue.length > 0) {
      const resolve = this.scanQueue.shift();
      resolve(windows);
    }
  }

  /**
   * Met à jour la moyenne des temps de scan
   */
  updateAverageScanTime(duration) {
    const totalScans = this.stats.scans;
    const currentAvg = this.stats.avgScanTime;
    
    this.stats.avgScanTime = ((currentAvg * (totalScans - 1)) + duration) / totalScans;
  }

  /**
   * Active une fenêtre avec retry automatique et cache
   */
  async activateWindow(windowId) {
    const timer = performanceMonitor.startTimer('window_activation', { windowId });
    
    try {
      console.log(`WindowManagerV2: Activating window ${windowId}`);
      
      // Vérifier le cache d'activation récente
      const recentActivation = this.activationCache.get(`activation_${windowId}`);
      if (recentActivation && Date.now() - recentActivation < 1000) {
        console.log(`WindowManagerV2: Skipping recent activation for ${windowId}`);
        timer.stop();
        return true;
      }
      
      this.stats.activations++;
      
      // Utiliser le pool de connexions pour l'activation
      const connection = await this.connectionPool.acquire();
      
      try {
        // Exécuter avec retry automatique
        const success = await this.retryManager.execute(async () => {
          return await this.platformManager.activateWindow(windowId);
        }, {
          maxRetries: 3,
          delay: 100,
          backoff: 1.5
        });
        
        if (success) {
          // Mettre en cache l'activation réussie
          this.activationCache.set(`activation_${windowId}`, Date.now());
          
          // Mettre à jour l'historique de fiabilité
          this.updateReliabilityHistory(windowId, true);
          
          // Mettre à jour les statistiques
          const duration = timer.stop();
          this.updateAverageActivationTime(duration);
          
          // Émettre un événement de succès
          eventBus.emit('window:activated', { windowId, duration });
          
          console.log(`WindowManagerV2: Successfully activated window ${windowId} in ${duration.toFixed(2)}ms`);
          return true;
        } else {
          this.stats.failures++;
          this.updateReliabilityHistory(windowId, false);
          
          timer.stop();
          
          // Émettre un événement d'échec
          eventBus.emit('window:activation_failed', { windowId });
          
          console.warn(`WindowManagerV2: Failed to activate window ${windowId}`);
          return false;
        }
      } finally {
        this.connectionPool.release(connection);
      }
      
    } catch (error) {
      console.error(`WindowManagerV2: Error activating window ${windowId}:`, error);
      this.stats.failures++;
      this.updateReliabilityHistory(windowId, false);
      timer.stop();
      
      // Émettre un événement d'erreur
      eventBus.emit('window:error', { windowId, error: error.message });
      
      return false;
    }
  }

  /**
   * Met à jour l'historique de fiabilité d'une fenêtre
   */
  updateReliabilityHistory(windowId, success) {
    const historyKey = `history_${windowId}`;
    const history = this.activationCache.get(historyKey) || { successes: 0, failures: 0 };
    
    if (success) {
      history.successes++;
    } else {
      history.failures++;
    }
    
    // Garder seulement les 50 dernières tentatives
    const total = history.successes + history.failures;
    if (total > 50) {
      const ratio = history.successes / total;
      history.successes = Math.round(ratio * 50);
      history.failures = 50 - history.successes;
    }
    
    this.activationCache.set(historyKey, history, 300000); // 5 minutes
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
   * Organise les fenêtres avec optimisations
   */
  async organizeWindows(layout = 'grid') {
    const timer = performanceMonitor.startTimer('window_organization', { layout });
    
    try {
      console.log(`WindowManagerV2: Organizing windows in ${layout} layout`);
      
      // Déléguer à la plateforme
      const success = await this.platformManager.organizeWindows(layout);
      
      const duration = timer.stop();
      
      if (success) {
        // Invalider le cache des fenêtres car les positions ont changé
        this.windowCache.delete('dofus_windows');
        
        // Émettre un événement de succès
        eventBus.emit('windows:organized', { layout, duration });
        
        console.log(`WindowManagerV2: Successfully organized windows in ${duration.toFixed(2)}ms`);
      } else {
        // Émettre un événement d'échec
        eventBus.emit('windows:organization_failed', { layout });
      }
      
      return success;
    } catch (error) {
      console.error('WindowManagerV2: Error organizing windows:', error);
      timer.stop();
      
      // Émettre un événement d'erreur
      eventBus.emit('windows:error', { error: error.message });
      
      return false;
    }
  }

  /**
   * Invalide le cache des fenêtres
   */
  invalidateCache() {
    this.windowCache.clear();
    this.activationCache.clear();
    console.log('WindowManagerV2: Cache invalidated');
    
    // Émettre un événement
    eventBus.emit('windows:cache_invalidated');
  }

  /**
   * Obtient les statistiques de performance
   */
  getStats() {
    return {
      ...this.stats,
      avgScanTime: parseFloat(this.stats.avgScanTime.toFixed(2)),
      avgActivationTime: parseFloat(this.stats.avgActivationTime.toFixed(2)),
      windowCacheStats: this.windowCache.getStats(),
      activationCacheStats: this.activationCache.getStats(),
      connectionPoolStats: this.connectionPool.getStats(),
      retryManagerStats: this.retryManager.getStats()
    };
  }

  /**
   * Diagnostic complet du système
   */
  diagnose() {
    const stats = this.getStats();
    const metrics = performanceMonitor.getMetrics();
    
    return {
      status: this.calculateHealthStatus(stats),
      stats,
      performance: {
        windowDetection: metrics.window_detection || null,
        windowActivation: metrics.window_activation || null
      },
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Calcule l'état de santé du système
   */
  calculateHealthStatus(stats) {
    if (stats.avgScanTime > 500 || stats.avgActivationTime > 500) {
      return 'critical';
    } else if (stats.avgScanTime > 200 || stats.avgActivationTime > 200) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Génère des recommandations d'optimisation
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.avgScanTime > 300) {
      recommendations.push('Consider increasing window cache TTL');
    }
    
    if (stats.avgActivationTime > 400) {
      recommendations.push('Consider increasing connection pool size');
    }
    
    const failureRate = stats.failures / (stats.activations + stats.scans);
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected - check system resources');
    }
    
    const windowCacheHitRate = parseFloat(stats.windowCacheStats.hitRate);
    if (windowCacheHitRate < 70) {
      recommendations.push('Low window cache hit rate - consider increasing cache size');
    }
    
    return recommendations;
  }

  /**
   * Délègue les méthodes de classe au gestionnaire de plateforme
   */
  getDofusClasses() {
    return this.platformManager.getDofusClasses();
  }

  setWindowClass(windowId, classKey) {
    return this.platformManager.setWindowClass(windowId, classKey);
  }

  /**
   * Nettoyage complet
   */
  cleanup() {
    const timer = performanceMonitor.startTimer('window_manager_cleanup');
    
    try {
      // Arrêter les caches
      this.windowCache.stopAutoCleanup();
      this.activationCache.stopAutoCleanup();
      
      // Nettoyer les caches
      this.windowCache.clear();
      this.activationCache.clear();
      
      // Nettoyer le pool de connexions
      this.connectionPool.cleanup();
      
      // Nettoyer le gestionnaire de plateforme
      if (this.platformManager && typeof this.platformManager.cleanup === 'function') {
        this.platformManager.cleanup();
      }
      
      console.log('WindowManagerV2: Complete cleanup performed');
      
      // Émettre un événement
      eventBus.emit('windows:cleanup');
    } catch (error) {
      console.error('WindowManagerV2: Error during cleanup:', error);
    }
    
    timer.stop();
  }
}

/**
 * Pool de connexions pour optimiser les opérations système
 */
class ConnectionPool {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new Set();
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      errors: 0
    };
    
    // Pré-créer quelques connexions
    for (let i = 0; i < Math.min(2, maxSize); i++) {
      this.available.push(this.createConnection());
    }
  }

  createConnection() {
    const connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
    
    this.stats.created++;
    return connection;
  }

  async acquire() {
    this.stats.acquired++;
    
    if (this.available.length > 0) {
      const connection = this.available.pop();
      this.inUse.add(connection);
      connection.lastUsed = Date.now();
      return connection;
    }
    
    if (this.inUse.size < this.maxSize) {
      const connection = this.createConnection();
      this.inUse.add(connection);
      return connection;
    }
    
    // Attendre qu'une connexion se libère
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.available.length > 0) {
          const connection = this.available.pop();
          this.inUse.add(connection);
          connection.lastUsed = Date.now();
          resolve(connection);
        } else {
          setTimeout(checkAvailable, 10);
        }
      };
      checkAvailable();
    });
  }

  release(connection) {
    if (this.inUse.has(connection)) {
      this.inUse.delete(connection);
      this.available.push(connection);
      this.stats.released++;
    }
  }

  resize(newSize) {
    this.maxSize = newSize;
    console.log(`ConnectionPool: Resized to ${newSize} connections`);
  }

  getStats() {
    return {
      ...this.stats,
      maxSize: this.maxSize,
      available: this.available.length,
      inUse: this.inUse.size
    };
  }

  cleanup() {
    this.available.length = 0;
    this.inUse.clear();
    console.log('ConnectionPool: Cleaned up');
  }
}

/**
 * Gestionnaire de retry intelligent
 */
class RetryManager {
  constructor() {
    this.stats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      retries: 0
    };
  }

  async execute(fn, options = {}) {
    const {
      maxRetries = 3,
      delay = 100,
      backoff = 2,
      condition = () => true
    } = options;
    
    this.stats.attempts++;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await fn();
        
        if (result || !condition()) {
          this.stats.successes++;
          return result;
        }
        
        if (attempt <= maxRetries) {
          this.stats.retries++;
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        if (attempt > maxRetries) {
          this.stats.failures++;
          throw error;
        }
        
        this.stats.retries++;
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.stats.failures++;
    return false;
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = WindowManagerV2;