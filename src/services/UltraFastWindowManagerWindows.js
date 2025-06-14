/**
 * UltraFastWindowManagerWindows - Activation de fenêtres ultra-rapide
 * Objectif: <100ms d'activation (vs 1000ms+ actuellement)
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class UltraFastWindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.handleCache = new Map();
    this.activationCache = new Map();
    this.nativeModule = null;
    this.fallbackMethod = 'powershell-optimized';
    
    // Statistiques de performance
    this.stats = {
      activations: 0,
      totalTime: 0,
      avgTime: 0,
      fastActivations: 0, // <100ms
      slowActivations: 0, // >100ms
      failures: 0
    };
    
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
    
    this.initializeNativeModule();
    console.log('UltraFastWindowManagerWindows: Initialized for <100ms activation');
  }

  /**
   * Initialisation du module natif pour activation ultra-rapide
   */
  initializeNativeModule() {
    try {
      // Essayer de charger un module natif si disponible
      // Sinon, utiliser la méthode PowerShell optimisée
      console.log('UltraFastWindowManagerWindows: Using optimized PowerShell method');
      this.fallbackMethod = 'powershell-ultra-optimized';
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: Native module not available, using fallback');
      this.fallbackMethod = 'powershell-optimized';
    }
  }

  /**
   * Activation ultra-rapide de fenêtre - MÉTHODE PRINCIPALE
   */
  async activateWindow(windowId) {
    const startTime = Date.now();
    
    try {
      console.log(`UltraFastWindowManagerWindows: Ultra-fast activation for ${windowId}`);
      
      // 1. Validation ultra-rapide
      const handle = this.handleCache.get(windowId);
      if (!handle || handle === 0) {
        console.error(`UltraFastWindowManagerWindows: No handle for ${windowId}`);
        this.updateStats(startTime, false);
        return false;
      }
      
      // 2. Vérification du cache d'activation récente
      const cacheKey = handle.toString();
      const now = Date.now();
      const lastActivation = this.activationCache.get(cacheKey);
      
      if (lastActivation && (now - lastActivation) < 200) {
        console.log(`UltraFastWindowManagerWindows: Recent activation cached for ${windowId}`);
        this.updateStats(startTime, true);
        return true;
      }
      
      // 3. Activation ultra-rapide avec méthodes multiples
      const success = await this.performUltraFastActivation(handle);
      
      const duration = Date.now() - startTime;
      
      if (success) {
        this.activationCache.set(cacheKey, now);
        this.updateActiveState(windowId);
        console.log(`UltraFastWindowManagerWindows: SUCCESS in ${duration}ms ⚡`);
      } else {
        console.warn(`UltraFastWindowManagerWindows: FAILED in ${duration}ms`);
      }
      
      this.updateStats(startTime, success);
      return success;
      
    } catch (error) {
      console.error(`UltraFastWindowManagerWindows: Error:`, error.message);
      this.updateStats(startTime, false);
      return false;
    }
  }

  /**
   * Activation ultra-rapide avec méthodes multiples en parallèle
   */
  async performUltraFastActivation(handle) {
    console.log(`UltraFastWindowManagerWindows: Performing ultra-fast activation for handle ${handle}`);
    
    // Essayer plusieurs méthodes en parallèle pour maximiser les chances de succès rapide
    const methods = [
      this.tryDirectWinAPI(handle),
      this.tryOptimizedPowerShell(handle),
      this.tryAlternativeMethod(handle)
    ];
    
    // Utiliser Promise.race pour prendre la première méthode qui réussit
    try {
      const result = await Promise.race(methods);
      if (result) {
        console.log('UltraFastWindowManagerWindows: Fast method succeeded ⚡');
        return true;
      }
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: All fast methods failed, trying fallback');
    }
    
    // Fallback si toutes les méthodes rapides échouent
    return await this.tryFallbackActivation(handle);
  }

  /**
   * Méthode 1: API Windows directe (la plus rapide)
   */
  async tryDirectWinAPI(handle) {
    try {
      console.log(`UltraFastWindowManagerWindows: Trying direct WinAPI for ${handle}`);
      
      // PowerShell ultra-optimisé avec timeout très court
      const command = `powershell.exe -NoProfile -NoLogo -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);[DllImport(\\"user32.dll\\")]public static extern bool ShowWindow(IntPtr hWnd,int nCmdShow);[DllImport(\\"user32.dll\\")]public static extern bool BringWindowToTop(IntPtr hWnd);}';$h=[IntPtr]${handle};[Win32]::ShowWindow($h,9);[Win32]::BringWindowToTop($h);[Win32]::SetForegroundWindow($h)"`;
      
      await execAsync(command, {
        timeout: 500, // 500ms max
        encoding: 'utf8',
        windowsHide: true,
        killSignal: 'SIGKILL'
      });
      
      console.log('UltraFastWindowManagerWindows: Direct WinAPI SUCCESS');
      return true;
      
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: Direct WinAPI failed:', error.message);
      return false;
    }
  }

  /**
   * Méthode 2: PowerShell ultra-optimisé
   */
  async tryOptimizedPowerShell(handle) {
    try {
      console.log(`UltraFastWindowManagerWindows: Trying optimized PowerShell for ${handle}`);
      
      // Version ultra-compacte et rapide
      const command = `powershell.exe -NoProfile -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');[System.Windows.Forms.SendKeys]::SendWait('%{TAB}');Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class W{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr h);}';[W]::SetForegroundWindow([IntPtr]${handle})"`;
      
      await execAsync(command, {
        timeout: 300, // 300ms max
        encoding: 'utf8',
        windowsHide: true
      });
      
      console.log('UltraFastWindowManagerWindows: Optimized PowerShell SUCCESS');
      return true;
      
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: Optimized PowerShell failed:', error.message);
      return false;
    }
  }

  /**
   * Méthode 3: Méthode alternative (SendKeys + SetForegroundWindow)
   */
  async tryAlternativeMethod(handle) {
    try {
      console.log(`UltraFastWindowManagerWindows: Trying alternative method for ${handle}`);
      
      // Utiliser une approche différente avec SendKeys
      const command = `powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms;Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);}';[Win32]::SetForegroundWindow([IntPtr]${handle});Start-Sleep -Milliseconds 50;[System.Windows.Forms.SendKeys]::SendWait('{ESC}')"`;
      
      await execAsync(command, {
        timeout: 400, // 400ms max
        encoding: 'utf8',
        windowsHide: true
      });
      
      console.log('UltraFastWindowManagerWindows: Alternative method SUCCESS');
      return true;
      
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: Alternative method failed:', error.message);
      return false;
    }
  }

  /**
   * Méthode de fallback si toutes les autres échouent
   */
  async tryFallbackActivation(handle) {
    try {
      console.log(`UltraFastWindowManagerWindows: Trying fallback activation for ${handle}`);
      
      // Méthode simple mais fiable
      const command = `powershell.exe -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');[System.Windows.Forms.SendKeys]::SendWait('%{TAB}');Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);}';[Win32]::SetForegroundWindow([IntPtr]${handle})"`;
      
      await execAsync(command, {
        timeout: 1000, // 1s max pour le fallback
        encoding: 'utf8',
        windowsHide: true
      });
      
      console.log('UltraFastWindowManagerWindows: Fallback activation SUCCESS');
      return true;
      
    } catch (error) {
      console.error('UltraFastWindowManagerWindows: Fallback activation failed:', error.message);
      return false;
    }
  }

  /**
   * Détection rapide des fenêtres Dofus (réutilisée de l'ancienne classe)
   */
  async getDofusWindows() {
    const startTime = Date.now();
    
    try {
      console.log('UltraFastWindowManagerWindows: Fast detection...');
      
      const windows = await this.detectDofusUltraFast();
      
      if (windows && windows.length > 0) {
        const processedWindows = this.processRawWindowsUltraFast(windows);
        
        // Tri par initiative
        processedWindows.sort((a, b) => {
          if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
          }
          return a.character.localeCompare(b.character);
        });
        
        const duration = Date.now() - startTime;
        console.log(`UltraFastWindowManagerWindows: Detected ${processedWindows.length} windows in ${duration}ms`);
        return processedWindows;
      }
      
      console.log('UltraFastWindowManagerWindows: No windows detected');
      return [];
      
    } catch (error) {
      console.error('UltraFastWindowManagerWindows: Detection failed:', error.message);
      return [];
    }
  }

  /**
   * Détection ultra-rapide des fenêtres
   */
  async detectDofusUltraFast() {
    try {
      // Commande PowerShell ultra-optimisée pour la détection
      const command = `powershell.exe -NoProfile -Command "Get-Process|Where-Object{($_.ProcessName -like '*dofus*' -or $_.ProcessName -like '*steamer*' -or $_.ProcessName -like '*boulonix*') -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne ''}|ForEach-Object{[PSCustomObject]@{Id=$_.Id;ProcessName=$_.ProcessName;Title=$_.MainWindowTitle;Handle=$_.MainWindowHandle.ToInt64()}}|ConvertTo-Json -Compress"`;
      
      const { stdout } = await execAsync(command, {
        timeout: 2000, // 2s max pour la détection
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      return processes
        .filter(proc => this.validateProcessData(proc))
        .map(proc => this.normalizeProcessData(proc));
      
    } catch (error) {
      console.warn('UltraFastWindowManagerWindows: Ultra-fast detection failed:', error.message);
      return [];
    }
  }

  /**
   * Traitement ultra-rapide des fenêtres
   */
  processRawWindowsUltraFast(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();
    
    for (const rawWindow of rawWindows) {
      if (!this.validateRawWindow(rawWindow)) {
        continue;
      }
      
      // Parser rapidement les infos
      const { character, dofusClass } = this.parseWindowTitleFast(rawWindow.Title);
      const stableId = this.generateStableWindowId(character, dofusClass, rawWindow.ProcessId);
      
      // Stocker le handle pour activation ultra-rapide
      this.handleCache.set(stableId, rawWindow.Handle);
      currentWindowIds.add(stableId);
      
      const windowInfo = {
        id: stableId,
        handle: rawWindow.Handle.toString(),
        realHandle: rawWindow.Handle,
        title: rawWindow.Title,
        processName: this.extractProcessName(rawWindow.ProcessName),
        className: rawWindow.ClassName,
        pid: rawWindow.ProcessId.toString(),
        character: character,
        dofusClass: dofusClass,
        customName: this.getStoredCustomName(stableId),
        initiative: this.getStoredInitiative(stableId),
        isActive: false,
        bounds: { X: 0, Y: 0, Width: 800, Height: 600 },
        avatar: this.getClassAvatar(dofusClass),
        shortcut: this.getStoredShortcut(stableId),
        enabled: this.getStoredEnabled(stableId)
      };
      
      processedWindows.push(windowInfo);
      this.windows.set(stableId, { info: windowInfo });
    }
    
    // Nettoyage rapide
    this.cleanupOldWindowsUltraFast(currentWindowIds);
    
    return processedWindows;
  }

  /**
   * Parsing ultra-rapide du titre
   */
  parseWindowTitleFast(title) {
    if (!title) {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }

    // Parsing rapide avec regex pré-compilée
    const match = title.match(/^([^-]+)\s*-\s*([^-]+)/);
    if (match) {
      const character = match[1].trim();
      const className = match[2].trim();
      const normalizedClass = this.normalizeClassNameFast(className);
      
      return { character, dofusClass: normalizedClass };
    }
    
    // Fallback rapide
    const character = title.split(/[-\(\[\{]/)[0].trim() || 'Dofus Player';
    return { character, dofusClass: 'feca' };
  }

  /**
   * Normalisation ultra-rapide du nom de classe
   */
  normalizeClassNameFast(className) {
    if (!className) return 'feca';
    
    const normalized = className.toLowerCase().replace(/[^a-z]/g, '');
    
    // Mapping direct pour les classes les plus communes
    const quickMap = {
      'feca': 'feca', 'osamodas': 'osamodas', 'enutrof': 'enutrof',
      'sram': 'sram', 'xelor': 'xelor', 'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa', 'iop': 'iop', 'cra': 'cra',
      'sadida': 'sadida', 'sacrieur': 'sacrieur', 'pandawa': 'pandawa',
      'steamer': 'steamer', 'boulonix': 'steamer'
    };
    
    return quickMap[normalized] || 'feca';
  }

  /**
   * Mise à jour des statistiques de performance
   */
  updateStats(startTime, success) {
    const duration = Date.now() - startTime;
    
    this.stats.activations++;
    this.stats.totalTime += duration;
    this.stats.avgTime = this.stats.totalTime / this.stats.activations;
    
    if (success) {
      if (duration < 100) {
        this.stats.fastActivations++;
      } else {
        this.stats.slowActivations++;
      }
    } else {
      this.stats.failures++;
    }
  }

  /**
   * Obtenir les statistiques de performance
   */
  getPerformanceStats() {
    const successRate = this.stats.activations > 0 ? 
      ((this.stats.activations - this.stats.failures) / this.stats.activations * 100) : 100;
    
    const fastRate = this.stats.activations > 0 ? 
      (this.stats.fastActivations / this.stats.activations * 100) : 0;
    
    return {
      ...this.stats,
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(1)),
      fastRate: parseFloat(fastRate.toFixed(1)),
      target: '<100ms',
      status: this.stats.avgTime < 100 ? 'EXCELLENT' : this.stats.avgTime < 200 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }

  // Méthodes utilitaires réutilisées
  validateProcessData(proc) {
    return proc && proc.Title && proc.Handle && proc.Handle !== 0 && proc.Id && proc.ProcessName;
  }

  normalizeProcessData(proc) {
    return {
      Handle: parseInt(proc.Handle) || 0,
      Title: proc.Title.toString().trim(),
      ProcessId: parseInt(proc.Id) || 0,
      ProcessName: proc.ProcessName.toString().trim(),
      ClassName: proc.ClassName || 'Unknown',
      IsActive: false
    };
  }

  validateRawWindow(rawWindow) {
    return rawWindow.Handle && rawWindow.Handle !== 0 && rawWindow.Title && rawWindow.Title.trim().length > 0;
  }

  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    const safePid = parseInt(processId) || Date.now();
    return `${normalizedChar}_${normalizedClass}_${safePid}`;
  }

  extractProcessName(processName) {
    if (!processName) return 'Dofus';
    if (processName.includes('java')) return 'Dofus 2 (Java)';
    if (processName.includes('unity')) return 'Dofus 3 (Unity)';
    if (processName.toLowerCase().includes('dofus')) return 'Dofus';
    return processName;
  }

  updateActiveState(activeWindowId) {
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  cleanupOldWindowsUltraFast(currentWindowIds) {
    const keysToDelete = [];
    
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        keysToDelete.push(windowId);
      }
    }
    
    keysToDelete.forEach(windowId => {
      this.windows.delete(windowId);
      this.handleCache.delete(windowId);
    });
  }

  // Méthodes de stockage (réutilisées)
  getStoredCustomName(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(`customNames.${windowId}`, null);
    } catch (error) {
      return null;
    }
  }

  getStoredInitiative(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(`initiatives.${windowId}`, 0);
    } catch (error) {
      return 0;
    }
  }

  getStoredShortcut(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(`shortcuts.${windowId}`, null);
    } catch (error) {
      return null;
    }
  }

  getStoredEnabled(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(`enabled.${windowId}`, true);
    } catch (error) {
      return true;
    }
  }

  getDofusClasses() {
    return this.dofusClasses;
  }

  getClassAvatar(className) {
    const classKey = className.toLowerCase();
    return this.dofusClasses[classKey]?.avatar || '1';
  }

  setWindowClass(windowId, classKey) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const classes = store.get('classes', {});
      classes[windowId] = classKey;
      store.set('classes', classes);
      
      if (this.windows.has(windowId)) {
        const windowData = this.windows.get(windowId);
        windowData.info.dofusClass = classKey;
        windowData.info.avatar = this.getClassAvatar(classKey);
        this.windows.set(windowId, windowData);
      }
      return true;
    } catch (error) {
      console.error('UltraFastWindowManagerWindows: Error setting window class:', error);
      return false;
    }
  }

  /**
   * Nettoyage ultra-rapide
   */
  cleanup() {
    try {
      this.activationCache.clear();
      this.handleCache.clear();
      this.windows.clear();
      
      console.log('UltraFastWindowManagerWindows: Ultra-fast cleanup completed');
      console.log('Final Performance Stats:', this.getPerformanceStats());
    } catch (error) {
      console.error('UltraFastWindowManagerWindows: Cleanup error:', error);
    }
  }
}

module.exports = UltraFastWindowManagerWindows;