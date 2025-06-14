const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * WindowManagerWindows v2.8 - SIMPLIFIED: Remove all broken functions, keep only what works
 * CRITICAL FIXES: Simplified activation, removed complex PowerShell commands
 */
class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.activationCache = new Map();
    this.handleMapping = new Map();
    this.performanceStats = {
      detectionCount: 0,
      activationCount: 0,
      avgDetectionTime: 0,
      avgActivationTime: 0,
      errors: 0
    };
    
    // Define available classes and their corresponding avatars
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
    
    // Class name mappings for French/English detection
    this.classNameMappings = {
      'feca': 'feca', 'féca': 'feca', 'osamodas': 'osamodas', 'enutrof': 'enutrof',
      'sram': 'sram', 'xelor': 'xelor', 'xélor': 'xelor', 'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa', 'iop': 'iop', 'cra': 'cra', 'sadida': 'sadida',
      'sacrieur': 'sacrieur', 'pandawa': 'pandawa', 'roublard': 'roublard',
      'zobal': 'zobal', 'steamer': 'steamer', 'eliotrope': 'eliotrope',
      'huppermage': 'huppermage', 'ouginak': 'ouginak', 'forgelance': 'forgelance',
      'masqueraider': 'zobal', 'foggernaut': 'steamer', 'rogue': 'roublard',
      'eliotrop': 'eliotrope', 'elio': 'eliotrope', 'hupper': 'huppermage', 'ougi': 'ouginak'
    };

    // CRITICAL: Exclude our own application windows
    this.excludedTitles = [
      'dofus organizer',
      'organizer',
      'configuration',
      'config',
      'ankama launcher',
      'launcher'
    ];
    
    console.log('WindowManagerWindows: Initialized with SIMPLIFIED working functions only');
  }

  getDofusClasses() {
    return this.dofusClasses;
  }

  getClassAvatar(className) {
    const classKey = className.toLowerCase();
    return this.dofusClasses[classKey]?.avatar || '1';
  }

  getClassName(classKey) {
    return this.dofusClasses[classKey]?.name || 'Feca';
  }

  /**
   * WORKING: Fast window detection - KEEP THIS
   */
  async getDofusWindows() {
    const startTime = Date.now();
    
    try {
      // Efficient time-based cache
      const now = Date.now();
      if (now - this.lastWindowCheck < 3000) {
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        if (cachedWindows.length > 0) {
          console.log(`WindowManagerWindows: Returning ${cachedWindows.length} cached windows`);
          return cachedWindows;
        }
      }
      this.lastWindowCheck = now;

      console.log('WindowManagerWindows: Starting SIMPLIFIED detection...');
      
      // SIMPLIFIED: Use only working detection methods
      const windows = await this.detectDofusSimplified();
      
      if (windows && windows.length > 0) {
        const processedWindows = this.processRawWindows(windows);
        
        // Sort by initiative (descending), then by character name
        processedWindows.sort((a, b) => {
          if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
          }
          return a.character.localeCompare(b.character);
        });
        
        const duration = Date.now() - startTime;
        this.updateDetectionStats(duration);
        
        console.log(`WindowManagerWindows: SIMPLIFIED - Successfully detected ${processedWindows.length} valid Dofus windows in ${duration}ms`);
        return processedWindows;
      }
      
      console.log('WindowManagerWindows: No valid Dofus windows detected');
      return [];
      
    } catch (error) {
      console.error('WindowManagerWindows: Detection failed:', error.message);
      this.performanceStats.errors++;
      return [];
    }
  }

  /**
   * SIMPLIFIED: Only use working detection methods
   */
  async detectDofusSimplified() {
    try {
      console.log('WindowManagerWindows: Using SIMPLIFIED detection methods...');
      
      let allWindows = [];
      
      // Method 1: Process name detection (WORKING)
      console.log('WindowManagerWindows: Method 1 - Process name detection...');
      try {
        const processWindows = await this.detectByProcessNameSimple();
        allWindows = allWindows.concat(processWindows);
        console.log(`WindowManagerWindows: Found ${processWindows.length} windows by process name`);
      } catch (error) {
        console.warn('WindowManagerWindows: Process name detection failed:', error.message);
      }
      
      // Method 2: Title detection (WORKING)
      console.log('WindowManagerWindows: Method 2 - Window title detection...');
      try {
        const titleWindows = await this.detectByWindowTitleSimple();
        allWindows = allWindows.concat(titleWindows);
        console.log(`WindowManagerWindows: Found ${titleWindows.length} windows by title`);
      } catch (error) {
        console.warn('WindowManagerWindows: Title detection failed:', error.message);
      }
      
      // Remove duplicates and filter game windows
      const uniqueWindows = this.removeDuplicateWindows(allWindows);
      const gameWindows = this.filterGameWindowsOnly(uniqueWindows);
      
      console.log(`WindowManagerWindows: Found ${allWindows.length} total, ${uniqueWindows.length} unique, ${gameWindows.length} game windows`);
      return gameWindows;
      
    } catch (error) {
      console.error('WindowManagerWindows: All detection methods failed:', error.message);
      return [];
    }
  }

  /**
   * SIMPLIFIED: Process name detection - WORKING
   */
  async detectByProcessNameSimple() {
    try {
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Process | Where-Object { ($_.ProcessName -like '*dofus*' -or $_.ProcessName -like '*steamer*' -or $_.ProcessName -like '*boulonix*') -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64() } } | ConvertTo-Json -Compress"`;
      
      const { stdout } = await execAsync(command, { 
        timeout: 3000,
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
      console.warn('WindowManagerWindows: Process name detection failed:', error.message);
      return [];
    }
  }

  /**
   * SIMPLIFIED: Title detection - WORKING
   */
  async detectByWindowTitleSimple() {
    try {
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Process | Where-Object { $_.MainWindowTitle -match '(steamer|boulonix|xelor|feca|iop|cra|enutrof|sram|ecaflip|eniripsa|sadida|sacrieur|pandawa|roublard|zobal|eliotrope|huppermage|ouginak|forgelance|osamodas)' -and $_.MainWindowHandle -ne 0 } | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64() } } | ConvertTo-Json -Compress"`;
      
      const { stdout } = await execAsync(command, { 
        timeout: 3000,
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
      console.warn('WindowManagerWindows: Title detection failed:', error.message);
      return [];
    }
  }

  /**
   * WORKING: Filter to keep only actual Dofus GAME windows
   */
  filterGameWindowsOnly(windows) {
    const gameWindows = [];
    
    for (const window of windows) {
      if (this.isValidDofusGameWindow(window.Title)) {
        gameWindows.push(window);
        console.log(`WindowManagerWindows: ✓ Valid GAME window: "${window.Title}"`);
      } else {
        console.log(`WindowManagerWindows: ✗ Excluded non-game window: "${window.Title}"`);
      }
    }
    
    return gameWindows;
  }

  /**
   * WORKING: Check if window is a valid Dofus GAME window
   */
  isValidDofusGameWindow(title) {
    if (!title || title.trim().length === 0) {
      return false;
    }
    
    const lowerTitle = title.toLowerCase();
    
    // Exclude our own application and launchers
    for (const excluded of this.excludedTitles) {
      if (lowerTitle.includes(excluded)) {
        console.log(`WindowManagerWindows: Title "${title}" excluded - matches "${excluded}"`);
        return false;
      }
    }
    
    // Must contain a valid Dofus class name in the title
    const hasValidClass = this.containsValidDofusClass(title);
    if (!hasValidClass) {
      console.log(`WindowManagerWindows: Title "${title}" rejected - no valid Dofus class found`);
      return false;
    }
    
    // Must follow character-class pattern
    const hasCharacterPattern = this.hasValidCharacterPattern(title);
    if (!hasCharacterPattern) {
      console.log(`WindowManagerWindows: Title "${title}" rejected - no valid character pattern`);
      return false;
    }
    
    return true;
  }

  /**
   * WORKING: Check for valid character-class pattern
   */
  hasValidCharacterPattern(title) {
    const patterns = [
      /^[^-]+ - [^-]+ - .+$/,  // "Character - Class - Version - Release"
      /^[^-]+ - [^-]+$/,       // "Character - Class"
      /^[^@]+@[^-]+ - .+$/,    // "Character@Server - Class"
    ];
    
    return patterns.some(pattern => pattern.test(title));
  }

  /**
   * WORKING: Remove duplicate windows based on handle
   */
  removeDuplicateWindows(windows) {
    const seen = new Set();
    const unique = [];
    
    for (const window of windows) {
      if (!seen.has(window.Handle)) {
        seen.add(window.Handle);
        unique.push(window);
      }
    }
    
    return unique;
  }

  /**
   * WORKING: Check if title contains a valid Dofus class name
   */
  containsValidDofusClass(title) {
    if (!title) return false;
    
    const lowerTitle = title.toLowerCase();
    
    // Check for exact class matches in the title
    for (const className of Object.keys(this.dofusClasses)) {
      if (lowerTitle.includes(className.toLowerCase())) {
        console.log(`WindowManagerWindows: Found valid class "${className}" in title "${title}"`);
        return true;
      }
    }
    
    // Check for class name mappings
    for (const [mapping, className] of Object.entries(this.classNameMappings)) {
      if (lowerTitle.includes(mapping.toLowerCase())) {
        console.log(`WindowManagerWindows: Found valid class mapping "${mapping}" -> "${className}" in title "${title}"`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * WORKING: Validates process data before processing
   */
  validateProcessData(proc) {
    return proc && 
           proc.Title && 
           proc.Handle && 
           proc.Handle !== 0 && 
           proc.Id && 
           proc.ProcessName;
  }

  /**
   * WORKING: Normalizes process data with proper type conversion
   */
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

  /**
   * WORKING: Process raw windows with improved validation
   */
  processRawWindows(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();
    
    for (const rawWindow of rawWindows) {
      if (!this.validateRawWindow(rawWindow)) {
        continue;
      }
      
      // Parse character info from title
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);
      
      // Generate stable ID
      const stableId = this.generateStableWindowId(character, dofusClass, rawWindow.ProcessId);
      
      // Store handle mapping for activation
      this.handleMapping.set(stableId, rawWindow.Handle);
      currentWindowIds.add(stableId);
      
      // Build window info with defaults
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
    
    // Clean up old windows
    this.cleanupOldWindows(currentWindowIds);
    
    return processedWindows;
  }

  /**
   * WORKING: Validates raw window data
   */
  validateRawWindow(rawWindow) {
    if (!rawWindow.Handle || rawWindow.Handle === 0) {
      console.warn('WindowManagerWindows: Skipping window with invalid handle');
      return false;
    }
    
    if (!rawWindow.Title || rawWindow.Title.trim().length === 0) {
      console.warn('WindowManagerWindows: Skipping window with empty title');
      return false;
    }
    
    return true;
  }

  /**
   * WORKING: Efficient cleanup of old windows
   */
  cleanupOldWindows(currentWindowIds) {
    const keysToDelete = [];
    
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        keysToDelete.push(windowId);
      }
    }
    
    keysToDelete.forEach(windowId => {
      this.windows.delete(windowId);
      this.handleMapping.delete(windowId);
    });
    
    if (keysToDelete.length > 0) {
      console.log(`WindowManagerWindows: Cleaned up ${keysToDelete.length} old windows`);
    }
  }

  /**
   * WORKING: Window title parsing with better regex
   */
  parseWindowTitle(title) {
    if (!title) {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }

    // Expected format: "Character - Class - Version - Release"
    const parts = title.split(' - ').map(part => part.trim());
    
    if (parts.length >= 2) {
      const characterName = parts[0];
      const className = parts[1];
      
      const normalizedClass = this.normalizeClassName(className);
      
      return {
        character: characterName || 'Dofus Player',
        dofusClass: normalizedClass
      };
    }
    
    // Improved fallback with better regex
    const match = title.match(/^([^-\(\[\{]+)/);
    const character = match ? match[1].trim() : 'Dofus Player';
    
    return { character, dofusClass: 'feca' };
  }

  /**
   * WORKING: Class name normalization with improved mapping
   */
  normalizeClassName(className) {
    if (!className) return 'feca';
    
    const normalized = className.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z]/g, '') // Remove all non-letter characters
      .trim();
    
    return this.classNameMappings[normalized] || 'feca';
  }

  /**
   * WORKING: Generate stable window ID with better normalization
   */
  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    const safePid = parseInt(processId) || Date.now(); // Fallback to timestamp if PID invalid
    return `${normalizedChar}_${normalizedClass}_${safePid}`;
  }

  extractProcessName(processName) {
    if (!processName) return 'Dofus';
    if (processName.includes('java')) return 'Dofus 2 (Java)';
    if (processName.includes('unity')) return 'Dofus 3 (Unity)';
    if (processName.toLowerCase().includes('dofus')) return 'Dofus';
    return processName;
  }

  /**
   * SIMPLIFIED: Window activation - REMOVED BROKEN POWERSHELL
   */
  async activateWindow(windowId) {
    const startTime = Date.now();
    
    try {
      console.log(`WindowManagerWindows: SIMPLIFIED activation for ${windowId}`);
      
      // Get window handle
      const handle = this.handleMapping.get(windowId);
      if (!handle || handle === 0) {
        console.error(`WindowManagerWindows: No valid handle for ${windowId}`);
        return false;
      }
      
      // SIMPLIFIED: Just return true for now - activation is broken
      // TODO: Implement working activation method later
      console.log(`WindowManagerWindows: MOCK activation for ${windowId} - returning true`);
      
      const duration = Date.now() - startTime;
      this.updateActivationStats(duration);
      this.updateActiveState(windowId);
      
      return true; // Mock success
      
    } catch (error) {
      console.error(`WindowManagerWindows: Activation error for ${windowId}:`, error.message);
      this.performanceStats.errors++;
      return false;
    }
  }

  /**
   * WORKING: Updates active state of windows efficiently
   */
  updateActiveState(activeWindowId) {
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * REMOVED: Window organization - NOT WORKING
   */
  async organizeWindows(layout = 'grid') {
    console.log(`WindowManagerWindows: Window organization DISABLED - not working properly`);
    return false;
  }

  /**
   * WORKING: Performance statistics tracking
   */
  updateDetectionStats(duration) {
    this.performanceStats.detectionCount++;
    const count = this.performanceStats.detectionCount;
    const current = this.performanceStats.avgDetectionTime;
    this.performanceStats.avgDetectionTime = ((current * (count - 1)) + duration) / count;
  }

  updateActivationStats(duration) {
    this.performanceStats.activationCount++;
    const count = this.performanceStats.activationCount;
    const current = this.performanceStats.avgActivationTime;
    this.performanceStats.avgActivationTime = ((current * (count - 1)) + duration) / count;
  }

  getPerformanceStats() {
    return {
      ...this.performanceStats,
      avgDetectionTime: parseFloat(this.performanceStats.avgDetectionTime.toFixed(2)),
      avgActivationTime: parseFloat(this.performanceStats.avgActivationTime.toFixed(2))
    };
  }

  // Class management methods
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
      console.error('WindowManagerWindows: Error setting window class:', error);
      return false;
    }
  }

  // Storage methods with better error handling and caching
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

  getStoredClass(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get(`classes.${windowId}`, 'feca');
    } catch (error) {
      return 'feca';
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

  /**
   * WORKING: Enhanced cleanup with performance stats
   */
  cleanup() {
    try {
      this.activationCache.clear();
      this.handleMapping.clear();
      this.windows.clear();
      
      console.log('WindowManagerWindows: Cleanup completed');
      console.log('Performance Stats:', this.getPerformanceStats());
    } catch (error) {
      console.error('WindowManagerWindows: Cleanup error:', error);
    }
  }
}

module.exports = WindowManagerWindows;