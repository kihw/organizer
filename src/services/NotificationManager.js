const eventBus = require('../core/EventBus');

/**
 * Gestionnaire de notifications pour le feedback utilisateur
 * Fournit des notifications visuelles et sonores pour les actions
 */
class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.settings = {
      enableSound: true,
      enableVisual: true,
      duration: 3000,
      maxNotifications: 5
    };
    this.notificationId = 0;
    
    console.log('NotificationManager: Initialized');
    
    // Écouter les événements système
    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Notifications pour les raccourcis
    eventBus.on('shortcut:activated', (data) => {
      if (this.settings.enableVisual) {
        this.showActivationFeedback(data.windowId, data.duration);
      }
    });

    eventBus.on('shortcut:error', (data) => {
      this.showError(`Shortcut error: ${data.error}`);
    });

    // Notifications pour les fenêtres
    eventBus.on('window:activated', (data) => {
      if (this.settings.enableVisual) {
        this.showSuccess(`Window activated in ${data.duration.toFixed(0)}ms`);
      }
    });

    eventBus.on('window:activation_failed', (data) => {
      this.showError(`Failed to activate window ${data.windowId}`);
    });

    // Notifications de performance
    eventBus.on('performance:alert', (alert) => {
      if (alert.severity === 'critical') {
        this.showWarning(`Performance issue: ${alert.operation} took ${alert.duration.toFixed(0)}ms`);
      }
    });
  }

  /**
   * Affiche une notification de succès
   */
  showSuccess(message, options = {}) {
    return this.show({
      type: 'success',
      message,
      icon: '✓',
      color: '#27ae60',
      ...options
    });
  }

  /**
   * Affiche une notification d'erreur
   */
  showError(message, options = {}) {
    return this.show({
      type: 'error',
      message,
      icon: '✗',
      color: '#e74c3c',
      duration: 5000, // Plus long pour les erreurs
      ...options
    });
  }

  /**
   * Affiche une notification d'avertissement
   */
  showWarning(message, options = {}) {
    return this.show({
      type: 'warning',
      message,
      icon: '⚠',
      color: '#f39c12',
      ...options
    });
  }

  /**
   * Affiche une notification d'information
   */
  showInfo(message, options = {}) {
    return this.show({
      type: 'info',
      message,
      icon: 'ℹ',
      color: '#3498db',
      ...options
    });
  }

  /**
   * Affiche un feedback d'activation de fenêtre
   */
  showActivationFeedback(windowId, duration) {
    const message = duration < 50 ? 'Fast activation!' : 
                   duration < 100 ? 'Good activation' : 
                   'Slow activation';
    
    const color = duration < 50 ? '#27ae60' : 
                  duration < 100 ? '#f39c12' : 
                  '#e74c3c';
    
    return this.show({
      type: 'activation',
      message: `${message} (${duration.toFixed(0)}ms)`,
      icon: '⚡',
      color,
      duration: 2000,
      position: 'top-right'
    });
  }

  /**
   * Affiche une notification générique
   */
  show(options = {}) {
    if (!this.settings.enableVisual) return null;
    
    const notification = {
      id: ++this.notificationId,
      type: options.type || 'info',
      message: options.message || '',
      icon: options.icon || '',
      color: options.color || '#3498db',
      duration: options.duration || this.settings.duration,
      position: options.position || 'top-right',
      timestamp: Date.now(),
      ...options
    };
    
    // Limiter le nombre de notifications
    if (this.notifications.size >= this.settings.maxNotifications) {
      const oldestId = Math.min(...this.notifications.keys());
      this.hide(oldestId);
    }
    
    this.notifications.set(notification.id, notification);
    
    // Émettre l'événement pour l'affichage
    eventBus.emit('notification:show', notification);
    
    // Programmer la suppression automatique
    if (notification.duration > 0) {
      setTimeout(() => {
        this.hide(notification.id);
      }, notification.duration);
    }
    
    // Jouer un son si activé
    if (this.settings.enableSound) {
      this.playSound(notification.type);
    }
    
    return notification.id;
  }

  /**
   * Cache une notification
   */
  hide(notificationId) {
    if (this.notifications.has(notificationId)) {
      this.notifications.delete(notificationId);
      
      // Émettre l'événement pour le masquage
      eventBus.emit('notification:hide', { id: notificationId });
      
      return true;
    }
    return false;
  }

  /**
   * Cache toutes les notifications
   */
  hideAll() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.hide(id));
    
    eventBus.emit('notification:hide_all');
  }

  /**
   * Joue un son pour une notification
   */
  playSound(type) {
    if (!this.settings.enableSound) return;
    
    try {
      // Sons système basiques
      const sounds = {
        success: 'SystemAsterisk',
        error: 'SystemHand',
        warning: 'SystemExclamation',
        info: 'SystemDefault',
        activation: 'SystemAsterisk'
      };
      
      const sound = sounds[type] || sounds.info;
      console.log(`NotificationManager: Would play sound: ${sound}`);
    } catch (error) {
      console.warn('NotificationManager: Error playing sound:', error);
    }
  }

  /**
   * Configure les paramètres de notification
   */
  configure(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log('NotificationManager: Settings updated:', this.settings);
    
    eventBus.emit('notification:settings_changed', this.settings);
  }

  /**
   * Obtient les paramètres actuels
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Obtient toutes les notifications actives
   */
  getActiveNotifications() {
    return Array.from(this.notifications.values());
  }

  /**
   * Teste les notifications avec des exemples
   */
  test() {
    console.log('NotificationManager: Running test notifications...');
    
    this.showSuccess('Test success notification');
    
    setTimeout(() => {
      this.showWarning('Test warning notification');
    }, 1000);
    
    setTimeout(() => {
      this.showError('Test error notification');
    }, 2000);
    
    setTimeout(() => {
      this.showInfo('Test info notification');
    }, 3000);
  }

  /**
   * Nettoyage
   */
  cleanup() {
    this.hideAll();
    this.notifications.clear();
    console.log('NotificationManager: Cleaned up');
  }
}

module.exports = NotificationManager;