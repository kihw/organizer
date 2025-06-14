/**
 * SimplifiedWindowManager - Gestionnaire simplifié avec méthode unique d'activation
 * Remplace tous les autres gestionnaires par une approche unifiée
 */

const OptimizedWindowActivationManager = require('./OptimizedWindowActivationManager');
const eventBus = require('../core/EventBus');
const performanceMonitor = require('../core/PerformanceMonitor');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SimplifiedWindowManager {
  constructor() {
    this.activationManager = new OptimizedWindowActivationManager();
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
    
    console.log('SimplifiedWindowManager: Initialized with single activation method');
  }

  /**
   * MÉTHODE PRINCIPALE - Activation de fenêtre (utilise la méthode unique)
   */
  async activateWindow(windowId) {
    return performanceMonitor.measureAsync('simplified_window_activation', async () => {
      console.log(`SimplifiedWindowManager: Activating ${windowId} with optimized method`);
      
      // Utiliser la méthode unique optimisée
      const success = await this.activationManager.activateWindowOptimized(windowId);
      
      if (success) {
        // Émettre l'événement pour informer les autres composants
        eventBus.emit('window:activated', { 
          windowId, 
          method: 'simplified_optimized',
          timestamp: Date.now()
        });
      }
      
      return success;
    });
  }

  /**
   * Détection des fenêtres Dofus (simplifiée)
   */
  async getDofusWindows() {
    const startTime = Date.now();
    
    try {
      if (this.isScanning) {
        console.log('SimplifiedWindowManager: Scan in progress, returning cached');
        return this.lastDetectedWindows;
      }
      
      this.isScanning = true;
      console.log('SimplifiedWindowManager: Starting simplified detection...');
      
      const windows = await this.detectDofusWindowsSimplified();
      
      if (windows && windows.length >= 0) {
        this.lastDetectedWindows = windows;
        
        // Enregistrer toutes les fenêtres dans le gestionnaire d'activation
        windows.forEach(window => {
          this.activationManager.registerWindow(window.id, window.realHandle, window);
        });
        
        console.log(`SimplifiedWindowManager: Detected ${windows.length} windows in ${Date.now() - startTime}ms`);
      }
      
      return this.lastDetectedWindows;
      
    } catch (error) {
      console.error('SimplifiedWindowManager: Detection failed:', error.message);
      return this.lastDetectedWindows;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Détection simplifiée (une seule méthode efficace)
   */
  async detectDofusWindowsSimplified() {
    try {
      // Commande PowerShell optimisée pour la détection
      const command = `powershell.exe -NoProfile -Command "Get-Process|Where-Object{($_.ProcessName -like '*dofus*' -or $_.ProcessName -like '*steamer*' -or $_.ProcessName -like '*boulonix*') -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match '(feca|osamodas|enutrof|sram|xelor|ecaflip|eniripsa|iop|cra|sadida|sacrieur|pandawa|roublard|zobal|steamer|eliotrope|huppermage|ouginak|forgelance)'}|ForEach-Object{[PSCustomObject]@{Id=$_.Id;ProcessName=$_.ProcessName;Title=$_.MainWindowTitle;Handle=$_.MainWindowHandle.ToInt64()}}|ConvertTo-Json -Compress"`;
      
      const { stdout } = await execAsync(command, {
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      // Traitement simplifié des fenêtres
      const processedWindows = processes
        .filter(proc => this.validateProcess(proc))
        .map(proc => this.processWindow(proc))
        .filter(window => window !== null);
      
      return processedWindows;
      
    } catch (error) {
      console.warn('SimplifiedWindowManager: Detection failed:', error.message);
      return [];
    }
  }

  /**
   * Validation simplifiée du processus
   */
  validateProcess(proc) {
    return proc && 
           proc.Title && 
           proc.Handle && 
           proc.Handle !== 0 && 
           proc.Id && 
           proc.ProcessName &&
           !proc.Title.toLowerCase().includes('organizer');
  }

  /**
   * Traitement simplifié de la fenêtre
   */
  processWindow(proc) {
    try {
      const { character, dofusClass } = this.parseTitle(proc.Title);
      const windowId = this.generateId(character, dofusClass, proc.Id);
      
      return {
        id: windowId,
        handle: proc.Handle.toString(),
        realHandle: proc.Handle,
        title: proc.Title,
        processName: proc.ProcessName,
        pid: proc.Id.toString(),
        character: character,
        dofusClass: dofusClass,
        customName: this.getStoredValue(`customNames.${windowId}`, null),
        initiative: this.getStoredValue(`initiatives.${windowId}`, 0),
        isActive: false,
        avatar: this.getClassAvatar(dofusClass),
        shortcut: this.getStoredValue(`shortcuts.${windowId}`, null),
        enabled: this.getStoredValue(`enabled.${windowId}`, true)
      };
    } catch (error) {
      console.warn('SimplifiedWindowManager: Error processing window:', error);
      return null;
    }
  }

  /**
   * Parsing simplifié du titre
   */
  parseTitle(title) {
    if (!title) return { character: 'Dofus Player', dofusClass: 'feca' };
    
    const match = title.match(/^([^-]+)\s*-\s*([^-]+)/);
    if (match) {
      const character = match[1].trim();
      const className = match[2].trim().toLowerCase();
      const normalizedClass = this.normalizeClassName(className);
      return { character, dofusClass: normalizedClass };
    }
    
    const character = title.split(/[-\(\[\{]/)[0].trim() || 'Dofus Player';
    return { character, dofusClass: 'feca' };
  }

  /**
   * Normalisation du nom de classe
   */
  normalizeClassName(className) {
    const normalized = className.toLowerCase().replace(/[^a-z]/g, '');
    const mappings = {
      'feca': 'feca', 'osamodas': 'osamodas', 'enutrof': 'enutrof',
      'sram': 'sram', 'xelor': 'xelor', 'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa', 'iop': 'iop', 'cra': 'cra',
      'sadida': 'sadida', 'sacrieur': 'sacrieur', 'pandawa': 'pandawa',
      'roublard': 'roublard', 'zobal': 'zobal', 'steamer': 'steamer',
      'eliotrope': 'eliotrope', 'huppermage': 'huppermage', 
      'ouginak': 'ouginak', 'forgelance': 'forgelance'
    };
    return mappings[normalized] || 'feca';
  }

  /**
   * Génération d'ID stable
   */
  generateId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${processId}`;
  }

  /**
   * Obtenir une valeur stockée
   */
  getStoredValue(key, defaultValue) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(key, defaultValue);
    } catch (error) {
      return defaultValue;
    }
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
      console.log(`SimplifiedWindowManager: Next window: ${nextWindow.character}`);
      return await this.activateWindow(nextWindow.id);
    }

    return false;
  }

  /**
   * Méthodes déléguées
   */
  getDofusClasses() {
    return this.dofusClasses;
  }

  getClassAvatar(className) {
    return this.dofusClasses[className]?.avatar || '1';
  }

  setWindowClass(windowId, classKey) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const classes = store.get('classes', {});
      classes[windowId] = classKey;
      store.set('classes', classes);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Statistiques
   */
  getStats() {
    return this.activationManager.getStats();
  }

  /**
   * Nettoyage
   */
  cleanup() {
    this.activationManager.cleanup();
    this.lastDetectedWindows = [];
    console.log('SimplifiedWindowManager: Cleanup completed');
  }
}

module.exports = SimplifiedWindowManager;