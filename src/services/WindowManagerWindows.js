const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import du WindowActivator au lieu de la logique native
const { WindowActivator } = require('./WindowActivator');

class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.psScriptPath = null;
    this.psScriptReady = false;
    this.windowIdMapping = new Map(); // Map stable IDs to current window handles

    // AJOUTÉ: Utiliser WindowActivator au lieu de la logique d'activation native
    this.windowActivator = new WindowActivator();

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
      // French names
      'feca': 'feca',
      'féca': 'feca',
      'osamodas': 'osamodas',
      'enutrof': 'enutrof',
      'sram': 'sram',
      'xelor': 'xelor',
      'xélor': 'xelor',
      'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa',
      'iop': 'iop',
      'cra': 'cra',
      'sadida': 'sadida',
      'sacrieur': 'sacrieur',
      'pandawa': 'pandawa',
      'roublard': 'roublard',
      'zobal': 'zobal',
      'steamer': 'steamer',
      'eliotrope': 'eliotrope',
      'huppermage': 'huppermage',
      'ouginak': 'ouginak',
      'forgelance': 'forgelance',

      // English names
      'masqueraider': 'zobal',
      'foggernaut': 'steamer',
      'rogue': 'roublard',

      // Alternative spellings
      'eliotrop': 'eliotrope',
      'elio': 'eliotrope',
      'hupper': 'huppermage',
      'ougi': 'ouginak'
    };

    this.initializePowerShell();
  }

  async initializePowerShell() {
    // SIMPLIFIÉ: Script PowerShell basique sans logique d'activation
    const script = `
# Dofus Organizer Windows Management Script - Detection Only
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;

public class WindowsAPI {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

function Get-DofusWindows {
    $windows = @()
    $dofusProcesses = @()
    
    # Get all Dofus-related processes
    try {
        $dofusProcesses = Get-Process | Where-Object { 
            $_.ProcessName -match "Dofus|dofus|java" -and 
            $_.MainWindowTitle -and 
            $_.MainWindowTitle -notmatch "Organizer|Configuration"
        }
    } catch {
        Write-Warning "Failed to get processes: $_"
    }
    
    $callback = {
        param($hwnd, $lparam)
        
        try {
            if ([WindowsAPI]::IsWindowVisible($hwnd)) {
                $length = [WindowsAPI]::GetWindowTextLength($hwnd)
                if ($length -gt 0) {
                    $builder = New-Object System.Text.StringBuilder($length + 1)
                    [WindowsAPI]::GetWindowText($hwnd, $builder, $builder.Capacity)
                    $title = $builder.ToString()
                    
                    $classBuilder = New-Object System.Text.StringBuilder(256)
                    [WindowsAPI]::GetClassName($hwnd, $classBuilder, $classBuilder.Capacity)
                    $className = $classBuilder.ToString()
                    
                    $processId = 0
                    [WindowsAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId)
                    
                    # Check if this window belongs to a Dofus process
                    $isDofusProcess = $script:dofusProcesses | Where-Object { $_.Id -eq $processId }
                    
                    if ($isDofusProcess) {
                        $rect = New-Object WindowsAPI+RECT
                        [WindowsAPI]::GetWindowRect($hwnd, [ref]$rect)
                        
                        $foregroundWindow = [WindowsAPI]::GetForegroundWindow()
                        $isActive = $hwnd -eq $foregroundWindow
                        
                        # Additional validation - check title contains expected patterns
                        $titleLower = $title.ToLower()
                        if ($titleLower -match "dofus|steamer|boulonix" -and 
                            $titleLower -notmatch "organizer|configuration") {
                            
                            $window = @{
                                Handle = $hwnd.ToInt64()
                                Title = $title
                                ClassName = $className
                                ProcessId = $processId
                                IsActive = $isActive
                                Bounds = @{
                                    X = $rect.Left
                                    Y = $rect.Top
                                    Width = $rect.Right - $rect.Left
                                    Height = $rect.Bottom - $rect.Top
                                }
                            }
                            $script:windows += $window
                        }
                    }
                }
            }
        } catch {
            # Ignore errors for individual windows
        }
        return $true
    }
    
    try {
        $script:windows = @()
        $script:dofusProcesses = $dofusProcesses
        [WindowsAPI]::EnumWindows($callback, [IntPtr]::Zero)
        return $script:windows
    } catch {
        Write-Error "Failed to enumerate windows: $_"
        return @()
    }
}

# SUPPRIMÉ: Toutes les fonctions d'activation (Activate-Window, Move-Window)
# Remplacées par des fonctions factices

function Dummy-ActivateWindow {
    param([int64]$Handle)
    
    Write-Host "Dummy-ActivateWindow called for handle $Handle - no action taken"
    return $true
}

function Dummy-MoveWindow {
    param([int64]$Handle, [int]$X, [int]$Y, [int]$Width = -1, [int]$Height = -1)
    
    Write-Host "Dummy-MoveWindow called for handle $Handle - no action taken"
    return $true
}

# Main command dispatcher
try {
    switch ($args[0]) {
        "get-windows" { 
            $result = Get-DofusWindows
            if ($result.Count -gt 0) {
                $result | ConvertTo-Json -Depth 3
            } else {
                "[]"
            }
        }
        "activate" { 
            $result = Dummy-ActivateWindow -Handle $args[1]
            $result.ToString().ToLower()
        }
        "move" { 
            $result = Dummy-MoveWindow -Handle $args[1] -X $args[2] -Y $args[3] -Width $args[4] -Height $args[5]
            $result.ToString().ToLower()
        }
        default { 
            Write-Host "Usage: script.ps1 [get-windows|activate|move] [args...]" 
        }
    }
} catch {
    Write-Error "Script execution failed: $_"
    exit 1
}
`;

    // Create a temporary PowerShell script file
    const os = require('os');
    const path = require('path');
    const fs = require('fs');

    this.psScriptPath = path.join(os.tmpdir(), 'dofus-organizer-windows-dummy.ps1');

    try {
      fs.writeFileSync(this.psScriptPath, script, 'utf8');
      console.log('WindowManagerWindows: PowerShell script initialized (dummy version)');

      // Test the script to make sure it works
      await this.testPowerShellScript();
    } catch (error) {
      console.error('WindowManagerWindows: Error creating PowerShell script:', error);
      this.psScriptReady = false;
    }
  }

  async testPowerShellScript() {
    try {
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" get-windows`;
      const { stderr } = await execAsync(command, { timeout: 5000 });

      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell test stderr:', stderr);
        this.psScriptReady = false;
      } else {
        console.log('WindowManagerWindows: PowerShell script test successful (dummy version)');
        this.psScriptReady = true;
      }
    } catch (error) {
      console.error('WindowManagerWindows: PowerShell script test failed:', error);
      this.psScriptReady = false;
    }
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

  // Generate stable window ID based on character name and class
  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${processId}`;
  }

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 500) { // Reduced throttle time
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        console.log(`WindowManagerWindows: Returning ${cachedWindows.length} cached windows`);
        return cachedWindows;
      }
      this.lastWindowCheck = now;

      console.log('WindowManagerWindows: Scanning for Dofus windows...');

      let rawWindows = [];

      // Try PowerShell first if available
      if (this.psScriptReady && this.psScriptPath) {
        rawWindows = await this.getWindowsWithPowerShell();
      }

      // If PowerShell failed or returned no results, try alternative method
      if (rawWindows.length === 0) {
        console.log('WindowManagerWindows: PowerShell returned no windows, trying alternative method...');
        rawWindows = await this.getWindowsWithAlternativeMethod();
      }

      const dofusWindows = this.processRawWindows(rawWindows);

      console.log(`WindowManagerWindows: Found ${dofusWindows.length} Dofus windows`);

      // Sort by initiative (descending), then by character name
      dofusWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });

      return dofusWindows;
    } catch (error) {
      console.error('WindowManagerWindows: Error getting Dofus windows:', error);
      return [];
    }
  }

  async getWindowsWithPowerShell() {
    try {
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" get-windows`;
      const { stdout, stderr } = await execAsync(command, { timeout: 8000 });

      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell stderr:', stderr);
      }

      if (stdout && stdout.trim() && stdout.trim() !== '[]') {
        try {
          const windows = JSON.parse(stdout.trim());
          return Array.isArray(windows) ? windows : [windows];
        } catch (parseError) {
          console.error('WindowManagerWindows: Failed to parse PowerShell output:', parseError);
          console.log('WindowManagerWindows: Raw output:', stdout);
        }
      }

      return [];
    } catch (error) {
      console.error('WindowManagerWindows: PowerShell command failed:', error);
      return [];
    }
  }

  async getWindowsWithAlternativeMethod() {
    try {
      console.log('WindowManagerWindows: Using alternative PowerShell method...');

      // Use a simpler PowerShell command to get Dofus windows
      const command = `powershell.exe -Command "Get-Process | Where-Object { $_.MainWindowTitle -and ($_.ProcessName -like '*Dofus*' -or $_.MainWindowTitle -like '*Dofus*' -or $_.MainWindowTitle -like '*Steamer*' -or $_.MainWindowTitle -like '*Boulonix*') } | ForEach-Object { @{ Handle = $_.MainWindowHandle.ToInt64(); Title = $_.MainWindowTitle; ProcessId = $_.Id; ClassName = 'Unknown'; IsActive = $false; Bounds = @{ X = 0; Y = 0; Width = 800; Height = 600 } } } | ConvertTo-Json"`;

      const { stdout, stderr } = await execAsync(command, { timeout: 5000 });

      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Alternative PowerShell stderr:', stderr);
      }

      if (stdout && stdout.trim() && stdout.trim() !== '[]') {
        try {
          const result = JSON.parse(stdout.trim());
          const windows = Array.isArray(result) ? result : [result];

          // Filter out organizer windows
          return windows.filter(window => {
            if (!window.Title) return false;

            const title = window.Title.toLowerCase();

            // Exclude organizer windows
            if (title.includes('organizer') || title.includes('configuration')) {
              return false;
            }

            // Include Dofus-related windows
            return title.includes('dofus') || title.includes('steamer') || title.includes('boulonix') || title.includes('ankama');
          });
        } catch (parseError) {
          console.error('WindowManagerWindows: Failed to parse alternative PowerShell output:', parseError);
          console.log('WindowManagerWindows: Raw output:', stdout);
        }
      }

      return [];
    } catch (error) {
      console.error('WindowManagerWindows: Alternative PowerShell method failed:', error);
      return [];
    }
  }

  processRawWindows(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();

    for (const rawWindow of rawWindows) {
      // Ensure Handle exists and can be converted to string
      if (!rawWindow.Handle) {
        console.warn('WindowManagerWindows: Skipping window with no Handle:', rawWindow);
        continue;
      }

      const windowHandle = rawWindow.Handle.toString();

      // Parse character info from title using the format: Nom - Classe - Version - Release
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);

      // Generate stable ID based on character and class
      const stableId = this.generateStableWindowId(character, dofusClass, rawWindow.ProcessId);

      // Map the stable ID to the current window handle
      this.windowIdMapping.set(stableId, windowHandle);
      currentWindowIds.add(stableId);

      // Get stored class or use detected class
      const storedClass = this.getStoredClass(stableId);
      const finalClass = storedClass !== 'feca' ? storedClass : dofusClass;

      const windowInfo = {
        id: stableId, // Use stable ID instead of window handle
        handle: windowHandle, // Keep the actual handle for activation
        title: rawWindow.Title || 'Unknown Window',
        processName: this.extractProcessName(rawWindow.ClassName),
        className: rawWindow.ClassName || 'Unknown',
        pid: (rawWindow.ProcessId || 0).toString(),
        character: character,
        dofusClass: finalClass,
        customName: this.getStoredCustomName(stableId),
        initiative: this.getStoredInitiative(stableId),
        isActive: rawWindow.IsActive || false,
        bounds: rawWindow.Bounds || { X: 0, Y: 0, Width: 800, Height: 600 },
        avatar: this.getClassAvatar(finalClass),
        shortcut: this.getStoredShortcut(stableId),
        enabled: this.getStoredEnabled(stableId)
      };

      processedWindows.push(windowInfo);
      this.windows.set(stableId, { info: windowInfo });
    }

    // Remove windows that no longer exist
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        this.windows.delete(windowId);
        this.windowIdMapping.delete(windowId);
      }
    }

    return processedWindows;
  }

  parseWindowTitle(title) {
    if (!title) {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }

    console.log(`WindowManagerWindows: Parsing title: "${title}"`);

    // Expected format: "Nom - Classe - Version - Release"
    // Examples:
    // "Gandalf - Iop - Dofus 3 - Beta"
    // "Legolas - Cra - Dofus 2 - Release"
    // "Gimli - Enutrof - Dofus Retro - 1.29"
    // "Boulonix - Steamer - 3.1.10.13 - Release"

    const parts = title.split(' - ').map(part => part.trim());

    if (parts.length >= 2) {
      const characterName = parts[0];
      const className = parts[1];

      // Normalize class name
      const normalizedClass = this.normalizeClassName(className);

      console.log(`WindowManagerWindows: Parsed - Character: "${characterName}", Class: "${className}" -> "${normalizedClass}"`);

      return {
        character: characterName || 'Dofus Player',
        dofusClass: normalizedClass
      };
    }

    // Fallback: try to extract from other formats
    const fallbackResult = this.extractCharacterNameFallback(title);
    console.log(`WindowManagerWindows: Fallback parsing result:`, fallbackResult);

    return fallbackResult;
  }

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

    // Check direct mappings first
    if (this.classNameMappings[normalized]) {
      return this.classNameMappings[normalized];
    }

    // Check partial matches
    for (const [key, value] of Object.entries(this.classNameMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Default fallback
    console.warn(`WindowManagerWindows: Unknown class name: "${className}", using default "feca"`);
    return 'feca';
  }

  extractProcessName(className) {
    if (!className) return 'Dofus';

    // Extract a readable process name from the class name
    if (className.includes('Unity')) return 'Dofus 3 (Unity)';
    if (className.includes('Java') || className.includes('SunAwt')) return 'Dofus 2 (Java)';
    if (className.includes('Retro')) return 'Dofus Retro';

    return 'Dofus';
  }

  extractCharacterNameFallback(title) {
    if (!title) return { character: 'Dofus Player', dofusClass: 'feca' };

    // For Dofus 3, the title is usually just "Dofus"
    if (title.trim() === 'Dofus') {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }

    // Try to extract character name from window title using various patterns
    const patterns = [
      /^([^-]+)\s*-\s*([^-]+)/i,  // "Name - Class" format
      /dofus\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*dofus/i,
      /retro\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*retro/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        let detectedClass = 'feca';

        // If we have a second capture group, it might be the class
        if (match[2]) {
          detectedClass = this.normalizeClassName(match[2].trim());
        }

        // Clean up common suffixes
        name = name.replace(/\s*\(.*\)$/, '');
        name = name.replace(/\s*-.*$/, '');

        if (name.length > 0 && name.length < 50 && name !== 'Dofus') {
          return { character: name, dofusClass: detectedClass };
        }
      }
    }

    return { character: 'Dofus Player', dofusClass: 'feca' };
  }

  async activateWindow(windowId) {
    try {
      console.log(`WindowManagerWindows: Activating window ${windowId} (using dummy activator)`);

      // Get the actual window handle from the stable ID
      const windowHandle = this.windowIdMapping.get(windowId);
      if (!windowHandle) {
        console.error(`WindowManagerWindows: No handle found for window ID ${windowId}`);
        return false;
      }

      // MODIFIÉ: Utiliser WindowActivator au lieu de la logique PowerShell
      const result = await this.windowActivator.activateWindow(windowId);

      if (result) {
        // Update active state immediately
        this.updateActiveState(windowId);
        console.log(`WindowManagerWindows: Window ${windowId} activated successfully (dummy)`);
      } else {
        console.warn(`WindowManagerWindows: Failed to activate window ${windowId} (dummy)`);
      }

      return result;
    } catch (error) {
      console.error('WindowManagerWindows: Error activating window:', error);
      return false;
    }
  }

  updateActiveState(activeWindowId) {
    // Update the active state of all windows
    for (const [windowId, windowData] of this.windows) {
      windowData.info.isActive = windowId === activeWindowId;
    }
  }

  async moveWindow(windowId, x, y, width = -1, height = -1) {
    try {
      console.log(`WindowManagerWindows: Moving window ${windowId} (using dummy activator)`);

      const windowHandle = this.windowIdMapping.get(windowId);
      if (!windowHandle) {
        console.error(`WindowManagerWindows: No handle found for window ID ${windowId}`);
        return false;
      }

      // MODIFIÉ: Utiliser WindowActivator au lieu de la logique PowerShell
      console.log(`WindowManagerWindows: Move window ${windowId} to ${x},${y} (${width}x${height}) - using dummy activator`);
      return this.windowActivator.bringWindowToFront(windowId);
    } catch (error) {
      console.error('WindowManagerWindows: Error moving window:', error);
      return false;
    }
  }

  async organizeWindows(layout = 'grid') {
    const enabledWindows = Array.from(this.windows.values())
      .filter(w => w.info.enabled)
      .sort((a, b) => b.info.initiative - a.info.initiative);

    if (enabledWindows.length === 0) return false;

    try {
      console.log(`WindowManagerWindows: Organizing ${enabledWindows.length} windows in ${layout} layout (using dummy activator)`);

      // MODIFIÉ: Utiliser WindowActivator au lieu de la logique de repositionnement
      this.windowActivator.bringWindowToFront('organize-windows-request');

      // Simuler l'organisation pour chaque fenêtre
      for (let i = 0; i < enabledWindows.length; i++) {
        const windowData = enabledWindows[i];
        console.log(`WindowManagerWindows: Organizing window ${i + 1}/${enabledWindows.length}: ${windowData.info.character} (dummy)`);
        await this.windowActivator.activateWindow(windowData.info.id);
      }

      return true;
    } catch (error) {
      console.error('WindowManagerWindows: Error organizing windows:', error);
      return false;
    }
  }

  async arrangeInGrid(_windows, _startX, _startY, _totalWidth, _totalHeight) {
    console.log('WindowManagerWindows: arrangeInGrid called (dummy implementation)');
    // SUPPRIMÉ: Toute logique de repositionnement réel
    return this.windowActivator.bringWindowToFront('arrange-grid');
  }

  async arrangeHorizontally(_windows, _startX, _startY, _totalWidth, _totalHeight) {
    console.log('WindowManagerWindows: arrangeHorizontally called (dummy implementation)');
    // SUPPRIMÉ: Toute logique de repositionnement réel
    return this.windowActivator.bringWindowToFront('arrange-horizontal');
  }

  async arrangeVertically(_windows, _startX, _startY, _totalWidth, _totalHeight) {
    console.log('WindowManagerWindows: arrangeVertically called (dummy implementation)');
    // SUPPRIMÉ: Toute logique de repositionnement réel
    return this.windowActivator.bringWindowToFront('arrange-vertical');
  }

  // Class management methods
  setWindowClass(windowId, classKey) {
    const Store = require('electron-store');
    const store = new Store();
    const classes = store.get('classes', {});
    classes[windowId] = classKey;
    store.set('classes', classes);

    // Update the window info in memory
    if (this.windows.has(windowId)) {
      const windowData = this.windows.get(windowId);
      windowData.info.dofusClass = classKey;
      windowData.info.avatar = this.getClassAvatar(classKey);
      this.windows.set(windowId, windowData);
    }
  }

  getNextClass(currentClass) {
    const classKeys = Object.keys(this.dofusClasses);
    const currentIndex = classKeys.indexOf(currentClass);
    const nextIndex = (currentIndex + 1) % classKeys.length;
    return classKeys[nextIndex];
  }

  // Storage methods
  getStoredCustomName(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const customNames = store.get('customNames', {});
    return customNames[windowId] || null;
  }

  getStoredInitiative(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const initiatives = store.get('initiatives', {});
    return initiatives[windowId] || 0;
  }

  getStoredClass(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const classes = store.get('classes', {});
    return classes[windowId] || 'feca'; // Default to Feca
  }

  getStoredShortcut(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const shortcuts = store.get('shortcuts', {});
    return shortcuts[windowId] || null;
  }

  getStoredEnabled(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const enabled = store.get('enabled', {});
    return enabled[windowId] !== false;
  }

  cleanup() {
    // Clean up PowerShell script file
    if (this.psScriptPath) {
      try {
        const fs = require('fs');
        fs.unlinkSync(this.psScriptPath);
        console.log('WindowManagerWindows: PowerShell script cleaned up');
      } catch (error) {
        console.warn('WindowManagerWindows: Error cleaning up PowerShell script:', error);
      }
    }

    // Clean up WindowActivator
    if (this.windowActivator && typeof this.windowActivator.cleanup === 'function') {
      this.windowActivator.cleanup();
    }

    // Clear mappings
    this.windowIdMapping.clear();
  }
}

module.exports = WindowManagerWindows;