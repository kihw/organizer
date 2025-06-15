const PythonWindowActivator = require('./PythonWindowActivator');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');

/**
 * PythonWindowManager - Gestionnaire simplifié utilisant uniquement Python
 * Supprime toutes les méthodes PowerShell complexes au profit de Python natif
 */
class PythonWindowManager {
  constructor() {
    this.pythonActivator = new PythonWindowActivator();
    this.lastDetectedWindows = [];
    this.isScanning = false;
    
    // Classes Dofus avec avatars
    this.dofusClasses = {
      'feca': { name: 'Feca', avatar: '1' },
      'osamodas': { name: 'Osamodas', avatar: '2' },
      'enutrof': { name: 'Enutrof', avatar: '3' },
      'sram': { name: 'Sram', avatar: '4' },
      'xelor': { name: 'Xelor', avatar: '5' },
      'ecaflip': { name: 'Ecaflip', avatar: '6' },
      'eniripsa': { name: 'Eniripsa', avatar: '7' },
      'iop': { name: 'Iop', avatar: '8' },
      'cra': { name: 'Cra', avatar: '9' },
      'sadida': { name: 'Sadida', avatar: '10' },
      'sacrieur': { name: 'Sacrieur', avatar: '11' },
      'pandawa': { name: 'Pandawa', avatar: '12' },
      'roublard': { name: 'Roublard', avatar: '13' },
      'zobal': { name: 'Zobal', avatar: '14' },
      'steamer': { name: 'Steamer', avatar: '15' },
      'eliotrope': { name: 'Eliotrope', avatar: '16' },
      'huppermage': { name: 'Huppermage', avatar: '17' },
      'ouginak': { name: 'Ouginak', avatar: '18' },
      'forgelance': { name: 'Forgelance', avatar: '20' }
    };
    
    console.log('PythonWindowManager: Initialized with Python-only activation');
  }

  /**
   * MÉTHODE PRINCIPALE - Activation de fenêtre via Python
   * Remplace toutes les méthodes PowerShell/Windows API
   */
  async activateWindow(windowId) {
    return performanceMonitor.measureAsync('python_window_activation', async () => {
      const startTime = Date.now();
      
      try {
        console.log(`PythonWindowManager: Activating ${windowId} with Python`);
        
        // Activation directe via Python
        const success = await this.pythonActivator.activateWindow(windowId);
        
        const duration = Date.now() - startTime;
        
        if (success) {
          // Mettre à jour l'état actif
          this.updateActiveState(windowId);
          
          // Émettre l'événement
          eventBus.emit('window:activated', { 
            windowId, 
            duration,
            method: 'python'
          });
          
          console.log(`PythonWindowManager: SUCCESS for ${windowId} in ${duration}ms`);
          return true;
        } else {
          console.warn(`PythonWindowManager: FAILED for ${windowId}`);
          eventBus.emit('window:activation_failed', { windowId });
          return false;
        }
        
      } catch (error) {
        console.error(`PythonWindowManager: Error activating ${windowId}:`, error.message);
        return false;
      }
    });
  }

  /**
   * Détection des fenêtres via Python
   */
  async getDofusWindows() {
    const startTime = Date.now();
    
    try {
      if (this.isScanning) {
        console.log('PythonWindowManager: Scan in progress, returning cached');
        return this.lastDetectedWindows;
      }
      
      this.isScanning = true;
      console.log('PythonWindowManager: Starting Python detection...');
      
      // Détection via Python
      const windows = await this.pythonActivator.getDofusWindows();
      
      if (windows && windows.length >= 0) {
        // Enrichir les fenêtres avec les données stockées
        const enrichedWindows = this.enrichWindowsWithStoredData(windows);
        
        // Trier par initiative
        enrichedWindows.sort((a, b) => {
          if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
          }
          return a.character.localeCompare(b.character);
        });
        
        this.lastDetectedWindows = enrichedWindows;
        
        const duration = Date.now() - startTime;
        console.log(`PythonWindowManager: Detected ${enrichedWindows.length} windows in ${duration}ms`);
      }
      
      return this.lastDetectedWindows;
      
    } catch (error) {
      console.error('PythonWindowManager: Detection failed:', error.message);
      return this.lastDetectedWindows;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Enrichit les fenêtres avec les données stockées (initiative, raccourcis, etc.)
   */
  enrichWindowsWithStoredData(windows) {
    return windows.map(window => {
      try {
        return {
          ...window,
          customName: this.getStoredValue(`customNames.${window.id}`, null),
          initiative: this.getStoredValue(`initiatives.${window.id}`, 0),
          shortcut: this.getStoredValue(`shortcuts.${window.id}`, null),
          enabled: this.getStoredValue(`enabled.${window.id}`, true),
          dofusClass: this.getStoredValue(`classes.${window.id}`, window.dofusClass),
          avatar: this.getClassAvatar(this.getStoredValue(`classes.${window.id}`, window.dofusClass))
        };
      } catch (error) {
        console.warn('PythonWindowManager: Error enriching window data:', error.message);
        return window;
      }
    });
  }

  /**
   * Activation de la fenêtre suivante
   */
  async activateNextWindow() {
    const enabledWindows = this.lastDetectedWindows.filter(w => w.enabled);
    if (enabledWindows.length === 0) return false;

    // Tri par initiative
    enabledWindows.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return a.character.localeCompare(b.character);
    });

