const eventBus = require('./EventBus');

/**
 * Moniteur de performance pour surveiller les opérations critiques
 * Fournit des métriques détaillées et des alertes automatiques
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      'shortcut_activation': 50,      // 50ms max pour l'activation d'un raccourci
      'window_detection': 100,        // 100ms max pour la détection des fenêtres
      'window_activation': 200,       // 200ms max pour l'activation d'une fenêtre
      'config_save': 500,            // 500ms max pour sauvegarder la config
      'event_emit': 10               // 10ms max pour émettre un événement
    };
    this.alerts = [];
    this.isRecording = true;
    
    console.log('PerformanceMonitor: Initialized with performance tracking');
  }

  /**
   * Enregistre une métrique de performance
   */
  record(operation, duration, metadata = {}) {
    if (!this.isRecording) return;
    
    const timestamp = Date.now();
    
    // Initialiser la métrique si nécessaire
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        recentTimes: [],
        lastRecorded: timestamp
      });
    }
    
    const metric = this.metrics.get(operation);
    
    // Mettre à jour les statistiques
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.lastRecorded = timestamp;
    
    // Garder les 100 dernières mesures pour l'analyse de tendance
    metric.recentTimes.push({ duration, timestamp, metadata });
    if (metric.recentTimes.length > 100) {
      metric.recentTimes.shift();
    }
    
    // Vérifier les seuils et déclencher des alertes
    this.checkThreshold(operation, duration, metadata);
    
    // Émettre un événement pour le monitoring en temps réel
    eventBus.emit('performance:metric', {
      operation,
      duration,
      metadata,
      timestamp
    });
  }

  /**
   * Vérifie si une opération dépasse le seuil et déclenche une alerte
   */
  checkThreshold(operation, duration, metadata) {
    const threshold = this.thresholds[operation];
    
    if (threshold && duration > threshold) {
      const alert = {
        operation,
        duration,
        threshold,
        metadata,
        timestamp: Date.now(),
        severity: this.calculateSeverity(duration, threshold)
      };
      
      this.alerts.push(alert);
      
      // Garder seulement les 50 dernières alertes
      if (this.alerts.length > 50) {
        this.alerts.shift();
      }
      
      console.warn(`PerformanceMonitor: SLOW OPERATION - ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      
      // Émettre une alerte
      eventBus.emit('performance:alert', alert);
    }
  }

  /**
   * Calcule la sévérité d'une alerte
   */
  calculateSeverity(duration, threshold) {
    const ratio = duration / threshold;
    
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Mesure automatiquement la durée d'une fonction
   */
  measure(operation, fn, metadata = {}) {
    const startTime = performance.now();
    
    try {
      const result = fn();
      
      // Si c'est une promesse, mesurer quand elle se résout
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          this.record(operation, duration, metadata);
        });
      } else {
        const duration = performance.now() - startTime;
        this.record(operation, duration, metadata);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.record(operation, duration, { ...metadata, error: error.message });
      throw error;
    }
  }

  /**
   * Mesure automatiquement la durée d'une fonction async
   */
  async measureAsync(operation, fn, metadata = {}) {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.record(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.record(operation, duration, { ...metadata, error: error.message });
      throw error;
    }
  }

  /**
   * Obtient toutes les métriques
   */
  getMetrics() {
    const result = {};
    
    for (const [operation, metric] of this.metrics) {
      result[operation] = {
        count: metric.count,
        totalTime: parseFloat(metric.totalTime.toFixed(2)),
        avgTime: parseFloat(metric.avgTime.toFixed(2)),
        minTime: parseFloat(metric.minTime.toFixed(2)),
        maxTime: parseFloat(metric.maxTime.toFixed(2)),
        threshold: this.thresholds[operation] || null,
        lastRecorded: new Date(metric.lastRecorded).toISOString()
      };
    }
    
    return result;
  }

  /**
   * Obtient les alertes récentes
   */
  getAlerts(limit = 10) {
    return this.alerts
      .slice(-limit)
      .reverse()
      .map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp).toISOString()
      }));
  }

  /**
   * Obtient un rapport de performance complet
   */
  getReport() {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();
    const summary = this.getSummary();
    
    return {
      summary,
      metrics,
      alerts,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Obtient un résumé des performances
   */
  getSummary() {
    const totalOperations = Array.from(this.metrics.values())
      .reduce((sum, metric) => sum + metric.count, 0);
    
    const slowOperations = Array.from(this.metrics.entries())
      .filter(([operation, metric]) => {
        const threshold = this.thresholds[operation];
        return threshold && metric.avgTime > threshold;
      })
      .length;
    
    const criticalAlerts = this.alerts
      .filter(alert => alert.severity === 'critical')
      .length;
    
    return {
      totalOperations,
      slowOperations,
      totalAlerts: this.alerts.length,
      criticalAlerts,
      isHealthy: slowOperations === 0 && criticalAlerts === 0
    };
  }

  /**
   * Configure les seuils de performance
   */
  setThreshold(operation, threshold) {
    this.thresholds[operation] = threshold;
    console.log(`PerformanceMonitor: Threshold for "${operation}" set to ${threshold}ms`);
  }

  /**
   * Remet à zéro toutes les métriques
   */
  reset() {
    this.metrics.clear();
    this.alerts.length = 0;
    console.log('PerformanceMonitor: All metrics and alerts reset');
  }

  /**
   * Active/désactive l'enregistrement
   */
  setRecording(enabled) {
    this.isRecording = enabled;
    console.log(`PerformanceMonitor: Recording ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Instance singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;