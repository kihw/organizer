const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * WindowManagerWindows v2.1 - SIMPLIFIED: Direct PowerShell with reliable window handling
 * MAJOR SIMPLIFICATION: Removed complex script generation and multiple fallbacks
 */
class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.activationCache = new Map();
    this.handleMapping = new Map(); // Simple ID -> Handle mapping
    
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
    
    console.log('WindowManagerWindows: Initialized with SIMPLIFIED direct PowerShell');
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
   * SIMPLIFIED: Direct window detection with single PowerShell method
   */
  async getDofusWindows() {
    try {
      // Simple time-based cache
      const now = Date.now();
      if (now - this.lastWindowCheck < 5000) { // 5 second cache
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        if (cachedWindows.length > 0) {
          console.log(`WindowManagerWindows: Returning ${cachedWindows.length} cached windows`);
          return cachedWindows;
        }
      }
      this.lastWindowCheck = now;

      console.log('WindowManagerWindows: Starting direct PowerShell detection...');
      
      // Single, reliable PowerShell detection method
      const windows = await this.detectWithDirectPowerShell();
      
      if (windows && windows.length > 0) {
        const processedWindows = this.processRawWindows(windows);
        
        // Sort by initiative (descending), then by character name
        processedWindows.sort((a, b) => {
          if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
          }
          return a.character.localeCompare(b.character);
        });
        
        console.log(`WindowManagerWindows: Successfully detected ${processedWindows.length} windows`);
        return processedWindows;
      }
      
      console.log('WindowManagerWindows: No windows detected');
      return [];
      
    } catch (error) {
      console.error('WindowManagerWindows: Detection failed:', error.message);
      return [];
    }
  }

  /**
   * SIMPLIFIED: Single PowerShell detection method that works
   */
  async detectWithDirectPowerShell() {
    try {
      // Direct, working PowerShell command
      const command = [
        'powershell.exe',
        '-NoProfile',
        '-Command',
        `"Get-Process | Where-Object { $_.MainWindowTitle -match 'dofus|steamer|boulonix|ankama' -and $_.MainWindowHandle -ne 0 } | ForEach-Object { @{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64() } } | ConvertTo-Json"`
      ].join(' ');
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 2000,
        encoding: 'utf8'
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell stderr:', stderr.substring(0, 100));
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === 'null') {
        console.log('WindowManagerWindows: PowerShell returned no results');
        return [];
      }
      
      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (parseError) {
        console.error('WindowManagerWindows: JSON parse error:', parseError.message);
        return [];
      }
      
      // Ensure we have an array
      const processes = Array.isArray(result) ? result : [result];
      
      const windows = processes
        .filter(proc => proc && proc.Title && proc.Handle && proc.Handle !== 0)
        .map(proc => ({
          Handle: parseInt(proc.Handle) || 0,
          Title: proc.Title,
          ProcessId: parseInt(proc.Id) || 0,
          ProcessName: proc.ProcessName || 'Unknown',
          ClassName: 'Dofus',
          IsActive: false
        }))
        .filter(window => window.Handle > 0); // Only valid handles
      
      console.log(`WindowManagerWindows: Found ${windows.length} valid Dofus windows`);
      return windows;
      
    } catch (error) {
      console.error('WindowManagerWindows: PowerShell detection failed:', error.message);
      return [];
    }
  }

  /**
   * SIMPLIFIED: Process raw windows with basic validation
   */
  processRawWindows(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();
    
    for (const rawWindow of rawWindows) {
      if (!rawWindow.Handle || rawWindow.Handle === 0) {
        console.warn('WindowManagerWindows: Skipping window with invalid handle');
        continue;
      }
      
      // Parse character info from title
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);
      
      // Generate stable ID
      const stableId = this.generateStableWindowId(character, dofusClass, rawWindow.ProcessId);
      
      // Store handle mapping
      this.handleMapping.set(stableId, rawWindow.Handle);
      currentWindowIds.add(stableId);
      
      // Get stored data or use defaults
      const windowInfo = {
        id: stableId,
        handle: rawWindow.Handle.toString(),
        realHandle: rawWindow.Handle,
        title: rawWindow.Title || 'Unknown Window',
        processName: this.extractProcessName(rawWindow.ProcessName),
        className: rawWindow.ClassName || 'Unknown',
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
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        this.windows.delete(windowId);
        this.handleMapping.delete(windowId);
      }
    }
    
    return processedWindows;
  }

  /**
   * SIMPLIFIED: Window title parsing
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
    
    // Simple fallback
    const match = title.match(/^([^-\(]+)/);
    const character = match ? match[1].trim() : 'Dofus Player';
    
    return { character, dofusClass: 'feca' };
  }

  /**
   * SIMPLIFIED: Class name normalization
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
      .trim();
    
    return this.classNameMappings[normalized] || 'feca';
  }

  /**
   * SIMPLIFIED: Generate stable window ID
   */
  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${processId}`;
  }

  extractProcessName(processName) {
    if (!processName) return 'Dofus';
    if (processName.includes('java')) return 'Dofus 2 (Java)';
    return 'Dofus';
  }

  /**
   * SIMPLIFIED: Direct window activation with single PowerShell method
   */
  async activateWindow(windowId) {
    try {
      console.log(`WindowManagerWindows: Activating window ${windowId}`);
      
      // Get window handle
      const handle = this.handleMapping.get(windowId);
      if (!handle || handle === 0) {
        console.error(`WindowManagerWindows: No valid handle for ${windowId}`);
        return false;
      }
      
      // Check activation cache
      const cacheKey = handle.toString();
      const now = Date.now();
      
      if (this.activationCache.has(cacheKey)) {
        const lastActivation = this.activationCache.get(cacheKey);
        if (now - lastActivation < 500) { // 500ms cooldown
          console.log(`WindowManagerWindows: Recent activation cached for ${windowId}`);
          return true;
        }
      }
      
      // Direct PowerShell activation - CORRECTED syntax
      const command = [
        'powershell.exe',
        '-NoProfile',
        '-Command',
        `"Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);' -Name Win32 -Namespace User32; [User32.Win32]::SetForegroundWindow([IntPtr]${handle})"`
      ].join(' ');
      
      const { stdout } = await execAsync(command, { 
        timeout: 1000,
        encoding: 'utf8'
      });
      
      const success = stdout && stdout.trim() === 'True';
      
      if (success) {
        this.activationCache.set(cacheKey, now);
        this.updateActiveState(windowId);
        console.log(`WindowManagerWindows: Successfully activated ${windowId}`);
        return true;
      } else {
        console.warn(`WindowManagerWindows: Activation failed for ${windowId} - output: ${stdout}`);
        return false;
      }
      
    } catch (error) {
      console.error(`WindowManagerWindows: Activation error for ${windowId}:`, error.message);
      return false;
    }
  }

  /**
   * Updates active state of windows
   */
  updateActiveState(activeWindowId) {
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * SIMPLIFIED: Window organization
   */
  async organizeWindows(layout = 'grid') {
    const enabledWindows = Array.from(this.windows.values())
      .filter(w => w.info.enabled)
      .sort((a, b) => b.info.initiative - a.info.initiative);
    
    if (enabledWindows.length === 0) {
      console.log('WindowManagerWindows: No enabled windows to organize');
      return false;
    }

    try {
      console.log(`WindowManagerWindows: Organizing ${enabledWindows.length} windows in ${layout} layout`);
      
      // Simple screen dimensions
      const screenWidth = 1920;
      const screenHeight = 1080;
      
      switch (layout) {
        case 'grid':
          await this.arrangeInGrid(enabledWindows, screenWidth, screenHeight);
          break;
        case 'horizontal':
          await this.arrangeHorizontally(enabledWindows, screenWidth, screenHeight);
          break;
        case 'vertical':
          await this.arrangeVertically(enabledWindows, screenWidth, screenHeight);
          break;
        default:
          await this.arrangeInGrid(enabledWindows, screenWidth, screenHeight);
      }
      
      return true;
    } catch (error) {
      console.error('WindowManagerWindows: Organization failed:', error.message);
      return false;
    }
  }

  async arrangeInGrid(windows, screenWidth, screenHeight) {
    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const windowWidth = Math.floor(screenWidth / cols);
    const windowHeight = Math.floor(screenHeight / rows);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = col * windowWidth;
      const y = row * windowHeight;
      
      await this.moveWindow(windowData.info.id, x, y, windowWidth - 10, windowHeight - 50);
    }
  }

  async arrangeHorizontally(windows, screenWidth, screenHeight) {
    const windowWidth = Math.floor(screenWidth / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const x = i * windowWidth;
      await this.moveWindow(windowData.info.id, x, 0, windowWidth - 10, screenHeight - 50);
    }
  }

  async arrangeVertically(windows, screenWidth, screenHeight) {
    const windowHeight = Math.floor(screenHeight / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const y = i * windowHeight;
      await this.moveWindow(windowData.info.id, 0, y, screenWidth - 10, windowHeight - 10);
    }
  }

  /**
   * SIMPLIFIED: Window movement
   */
  async moveWindow(windowId, x, y, width = -1, height = -1) {
    try {
      const handle = this.handleMapping.get(windowId);
      if (!handle || handle === 0) {
        console.warn(`WindowManagerWindows: No handle for window ${windowId}`);
        return false;
      }
      
      const command = [
        'powershell.exe',
        '-NoProfile',
        '-Command',
        `"Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")]public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);' -Name Win32Move -Namespace User32; [User32.Win32Move]::SetWindowPos([IntPtr]${handle}, [IntPtr]0, ${x}, ${y}, ${width}, ${height}, 0x0040)"`
      ].join(' ');
      
      const { stdout } = await execAsync(command, { timeout: 500 });
      return stdout && stdout.trim() === 'True';
    } catch (error) {
      console.warn('WindowManagerWindows: Move operation failed:', error.message);
      return false;
    }
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

  // Storage methods with error handling
  getStoredCustomName(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const customNames = store.get('customNames', {});
      return customNames[windowId] || null;
    } catch (error) {
      return null;
    }
  }

  getStoredInitiative(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const initiatives = store.get('initiatives', {});
      return initiatives[windowId] || 0;
    } catch (error) {
      return 0;
    }
  }

  getStoredClass(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const classes = store.get('classes', {});
      return classes[windowId] || 'feca';
    } catch (error) {
      return 'feca';
    }
  }

  getStoredShortcut(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const shortcuts = store.get('shortcuts', {});
      return shortcuts[windowId] || null;
    } catch (error) {
      return null;
    }
  }

  getStoredEnabled(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const enabled = store.get('enabled', {});
      return enabled[windowId] !== false;
    } catch (error) {
      return true;
    }
  }

  /**
   * SIMPLIFIED: Cleanup
   */
  cleanup() {
    try {
      this.activationCache.clear();
      this.handleMapping.clear();
      this.windows.clear();
      console.log('WindowManagerWindows: Cleanup completed');
    } catch (error) {
      console.error('WindowManagerWindows: Cleanup error:', error);
    }
  }
}

module.exports = WindowManagerWindows;