/**
 * OptimizedWindowActivationManager - Méthode unique ultra-rapide pour l'activation de fenêtres
 * Objectif: <50ms activation avec feedback visuel instantané
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class OptimizedWindowActivationManager {
  constructor() {
    this.windows = new Map();
    this.activationCache = new Map();
    this.handleMapping = new Map();
    this.feedbackElements = new Set();
    
    // Statistiques de performance
    this.stats = {
      activations: 0,
      totalTime: 0,
      avgTime: 0,
      fastActivations: 0, // <50ms
      slowActivations: 0, // >50ms
      failures: 0
    };
    
    console.log('OptimizedWindowActivationManager: Initialized for ultra-fast activation');
  }

  /**
   * MÉTHODE UNIQUE - Activation optimisée avec feedback instantané
   * Combine détection, activation et feedback en une seule méthode efficace
   */
  async activateWindowOptimized(windowId) {
    const startTime = performance.now();
    
    try {
      console.log(`OptimizedWindowActivationManager: Starting activation for ${windowId}`);
      
      // 1. FEEDBACK INSTANTANÉ (0-2ms) - Affiché immédiatement
      this.showInstantFeedback(windowId);
      
      // 2. VALIDATION RAPIDE DU HANDLE
      const handle = this.getWindowHandle(windowId);
      if (!handle) {
        this.showErrorFeedback(windowId, 'Window not found');
        return false;
      }
      
      // 3. VÉRIFICATION DU CACHE D'ACTIVATION
      if (this.isRecentlyActivated(handle)) {
        this.showSuccessFeedback(windowId, performance.now() - startTime);
        return true;
      }
      
      // 4. ACTIVATION ULTRA-RAPIDE avec PowerShell optimisé
      const success = await this.executeUltraFastActivation(handle);
      
      const duration = performance.now() - startTime;
      
      // 5. FEEDBACK DE RÉSULTAT
      if (success) {
        this.updateActivationCache(handle);
        this.updateWindowStates(windowId);
        this.showSuccessFeedback(windowId, duration);
        console.log(`OptimizedWindowActivationManager: SUCCESS in ${duration.toFixed(2)}ms ⚡`);
      } else {
        this.showErrorFeedback(windowId, 'Activation failed');
        console.warn(`OptimizedWindowActivationManager: FAILED in ${duration.toFixed(2)}ms`);
      }
      
      // 6. MISE À JOUR DES STATISTIQUES
      this.updateStats(duration, success);
      
      return success;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`OptimizedWindowActivationManager: Error in ${duration.toFixed(2)}ms:`, error.message);
      this.showErrorFeedback(windowId, error.message);
      this.updateStats(duration, false);
      return false;
    }
  }

  /**
   * Feedback instantané (0-2ms) - Animation immédiate
   */
  showInstantFeedback(windowId) {
    try {
      // Vérifier si on est dans un environnement avec DOM
      if (typeof document === 'undefined') {
        console.log(`OptimizedWindowActivationManager: DOM not available, skipping visual feedback`);
        return;
      }

      // 1. Feedback dans le dock si présent
      const dockElement = document.querySelector(`[data-window-id="${windowId}"]`);
      if (dockElement) {
        dockElement.classList.add('activating');
        dockElement.style.transform = 'scale(1.1)';
        dockElement.style.filter = 'brightness(1.2)';
      }
      
      // 2. Feedback global - indicateur central
      this.createGlobalIndicator(windowId);
      
      console.log(`OptimizedWindowActivationManager: Instant feedback shown for ${windowId}`);
    } catch (error) {
      console.warn('OptimizedWindowActivationManager: Feedback error:', error);
    }
  }

  /**
   * Créer un indicateur global instantané
   */
  createGlobalIndicator(windowId) {
    if (typeof document === 'undefined') return;

    const indicator = document.createElement('div');
    indicator.id = `activation-indicator-${windowId}`;
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: none;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 32px rgba(52, 152, 219, 0.4);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    indicator.textContent = '⚡ Activating...';
    
    document.body.appendChild(indicator);
    this.feedbackElements.add(indicator);
    
    // Animation d'apparition immédiate
    requestAnimationFrame(() => {
      indicator.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }

  /**
   * Obtenir le handle de fenêtre (cache optimisé)
   */
  getWindowHandle(windowId) {
    return this.handleMapping.get(windowId) || null;
  }

  /**
   * Vérifier si la fenêtre a été récemment activée
   */
  isRecentlyActivated(handle) {
    const lastActivation = this.activationCache.get(handle.toString());
    return lastActivation && (Date.now() - lastActivation) < 200; // 200ms cooldown
  }

  /**
   * Exécution ultra-rapide de l'activation - PowerShell optimisé
   */
  async executeUltraFastActivation(handle) {
    try {
      console.log(`OptimizedWindowActivationManager: Ultra-fast activation for handle ${handle}`);
      
      // Commande PowerShell ultra-optimisée - Une seule ligne
      const command = `powershell.exe -NoProfile -NoLogo -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr h);[DllImport(\\"user32.dll\\")]public static extern bool ShowWindow(IntPtr h,int s);[DllImport(\\"user32.dll\\")]public static extern bool BringWindowToTop(IntPtr h);}';$h=[IntPtr]${handle};[Win32]::ShowWindow($h,9);[Win32]::BringWindowToTop($h);[Win32]::SetForegroundWindow($h)"`;
      
      await execAsync(command, {
        timeout: 300, // 300ms timeout max
        encoding: 'utf8',
        windowsHide: true,
        killSignal: 'SIGKILL'
      });
      
      return true;
      
    } catch (error) {
      console.warn('OptimizedWindowActivationManager: Activation failed:', error.message);
      return false;
    }
  }

  /**
   * Mettre à jour le cache d'activation
   */
  updateActivationCache(handle) {
    this.activationCache.set(handle.toString(), Date.now());
    
    // Nettoyer les entrées anciennes (>5 secondes)
    const fiveSecondsAgo = Date.now() - 5000;
    for (const [key, timestamp] of this.activationCache.entries()) {
      if (timestamp < fiveSecondsAgo) {
        this.activationCache.delete(key);
      }
    }
  }

  /**
   * Mettre à jour les états des fenêtres
   */
  updateWindowStates(activeWindowId) {
    // Mise à jour rapide des états actifs
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * Feedback de succès
   */
  showSuccessFeedback(windowId, duration) {
    if (typeof document === 'undefined') return;

    const indicator = document.getElementById(`activation-indicator-${windowId}`);
    if (indicator) {
      // Changer l'apparence pour le succès
      indicator.style.background = duration < 50 ? 
        'linear-gradient(135deg, #27ae60, #2ecc71)' : 
        'linear-gradient(135deg, #f39c12, #e67e22)';
      
      indicator.textContent = duration < 50 ? 
        `⚡ Fast! ${duration.toFixed(0)}ms` : 
        `✓ Done ${duration.toFixed(0)}ms`;
      
      // Suppression automatique
      setTimeout(() => this.removeFeedbackElement(indicator), 1000);
    }
    
    // Nettoyer le feedback du dock
    this.cleanupDockFeedback(windowId);
  }

  /**
   * Feedback d'erreur
   */
  showErrorFeedback(windowId, errorMessage) {
    if (typeof document === 'undefined') return;

    const indicator = document.getElementById(`activation-indicator-${windowId}`);
    if (indicator) {
      indicator.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
      indicator.textContent = '❌ Failed';
      
      // Suppression automatique
      setTimeout(() => this.removeFeedbackElement(indicator), 2000);
    }
    
    // Nettoyer le feedback du dock
    this.cleanupDockFeedback(windowId);
  }

  /**
   * Nettoyer le feedback du dock
   */
  cleanupDockFeedback(windowId) {
    if (typeof document === 'undefined') return;

    const dockElement = document.querySelector(`[data-window-id="${windowId}"]`);
    if (dockElement) {
      dockElement.classList.remove('activating');
      dockElement.style.transform = '';
      dockElement.style.filter = '';
    }
  }

  /**
   * Supprimer un élément de feedback
   */
  removeFeedbackElement(element) {
    if (!element || !element.parentNode) return;

    element.style.transform = 'translate(-50%, -50%) scale(0)';
    element.style.opacity = '0';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.feedbackElements.delete(element);
    }, 200);
  }

  /**
   * Mettre à jour les statistiques
   */
  updateStats(duration, success) {
    this.stats.activations++;
    this.stats.totalTime += duration;
    this.stats.avgTime = this.stats.totalTime / this.stats.activations;
    
    if (success) {
      if (duration < 50) {
        this.stats.fastActivations++;
      } else {
        this.stats.slowActivations++;
      }
    } else {
      this.stats.failures++;
    }
  }

  /**
   * MÉTHODE PUBLIQUE - Enregistrer une fenêtre pour activation
   */
  registerWindow(windowId, handle, windowInfo = {}) {
    this.handleMapping.set(windowId, handle);
    this.windows.set(windowId, { info: windowInfo });
    
    console.log(`OptimizedWindowActivationManager: Registered window ${windowId} with handle ${handle}`);
  }

  /**
   * MÉTHODE PUBLIQUE - Obtenir les statistiques
   */
  getStats() {
    const successRate = this.stats.activations > 0 ? 
      ((this.stats.activations - this.stats.failures) / this.stats.activations * 100) : 100;
    
    const fastRate = this.stats.activations > 0 ? 
      (this.stats.fastActivations / this.stats.activations * 100) : 0;
    
    return {
      ...this.stats,
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(1)),
      fastRate: parseFloat(fastRate.toFixed(1)),
      target: '<50ms',
      status: this.stats.avgTime < 50 ? 'EXCELLENT' : this.stats.avgTime < 100 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }

  /**
   * MÉTHODE PUBLIQUE - Nettoyage
   */
  cleanup() {
    // Nettoyer tous les éléments de feedback
    if (typeof document !== 'undefined') {
      this.feedbackElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
    this.feedbackElements.clear();
    
    // Nettoyer les caches
    this.activationCache.clear();
    this.handleMapping.clear();
    this.windows.clear();
    
    console.log('OptimizedWindowActivationManager: Cleanup completed');
    console.log('Final Stats:', this.getStats());
  }
}

module.exports = OptimizedWindowActivationManager;