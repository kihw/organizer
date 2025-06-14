const { EventEmitter } = require('events');

/**
 * EventBus centralisé pour la communication entre composants
 * Améliore les performances en évitant les couplages directs
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Augmenter la limite pour éviter les warnings
    this.metrics = new Map();
    this.debugMode = process.env.NODE_ENV === 'development';
    
    console.log('EventBus: Initialized with enhanced performance monitoring');
  }

  /**
   * Émet un événement avec monitoring des performances
   */
  emit(event, ...args) {
    const startTime = performance.now();
    
    try {
      const result = super.emit(event, ...args);
      
      // Enregistrer les métriques de performance
      const duration = performance.now() - startTime;
      this.recordMetric(event, duration);
      
      if (this.debugMode && duration > 10) {
        console.warn(`EventBus: Slow event "${event}" took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`EventBus: Error emitting event "${event}":`, error);
      throw error;
    }
  }

  /**
   * Enregistre les métriques de performance pour un événement
   */
  recordMetric(event, duration) {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }
    
    const metric = this.metrics.get(event);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.minTime = Math.min(metric.minTime, duration);
  }

  /**
   * Obtient les statistiques de performance
   */
  getMetrics() {
    const stats = {};
    for (const [event, metric] of this.metrics) {
      stats[event] = {
        ...metric,
        avgTime: parseFloat(metric.avgTime.toFixed(2)),
        maxTime: parseFloat(metric.maxTime.toFixed(2)),
        minTime: parseFloat(metric.minTime.toFixed(2))
      };
    }
    return stats;
  }

  /**
   * Remet à zéro les métriques
   */
  resetMetrics() {
    this.metrics.clear();
    console.log('EventBus: Metrics reset');
  }

  /**
   * Écoute un événement avec gestion d'erreur automatique
   */
  safeOn(event, listener) {
    const wrappedListener = (...args) => {
      try {
        return listener(...args);
      } catch (error) {
        console.error(`EventBus: Error in listener for "${event}":`, error);
      }
    };
    
    this.on(event, wrappedListener);
    return wrappedListener;
  }

  /**
   * Écoute un événement une seule fois avec gestion d'erreur
   */
  safeOnce(event, listener) {
    const wrappedListener = (...args) => {
      try {
        return listener(...args);
      } catch (error) {
        console.error(`EventBus: Error in once listener for "${event}":`, error);
      }
    };
    
    this.once(event, wrappedListener);
    return wrappedListener;
  }
}

// Instance singleton
const eventBus = new EventBus();

module.exports = eventBus;