    const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);
    const nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
    const nextWindow = enabledWindows[nextIndex];

    if (nextWindow) {
      console.log(`PythonWindowManager: Next window: ${nextWindow.character}`);
      return await this.activateWindow(nextWindow.id);
    }

    return false;
  }

  /**
   * Met à jour l'état actif des fenêtres
   */
  updateActiveState(activeWindowId) {
    this.lastDetectedWindows.forEach(window => {
      if (window && window.id) {
        window.isActive = window.id === activeWindowId;
      }
    });
  }

  /**
   * Obtient une valeur stockée avec gestion d'erreur
   */
  getStoredValue(key, defaultValue) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(key, defaultValue);
    } catch (error) {
      console.warn(`PythonWindowManager: Error getting stored value for ${key}:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Obtient l'avatar de classe
   */
  getClassAvatar(className) {
    return this.dofusClasses[className]?.avatar || '1';
  }

  /**
   * Obtient les classes Dofus
   */
  getDofusClasses() {
    return this.dofusClasses;
  }

  /**
   * Définit la classe d'une fenêtre
   */
  setWindowClass(windowId, classKey) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const classes = store.get('classes', {});
      classes[windowId] = classKey;
      store.set('classes', classes);
      
      // Mettre à jour dans la liste actuelle
      const window = this.lastDetectedWindows.find(w => w.id === windowId);
      if (window) {
        window.dofusClass = classKey;
        window.avatar = this.getClassAvatar(classKey);
      }
      
      return true;
    } catch (error) {
      console.error('PythonWindowManager: Error setting window class:', error);
      return false;
    }
  }

  /**
   * Organisation des fenêtres (désactivée - non compatible avec Python simple)
   */
  async organizeWindows(layout = 'grid') {
    console.log('PythonWindowManager: Window organization not implemented for Python method');
    return false;
  }

  /**
   * Teste la connexion Python
   */
  async testPythonConnection() {
    try {
      const result = await this.pythonActivator.testPythonConnection();
      console.log('PythonWindowManager: Python connection test:', result);
      return result;
    } catch (error) {
      console.error('PythonWindowManager: Python connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Invalidation du cache (force un nouveau scan)
   */
  invalidateCache() {
    this.lastDetectedWindows = [];
    console.log('PythonWindowManager: Cache invalidated');
  }

  /**
   * Statistiques de performance
   */
  getStats() {
    const pythonStats = this.pythonActivator.getStats();
    
    return {
      ...pythonStats,
      lastDetectedCount: this.lastDetectedWindows.length,
      isScanning: this.isScanning,
      activationMethod: 'Python Native Script'
    };
  }

  /**
   * Rapport de santé du système Python
   */
  async getHealthStatus() {
    try {
      const pythonTest = await this.testPythonConnection();
      const stats = this.getStats();
      
      let status = 'healthy';
      const issues = [];
      
      if (!pythonTest.success) {
        status = 'critical';
        issues.push('Python script connection failed');
      }
      
      if (stats.avgTime > 100) {
        status = status === 'critical' ? 'critical' : 'degraded';
        issues.push(`Slow activation time: ${stats.avgTime}ms`);
      }
      
      if (stats.successRate < 95) {
        status = status === 'critical' ? 'critical' : 'degraded';
        issues.push(`Low success rate: ${stats.successRate}%`);
      }
      
      return {
        status,
        pythonAvailable: pythonTest.success,
        activationStats: stats,
        issues,
        recommendations: this.generateRecommendations(issues),
        lastDetectedWindows: this.lastDetectedWindows.length
      };
      
    } catch (error) {
      return {
        status: 'critical',
        pythonAvailable: false,
        error: error.message,
        issues: ['Python system completely unavailable'],
        recommendations: ['Install Python and required packages', 'Check script permissions'],
        lastDetectedWindows: this.lastDetectedWindows.length
      };
    }
  }

  /**
   * Génère des recommandations basées sur les problèmes détectés
   */
  generateRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('Python script'))) {
      recommendations.push('Install Python 3.x and required packages: pip install pygetwindow pywin32');
      recommendations.push('Verify script permissions and path');
    }
    
    if (issues.some(issue => issue.includes('Slow activation'))) {
      recommendations.push('Check system resources and close unnecessary applications');
      recommendations.push('Verify Python installation is optimized');
    }
    
    if (issues.some(issue => issue.includes('Low success rate'))) {
      recommendations.push('Ensure Dofus windows have proper titles');
      recommendations.push('Check for window title format changes');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System running optimally');
    }
    
    return recommendations;
  }

  /**
   * Validation de l'environnement Python
   */
  async validatePythonEnvironment() {
    try {
      console.log('PythonWindowManager: Validating Python environment...');
      
      // Test de base
      const basicTest = await this.pythonActivator.verifyPythonScript();
      if (!basicTest) {
        return {
          valid: false,
          error: 'Python basic verification failed',
          details: 'Python not available or script missing'
        };
      }
      
      // Test de détection
      const detectionTest = await this.pythonActivator.getDofusWindows();
      
      // Test de connexion
      const connectionTest = await this.testPythonConnection();
      
      const valid = basicTest && connectionTest.success;
      
      return {
        valid,
        pythonAvailable: basicTest,
        detectionWorking: Array.isArray(detectionTest),
        connectionTest: connectionTest,
        windowsDetected: detectionTest ? detectionTest.length : 0
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        details: 'Python environment validation failed'
      };
    }
  }

  /**
   * Nettoyage
   */
  cleanup() {
    try {
      this.lastDetectedWindows = [];
      this.pythonActivator.cleanup();
      
      console.log('PythonWindowManager: Cleanup completed');
      
      const finalStats = this.getStats();
      console.log('PythonWindowManager: Final Python stats:', finalStats);
      
      eventBus.emit('windows:cleanup_python', finalStats);
    } catch (error) {
      console.error('PythonWindowManager: Cleanup error:', error);
    }
  }
}

module.exports = PythonWindowManager;
