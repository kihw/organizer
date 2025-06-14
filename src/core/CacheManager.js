/**
 * Gestionnaire de cache intelligent pour améliorer les performances
 * Réduit les appels coûteux aux APIs système
 */
class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
    
    console.log(`CacheManager: Initialized with maxSize=${this.maxSize}, defaultTTL=${this.defaultTTL}ms`);
  }

  /**
   * Stocke une valeur dans le cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // Éviction si nécessaire
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    // Nettoyer l'ancien timer si existant
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Stocker la valeur
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });
    
    // Programmer l'expiration
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }
    
    this.stats.sets++;
    return this;
  }

  /**
   * Récupère une valeur du cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Vérifier l'expiration
    if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Mettre à jour les statistiques d'accès
    item.accessCount++;
    this.stats.hits++;
    
    return item.value;
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    return deleted;
  }

  /**
   * Vide complètement le cache
   */
  clear() {
    // Nettoyer tous les timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    
    console.log('CacheManager: Cache cleared');
  }

  /**
   * Éviction de l'entrée la plus ancienne
   */
  evictOldest() {
    if (this.cache.size === 0) return;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Récupère ou calcule une valeur (pattern cache-aside)
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    let value = this.get(key);
    
    if (value === null) {
      try {
        value = await factory();
        this.set(key, value, ttl);
      } catch (error) {
        console.error(`CacheManager: Error in factory for key "${key}":`, error);
        throw error;
      }
    }
    
    return value;
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Nettoyage périodique des entrées expirées
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache) {
      if (item.ttl > 0 && now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`CacheManager: Cleaned up ${keysToDelete.length} expired entries`);
    }
    
    return keysToDelete.length;
  }

  /**
   * Démarre le nettoyage automatique
   */
  startAutoCleanup(interval = 60000) { // 1 minute par défaut
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, interval);
    
    console.log(`CacheManager: Auto cleanup started (interval: ${interval}ms)`);
  }

  /**
   * Arrête le nettoyage automatique
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('CacheManager: Auto cleanup stopped');
    }
  }
}

module.exports = CacheManager;