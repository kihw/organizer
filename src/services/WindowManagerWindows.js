const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * WindowManagerWindows v2.4 - ENHANCED: Multiple detection methods with strict title validation
 * CRITICAL FIXES: Proper Dofus detection patterns with title requirements validation
 * NEW FIX: Window activation without resizing + strict title filtering
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

    // NOUVEAU: Patterns de validation des titres requis
    this.titleValidationPatterns = [
      // Format standard: "Personnage - Classe - Version - Release"
      /^[^-]+ - [^-]+ - [^-]+ - [^-]+$/,
      
      // Format avec parenthèses: "Personnage (Classe) - Version"
      /^[^(]+ \([^)]+\) - .+$/,
      
      // Format simple: "Personnage - Classe"
      /^[^-]+ - [^-]+$/,
      
      // Format Dofus avec serveur: "Personnage@Serveur - Classe"
      /^[^@]+@[^-]+ - .+$/,
      
      // Format avec niveau: "Personnage [Niveau] - Classe"
      /^[^\[]+ \[\d+\] - .+$/
    ];

    // NOUVEAU: Mots-clés requis dans le titre pour validation
    this.requiredTitleKeywords = [
      'dofus', 'steamer', 'boulonix', 'ankama', 'unity', 'retro'
    ];
    
    console.log('WindowManagerWindows: Initialized with ENHANCED detection and title validation');
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
   * ENHANCED: Fast window detection with multiple methods and strict validation
   */
  async getDofusWindows() {
    const startTime = Date.now();
    
    try {
      // Efficient time-based cache - reduced to 3 seconds for better responsiveness
      const now = Date.now();
      if (now - this.lastWindowCheck < 3000) {
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        if (cachedWindows.length > 0) {
          console.log(`WindowManagerWindows: Returning ${cachedWindows.length} cached windows`);
          return cachedWindows;
        }
      }
      this.lastWindowCheck = now;

      console.log('WindowManagerWindows: Starting enhanced Dofus detection with title validation...');
      
      // ENHANCED: Use multiple detection methods with title validation
      const windows = await this.detectDofusWithStrictValidation();
      
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
        
        console.log(`WindowManagerWindows: Successfully detected ${processedWindows.length} valid Dofus windows in ${duration}ms`);
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
   * ENHANCED: Multiple detection methods with strict title validation
   */
  async detectDofusWithStrictValidation() {
    try {
      console.log('WindowManagerWindows: Using multiple detection methods with title validation...');
      
      let allWindows = [];
      
      // Method 1: Detect by executable name pattern (most reliable)
      console.log('WindowManagerWindows: Method 1 - Executable name pattern...');
      const executableWindows = await this.detectByExecutableName();
      allWindows = allWindows.concat(executableWindows);
      
      // Method 2: Detect by window class (UnityWndClass for Dofus 3)
      console.log('WindowManagerWindows: Method 2 - Window class (UnityWndClass)...');
      const classWindows = await this.detectByWindowClass();
      allWindows = allWindows.concat(classWindows);
      
      // Method 3: Detect by process name
      console.log('WindowManagerWindows: Method 3 - Process name...');
      const processWindows = await this.detectByProcessName();
      allWindows = allWindows.concat(processWindows);
      
      // Method 4: Fallback - detect any window with Dofus-like title
      console.log('WindowManagerWindows: Method 4 - Window title fallback...');
      const titleWindows = await this.detectByWindowTitle();
      allWindows = allWindows.concat(titleWindows);
      
      // Remove duplicates based on handle
      const uniqueWindows = this.removeDuplicateWindows(allWindows);
      
      // CRITICAL: Apply strict title validation
      const validatedWindows = this.validateWindowTitles(uniqueWindows);
      
      console.log(`WindowManagerWindows: Found ${allWindows.length} total, ${uniqueWindows.length} unique, ${validatedWindows.length} validated windows`);
      return validatedWindows;
      
    } catch (error) {
      console.error('WindowManagerWindows: All detection methods failed:', error.message);
      return [];
    }
  }

  /**
   * NEW: Remove duplicate windows based on handle
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
   * CRITICAL: Validate window titles against required patterns
   */
  validateWindowTitles(windows) {
    const validatedWindows = [];
    
    for (const window of windows) {
      if (this.isValidDofusTitle(window.Title)) {
        validatedWindows.push(window);
        console.log(`WindowManagerWindows: ✓ Valid title: "${window.Title}"`);
      } else {
        console.log(`WindowManagerWindows: ✗ Invalid title (rejected): "${window.Title}"`);
      }
    }
    
    return validatedWindows;
  }

  /**
   * NEW: Check if window title meets Dofus requirements
   */
  isValidDofusTitle(title) {
    if (!title || title.trim().length === 0) {
      return false;
    }
    
    const lowerTitle = title.toLowerCase();
    
    // Check 1: Must contain at least one required keyword
    const hasRequiredKeyword = this.requiredTitleKeywords.some(keyword => 
      lowerTitle.includes(keyword)
    );
    
    if (!hasRequiredKeyword) {
      console.log(`WindowManagerWindows: Title "${title}" rejected - no required keywords`);
      return false;
    }
    
    // Check 2: Must match at least one title pattern OR contain character info
    const matchesPattern = this.titleValidationPatterns.some(pattern => 
      pattern.test(title)
    );
    
    const hasCharacterInfo = this.hasCharacterInfo(title);
    
    if (!matchesPattern && !hasCharacterInfo) {
      console.log(`WindowManagerWindows: Title "${title}" rejected - no valid pattern or character info`);
      return false;
    }
    
    // Check 3: Must not be a generic window title
    const genericTitles = [
      'dofus', 'steamer', 'boulonix', 'ankama launcher', 'unity', 'loading'
    ];
    
    const isGeneric = genericTitles.some(generic => 
      lowerTitle === generic || lowerTitle === generic + '.exe'
    );
    
    if (isGeneric) {
      console.log(`WindowManagerWindows: Title "${title}" rejected - too generic`);
      return false;
    }
    
    return true;
  }

  /**
   * NEW: Check if title contains character information
   */
  hasCharacterInfo(title) {
    // Look for character-class patterns
    const characterPatterns = [
      /-\s*\w+\s*-/, // "Character - Class - ..."
      /\(\w+\)/, // "Character (Class)"
      /@\w+/, // "Character@Server"
      /\[\d+\]/, // "Character [Level]"
    ];
    
    return characterPatterns.some(pattern => pattern.test(title));
  }

  /**
   * ENHANCED: Detect by executable name pattern (^(?i)dofus[^\.]*\.exe$)
   */
  async detectByExecutableName() {
    try {
      // CORRECTED: PowerShell command to find processes with Dofus executable pattern
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Get-Process | Where-Object { $_.ProcessName -match '^dofus' -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64(); Path = try { $_.Path } catch { 'Unknown' } } } | ConvertTo-Json -Compress } catch { Write-Output '[]' }"`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Executable detection stderr:', stderr.substring(0, 100));
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: No processes found by executable name');
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      const windows = processes
        .filter(proc => this.validateProcessData(proc))
        .map(proc => this.normalizeProcessData(proc));
      
      console.log(`WindowManagerWindows: Found ${windows.length} windows by executable name`);
      return windows;
      
    } catch (error) {
      console.warn('WindowManagerWindows: Executable name detection failed:', error.message);
      return [];
    }
  }

  /**
   * ENHANCED: Detect by window class (UnityWndClass)
   */
  async detectByWindowClass() {
    try {
      // PowerShell command to find windows with UnityWndClass
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class Win32Class { [DllImport(\\"user32.dll\\", SetLastError = true, CharSet = CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount); [DllImport(\\"user32.dll\\")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam); [DllImport(\\"user32.dll\\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); [DllImport(\\"user32.dll\\")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount); public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); }'; $windows = @(); [Win32Class]::EnumWindows({ param($hwnd, $lParam) $className = New-Object System.Text.StringBuilder 256; [Win32Class]::GetClassName($hwnd, $className, $className.Capacity); if ($className.ToString() -eq 'UnityWndClass') { $title = New-Object System.Text.StringBuilder 256; [Win32Class]::GetWindowText($hwnd, $title, $title.Capacity); $processId = 0; [Win32Class]::GetWindowThreadProcessId($hwnd, [ref]$processId); if ($title.Length -gt 0 -and $processId -gt 0) { try { $process = Get-Process -Id $processId -ErrorAction Stop; $script:windows += [PSCustomObject]@{ Id = $processId; ProcessName = $process.ProcessName; Title = $title.ToString(); Handle = $hwnd.ToInt64(); ClassName = $className.ToString() } } catch {} } } return $true }, [IntPtr]::Zero); $windows | ConvertTo-Json -Compress } catch { Write-Output '[]' }"`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 3000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Window class detection stderr:', stderr.substring(0, 100));
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: No UnityWndClass windows found');
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      const windows = processes
        .filter(proc => this.validateProcessData(proc))
        .map(proc => this.normalizeProcessData(proc));
      
      console.log(`WindowManagerWindows: Found ${windows.length} UnityWndClass windows`);
      return windows;
      
    } catch (error) {
      console.warn('WindowManagerWindows: Window class detection failed:', error.message);
      return [];
    }
  }

  /**
   * ENHANCED: Detect by process name
   */
  async detectByProcessName() {
    try {
      // Look for common Dofus process names
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Get-Process | Where-Object { ($_.ProcessName -like '*dofus*' -or $_.ProcessName -like '*steamer*' -or $_.ProcessName -like '*boulonix*' -or $_.ProcessName -like '*ankama*') -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64() } } | ConvertTo-Json -Compress } catch { Write-Output '[]' }"`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Process name detection stderr:', stderr.substring(0, 100));
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: No processes found by name');
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      const windows = processes
        .filter(proc => this.validateProcessData(proc))
        .map(proc => this.normalizeProcessData(proc));
      
      console.log(`WindowManagerWindows: Found ${windows.length} windows by process name`);
      return windows;
      
    } catch (error) {
      console.warn('WindowManagerWindows: Process name detection failed:', error.message);
      return [];
    }
  }

  /**
   * ENHANCED: Fallback detection by window title
   */
  async detectByWindowTitle() {
    try {
      // Look for windows with Dofus-like titles
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Get-Process | Where-Object { $_.MainWindowTitle -match '(dofus|steamer|boulonix|ankama)' -and $_.MainWindowHandle -ne 0 } | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; Title = $_.MainWindowTitle; Handle = $_.MainWindowHandle.ToInt64() } } | ConvertTo-Json -Compress } catch { Write-Output '[]' }"`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Title detection stderr:', stderr.substring(0, 100));
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: No windows found by title');
        return [];
      }
      
      const result = JSON.parse(stdout.trim());
      const processes = Array.isArray(result) ? result : [result];
      
      const windows = processes
        .filter(proc => this.validateProcessData(proc))
        .map(proc => this.normalizeProcessData(proc));
      
      console.log(`WindowManagerWindows: Found ${windows.length} windows by title`);
      return windows;
      
    } catch (error) {
      console.warn('WindowManagerWindows: Title detection failed:', error.message);
      return [];
    }
  }

  /**
   * ENHANCED: Validates process data before processing
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
   * ENHANCED: Normalizes process data with proper type conversion
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
   * OPTIMIZED: Process raw windows with improved validation
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
      
      // Store handle mapping for fast activation
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
   * ENHANCED: Validates raw window data
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
   * ENHANCED: Efficient cleanup of old windows
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
   * OPTIMIZED: Window title parsing with better regex
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
   * OPTIMIZED: Class name normalization with improved mapping
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
   * OPTIMIZED: Generate stable window ID with better normalization
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
   * FIXED: Window activation WITHOUT resizing - only brings window to front
   */
  async activateWindow(windowId) {
    const startTime = Date.now();
    
    try {
      console.log(`WindowManagerWindows: Activating window ${windowId} (NO RESIZE)`);
      
      // Get window handle with validation
      const handle = this.handleMapping.get(windowId);
      if (!handle || handle === 0) {
        console.error(`WindowManagerWindows: No valid handle for ${windowId}`);
        return false;
      }
      
      // Check activation cache for performance
      const cacheKey = handle.toString();
      const now = Date.now();
      
      if (this.activationCache.has(cacheKey)) {
        const lastActivation = this.activationCache.get(cacheKey);
        if (now - lastActivation < 300) { // Reduced cooldown for better responsiveness
          console.log(`WindowManagerWindows: Recent activation cached for ${windowId}`);
          return true;
        }
      }
      
      // FIXED: Activation WITHOUT resizing - only SetForegroundWindow and ShowWindow with SW_RESTORE
      const success = await this.executePowerShellActivationNoResize(handle);
      
      const duration = Date.now() - startTime;
      this.updateActivationStats(duration);
      
      if (success) {
        this.activationCache.set(cacheKey, now);
        this.updateActiveState(windowId);
        console.log(`WindowManagerWindows: Successfully activated ${windowId} in ${duration}ms (NO RESIZE)`);
        return true;
      } else {
        console.warn(`WindowManagerWindows: Activation failed for ${windowId}`);
        this.performanceStats.errors++;
        return false;
      }
      
    } catch (error) {
      console.error(`WindowManagerWindows: Activation error for ${windowId}:`, error.message);
      this.performanceStats.errors++;
      return false;
    }
  }

  /**
   * FIXED: PowerShell activation WITHOUT resizing - only brings window to front
   */
  async executePowerShellActivationNoResize(handle) {
    try {
      // FIXED: Only use SetForegroundWindow and ShowWindow with SW_RESTORE (9) to bring to front without resizing
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Activate { [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport(\\"user32.dll\\")] public static extern bool IsIconic(IntPtr hWnd); }'; $handle = [IntPtr]${handle}; $isMinimized = [Win32Activate]::IsIconic($handle); if ($isMinimized) { $result1 = [Win32Activate]::ShowWindow($handle, 9); } else { $result1 = $true; } $result2 = [Win32Activate]::SetForegroundWindow($handle); Write-Output ($result1 -and $result2) } catch { Write-Error $_.Exception.Message; Write-Output 'False' }"`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 800, // Reduced timeout for faster activation
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell activation stderr:', stderr.substring(0, 100));
        return false;
      }
      
      return stdout && stdout.trim().toLowerCase() === 'true';
      
    } catch (error) {
      console.error('WindowManagerWindows: PowerShell activation failed:', error.message);
      return false;
    }
  }

  /**
   * Updates active state of windows efficiently
   */
  updateActiveState(activeWindowId) {
    for (const [windowId, windowData] of this.windows) {
      if (windowData && windowData.info) {
        windowData.info.isActive = windowId === activeWindowId;
      }
    }
  }

  /**
   * OPTIMIZED: Window organization with improved error handling
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
      
      // Get actual screen dimensions
      const { screenWidth, screenHeight } = await this.getScreenDimensions();
      
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

  /**
   * NEW: Get actual screen dimensions
   */
  async getScreenDimensions() {
    try {
      const command = `powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; Write-Output ($screen.Bounds.Width.ToString() + ',' + $screen.Bounds.Height.ToString())"`;
      
      const { stdout } = await execAsync(command, { timeout: 1000 });
      
      if (stdout && stdout.trim()) {
        const [width, height] = stdout.trim().split(',').map(Number);
        if (width > 0 && height > 0) {
          return { screenWidth: width, screenHeight: height };
        }
      }
    } catch (error) {
      console.warn('WindowManagerWindows: Could not get screen dimensions, using defaults');
    }
    
    // Fallback to common resolution
    return { screenWidth: 1920, screenHeight: 1080 };
  }

  async arrangeInGrid(windows, screenWidth, screenHeight) {
    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const windowWidth = Math.floor(screenWidth / cols);
    const windowHeight = Math.floor(screenHeight / rows);
    
    const movePromises = [];
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = col * windowWidth;
      const y = row * windowHeight;
      
      movePromises.push(this.moveWindow(windowData.info.id, x, y, windowWidth - 10, windowHeight - 50));
    }
    
    await Promise.all(movePromises);
  }

  async arrangeHorizontally(windows, screenWidth, screenHeight) {
    const windowWidth = Math.floor(screenWidth / windows.length);
    
    const movePromises = windows.map((windowData, i) => {
      const x = i * windowWidth;
      return this.moveWindow(windowData.info.id, x, 0, windowWidth - 10, screenHeight - 50);
    });
    
    await Promise.all(movePromises);
  }

  async arrangeVertically(windows, screenWidth, screenHeight) {
    const windowHeight = Math.floor(screenHeight / windows.length);
    
    const movePromises = windows.map((windowData, i) => {
      const y = i * windowHeight;
      return this.moveWindow(windowData.info.id, 0, y, screenWidth - 10, windowHeight - 10);
    });
    
    await Promise.all(movePromises);
  }

  /**
   * FIXED: Window movement with corrected PowerShell syntax
   */
  async moveWindow(windowId, x, y, width = -1, height = -1) {
    try {
      const handle = this.handleMapping.get(windowId);
      if (!handle || handle === 0) {
        console.warn(`WindowManagerWindows: No handle for window ${windowId}`);
        return false;
      }
      
      // CORRECTED: Fixed PowerShell syntax for window positioning
      const command = `powershell.exe -NoProfile -Command "try { Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Move { [DllImport(\\"user32.dll\\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags); }'; $result = [Win32Move]::SetWindowPos([IntPtr]${handle}, [IntPtr]0, ${x}, ${y}, ${width}, ${height}, 0x0040); Write-Output $result } catch { Write-Output 'False' }"`;
      
      const { stdout } = await execAsync(command, { timeout: 500 });
      return stdout && stdout.trim().toLowerCase() === 'true';
    } catch (error) {
      console.warn('WindowManagerWindows: Move operation failed:', error.message);
      return false;
    }
  }

  /**
   * NEW: Performance statistics tracking
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

  // OPTIMIZED: Storage methods with better error handling and caching
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
   * OPTIMIZED: Enhanced cleanup with performance stats
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