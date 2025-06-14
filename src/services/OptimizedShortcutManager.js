const ShortcutManager = require('./ShortcutManager');
const WindowDisplayOptimizer = require('../core/WindowDisplayOptimizer');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');

/**
 * OptimizedShortcutManager - Gestionnaire de raccourcis avec optimisation d'affichage
 * Objectif: Feedback visuel instantané (<10ms) + activation rapide
 */
class OptimizedShortcutManager extends ShortcutManager {
  constructor() {
    super();
    this.displayOptimizer = new WindowDisplayOptimizer();
    this.instantFeedbackEnabled = true;
    this.feedbackCache = new Map();
    
    console.log('OptimizedShortcutManager: Initialized with instant visual feedback');
  }

  /**
   * Enregistrement de raccourci avec optimisation d'affichage
   */
  async setWindowShortcut(windowId, shortcut, callback) {
    const optimizedCallback = this.createOptimizedCallback(windowId, callback);
    return super.setWindowShortcut(windowId, shortcut, optimizedCallback);
  }

  /**
   * Création d'un callback optimisé avec feedback instantané
   */
  createOptimizedCallback(windowId, originalCallback) {
    return async () => {
      const startTime = performance.now();
      
      try {
        // 1. Feedback visuel instantané (0-5ms)
        if (this.instantFeedbackEnabled) {
          this.showInstantShortcutFeedback(windowId);
        }
        
        // 2. Exécution du callback original avec optimisation d'affichage
        const callbackPromise = originalCallback();
        
        // 3. Optimisation d'affichage en parallèle
        const success = await this.displayOptimizer.optimizeWindowDisplay(windowId, callbackPromise);
        
        const duration = performance.now() - startTime;
        
        // 4. Feedback de résultat
        this.showResultFeedback(windowId, success, duration);
        
        // 5. Émettre l'événement optimisé
        eventBus.emit('shortcut:activated_optimized', {
          windowId,
          duration,
          success,
          optimized: true
        });
        
        return success;
        
      } catch (error) {
        console.error('OptimizedShortcutManager: Error in optimized callback:', error);
        this.showErrorFeedback(windowId);
        return false;
      }
    };
  }

  /**
   * Feedback visuel instantané pour raccourci
   */
  showInstantShortcutFeedback(windowId) {
    const feedbackStartTime = performance.now();
    
    try {
      // Feedback dans le dock
      this.showDockShortcutFeedback(windowId);
      
      // Feedback global
      this.showGlobalShortcutFeedback(windowId);
      
      // Feedback sonore (optionnel)
      this.playShortcutSound();
      
      const feedbackDuration = performance.now() - feedbackStartTime;
      console.log(`OptimizedShortcutManager: Instant feedback shown in ${feedbackDuration.toFixed(2)}ms`);
      
    } catch (error) {
      console.warn('OptimizedShortcutManager: Error showing instant feedback:', error);
    }
  }

  /**
   * Feedback dans le dock
   */
  showDockShortcutFeedback(windowId) {
    const dockElement = document.querySelector(`[data-window-id="${windowId}"]`);
    if (dockElement) {
      // Animation de pulsation immédiate
      dockElement.style.animation = 'shortcut-pulse 0.3s ease-out';
      dockElement.classList.add('shortcut-activated');
      
      // Nettoyage après animation
      setTimeout(() => {
        dockElement.style.animation = '';
        dockElement.classList.remove('shortcut-activated');
      }, 300);
    }
  }

  /**
   * Feedback global
   */
  showGlobalShortcutFeedback(windowId) {
    // Créer un indicateur de raccourci activé
    const indicator = document.createElement('div');
    indicator.className = 'shortcut-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(52, 152, 219, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      opacity: 0;
      scale: 0.8;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    indicator.textContent = '⚡ Shortcut Activated';
    
    document.body.appendChild(indicator);
    
    // Animation d'apparition
    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
      indicator.style.scale = '1';
    });
    
    // Suppression automatique
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.scale = '0.8';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 200);
    }, 800);
  }

  /**
   * Son de raccourci (optionnel)
   */
  playShortcutSound() {
    try {
      // Son très court et discret
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
    } catch (error) {
      // Ignorer les erreurs audio
    }
  }

  /**
   * Feedback de résultat
   */
  showResultFeedback(windowId, success, duration) {
    const color = success ? '#27ae60' : '#e74c3c';
    const icon = success ? '✓' : '✗';
    const message = success ? 
      `Activated in ${duration.toFixed(0)}ms` : 
      'Activation failed';
    
    // Créer l'indicateur de résultat
    const result = document.createElement('div');
    result.className = 'shortcut-result';
    result.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    `;
    result.textContent = `${icon} ${message}`;
    
    document.body.appendChild(result);
    
    // Animation d'apparition
    requestAnimationFrame(() => {
      result.style.opacity = '1';
      result.style.transform = 'translateX(0)';
    });
    
    // Suppression automatique
    setTimeout(() => {
      result.style.opacity = '0';
      result.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (result.parentNode) {
          result.parentNode.removeChild(result);
        }
      }, 300);
    }, success ? 1500 : 3000);
  }

  /**
   * Feedback d'erreur
   */
  showErrorFeedback(windowId) {
    this.showResultFeedback(windowId, false, 0);
  }

  /**
   * Activation de tous les raccourcis avec optimisation
   */
  async activateAll() {
    const startTime = performance.now();
    
    // Feedback global d'activation
    this.showGlobalActivationFeedback();
    
    // Activation normale
    await super.activateAll();
    
    const duration = performance.now() - startTime;
    console.log(`OptimizedShortcutManager: All shortcuts activated with optimization in ${duration}ms`);
  }

  /**
   * Feedback global d'activation
   */
  showGlobalActivationFeedback() {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
      transition: all 0.3s ease-out;
      pointer-events: none;
    `;
    feedback.textContent = '🚀 Shortcuts Activated';
    
    document.body.appendChild(feedback);
    
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 2000);
  }

  /**
   * Configuration du feedback instantané
   */
  setInstantFeedback(enabled) {
    this.instantFeedbackEnabled = enabled;
    console.log(`OptimizedShortcutManager: Instant feedback ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Statistiques optimisées
   */
  getOptimizedStats() {
    const baseStats = super.getStats();
    const optimizerStats = this.displayOptimizer.getPerformanceStats();
    
    return {
      ...baseStats,
      displayOptimization: optimizerStats,
      instantFeedbackEnabled: this.instantFeedbackEnabled,
      feedbackCacheSize: this.feedbackCache.size,
      optimizationEnabled: true
    };
  }

  /**
   * Nettoyage optimisé
   */
  cleanup() {
    // Nettoyer le cache de feedback
    this.feedbackCache.clear();
    
    // Nettoyer l'optimiseur d'affichage
    this.displayOptimizer.cleanup();
    
    // Supprimer les éléments de feedback restants
    document.querySelectorAll('.shortcut-indicator, .shortcut-result').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Nettoyage parent
    super.cleanup();
    
    console.log('OptimizedShortcutManager: Optimized cleanup completed');
  }
}

module.exports = OptimizedShortcutManager;