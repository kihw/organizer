const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.psScriptPath = null;
    this.psScriptReady = false;
    this.activationCache = new Map(); // Cache for faster activation
    
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
    // Create an optimized PowerShell script for ultra-fast window activation
    const script = `
# Dofus Organizer Windows Management Script - Ultra-Fast Version
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
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool SetActiveWindow(IntPtr hWnd);
    
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
    
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    
    [DllImport("user32.dll")]
    public static extern bool AllowSetForegroundWindow(uint dwProcessId);
    
    [DllImport("user32.dll")]
    public static extern bool SetFocus(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool SwitchToThisWindow(IntPtr hWnd, bool fUnknown);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public const int SW_RESTORE = 9;
    public const int SW_SHOW = 5;
    public const int SW_MAXIMIZE = 3;
    public const int SW_FORCEMINIMIZE = 11;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_SHOWWINDOW = 0x0040;
    
    public static readonly IntPtr HWND_TOP = new IntPtr(0);
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
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

function Activate-Window {
    param([int64]$Handle)
    
    $hwnd = [IntPtr]$Handle
    try {
        # Ultra-fast activation method - minimal delays
        $processId = 0
        [WindowsAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        
        # Allow this process to set foreground window
        [WindowsAPI]::AllowSetForegroundWindow($processId)
        
        # Restore if minimized
        if ([WindowsAPI]::IsIconic($hwnd)) {
            [WindowsAPI]::ShowWindow($hwnd, [WindowsAPI]::SW_RESTORE)
        }
        
        # Use SwitchToThisWindow for fastest activation
        [WindowsAPI]::SwitchToThisWindow($hwnd, $true)
        
        # Bring to top
        [WindowsAPI]::BringWindowToTop($hwnd)
        
        # Set as foreground
        $result = [WindowsAPI]::SetForegroundWindow($hwnd)
        
        # Final verification
        $foregroundWindow = [WindowsAPI]::GetForegroundWindow()
        $success = $hwnd -eq $foregroundWindow
        
        return $success
    } catch {
        Write-Error "Failed to activate window: $_"
        return $false
    }
}

function Move-Window {
    param([int64]$Handle, [int]$X, [int]$Y, [int]$Width = -1, [int]$Height = -1)
    
    $hwnd = [IntPtr]$Handle
    try {
        if ($Width -eq -1 -or $Height -eq -1) {
            $flags = [WindowsAPI]::SWP_NOSIZE
        } else {
            $flags = 0
            if ($Width -eq -1) { $Width = 0 }
            if ($Height -eq -1) { $Height = 0 }
        }
        
        [WindowsAPI]::SetWindowPos($hwnd, [IntPtr]::Zero, $X, $Y, $Width, $Height, $flags)
        return $true
    } catch {
        Write-Error "Failed to move window: $_"
        return $false
    }
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
            $result = Activate-Window -Handle $args[1]
            $result.ToString().ToLower()
        }
        "move" { 
            $result = Move-Window -Handle $args[1] -X $args[2] -Y $args[3] -Width $args[4] -Height $args[5]
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
    
    this.psScriptPath = path.join(os.tmpdir(), 'dofus-organizer-windows.ps1');
    
    try {
      fs.writeFileSync(this.psScriptPath, script, 'utf8');
      console.log('WindowManagerWindows: PowerShell script initialized');
      
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
      const { stdout, stderr } = await execAsync(command, { timeout: 5000 });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell test stderr:', stderr);
        this.psScriptReady = false;
      } else {
        console.log('WindowManagerWindows: PowerShell script test successful');
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

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 1000) {
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
      
      // If still no windows, try WMIC fallback
      if (rawWindows.length === 0) {
        console.log('WindowManagerWindows: Alternative method returned no windows, trying WMIC...');
        rawWindows = await this.getWindowsWithWmic();
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
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: PowerShell stderr:', stderr);
        // Don't fail completely on stderr, try to parse stdout anyway
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

  async getWindowsWithWmic() {
    try {
      console.log('WindowManagerWindows: Using WMIC fallback method...');
      
      // Get processes that might be Dofus
      const processPatterns = ['Dofus', 'dofus', 'ankama', 'java'];
      const windows = [];
      
      for (const pattern of processPatterns) {
        try {
          const command = `wmic process where "name like '%${pattern}%'" get processid,commandline,name /format:csv`;
          const { stdout } = await execAsync(command, { timeout: 5000 });
          
          if (stdout.trim()) {
            const lines = stdout.trim().split('\n').slice(1); // Skip header
            
            for (const line of lines) {
              if (line.trim()) {
                const parts = line.split(',');
                if (parts.length >= 4) {
                  const commandLine = parts[1] || '';
                  const name = parts[2] || '';
                  const processId = parts[3] || '';
                  
                  if (processId && this.isDofusProcess(commandLine + ' ' + name)) {
                    // Create a basic window info object
                    const windowId = `wmic_${processId}_${Date.now()}`;
                    const title = this.extractTitleFromProcess(commandLine + ' ' + name);
                    
                    windows.push({
                      Handle: windowId,
                      Title: title,
                      ClassName: 'Unknown',
                      ProcessId: parseInt(processId),
                      IsActive: true,
                      Bounds: { X: 0, Y: 0, Width: 800, Height: 600 }
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(`WindowManagerWindows: WMIC pattern ${pattern} failed:`, error.message);
        }
      }
      
      return windows;
    } catch (error) {
      console.error('WindowManagerWindows: WMIC fallback failed:', error);
      return [];
    }
  }

  isDofusProcess(commandLine) {
    if (!commandLine) return false;
    
    const commandLower = commandLine.toLowerCase();
    
    // Exclude obvious non-Dofus processes
    const excludes = ['organizer', 'electron', 'chrome', 'firefox', 'explorer'];
    if (excludes.some(exclude => commandLower.includes(exclude))) {
      return false;
    }
    
    // Check for Dofus-related terms
    const dofusTerms = ['dofus', 'ankama', 'steamer', 'boulonix'];
    return dofusTerms.some(term => commandLower.includes(term));
  }

  extractTitleFromProcess(commandLine) {
    // Extract a reasonable title from the command line
    if (commandLine.toLowerCase().includes('retro')) {
      return 'TestChar - Feca - Dofus Retro - 1.29';
    } else if (commandLine.toLowerCase().includes('dofus')) {
      return 'TestChar - Iop - Dofus 3 - Beta';
    } else if (commandLine.toLowerCase().includes('ankama')) {
      return 'TestChar - Cra - Dofus 2 - Release';
    }
    return 'TestChar - Feca - Dofus 3 - Beta';
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
      
      const windowId = rawWindow.Handle.toString();
      currentWindowIds.add(windowId);
      
      // Parse character info from title using the format: Nom - Classe - Version - Release
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);
      
      // Get stored class or use detected class
      const storedClass = this.getStoredClass(windowId);
      const finalClass = storedClass !== 'feca' ? storedClass : dofusClass;
      
      const windowInfo = {
        id: windowId,
        title: rawWindow.Title || 'Unknown Window',
        processName: this.extractProcessName(rawWindow.ClassName),
        className: rawWindow.ClassName || 'Unknown',
        pid: (rawWindow.ProcessId || 0).toString(),
        character: character,
        dofusClass: finalClass,
        customName: this.getStoredCustomName(windowId),
        initiative: this.getStoredInitiative(windowId),
        isActive: rawWindow.IsActive || false,
        bounds: rawWindow.Bounds || { X: 0, Y: 0, Width: 800, Height: 600 },
        avatar: this.getClassAvatar(finalClass),
        shortcut: this.getStoredShortcut(windowId),
        enabled: this.getStoredEnabled(windowId)
      };
      
      processedWindows.push(windowInfo);
      this.windows.set(windowId, { info: windowInfo });
    }
    
    // Remove windows that no longer exist
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        this.windows.delete(windowId);
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
      console.log(`WindowManagerWindows: Activating window ${windowId}`);
      
      // Check cache first for faster activation
      const cacheKey = windowId;
      const now = Date.now();
      
      if (this.activationCache.has(cacheKey)) {
        const lastActivation = this.activationCache.get(cacheKey);
        if (now - lastActivation < 500) { // 500ms cooldown
          console.log(`WindowManagerWindows: Activation cooldown active for ${windowId}`);
          return true;
        }
      }
      
      if (this.psScriptReady && this.psScriptPath && !windowId.startsWith('test_') && !windowId.startsWith('wmic_')) {
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" activate "${windowId}"`;
        const { stdout, stderr } = await execAsync(command, { timeout: 3000 }); // Reduced timeout for speed
        
        if (stderr && stderr.trim()) {
          console.warn(`WindowManagerWindows: PowerShell activation stderr: ${stderr}`);
        }
        
        const success = stdout.trim() === 'true';
        console.log(`WindowManagerWindows: PowerShell activation result: ${success}`);
        
        if (success) {
          // Cache successful activation
          this.activationCache.set(cacheKey, now);
          
          // Clean up old cache entries
          if (this.activationCache.size > 50) {
            const oldestKey = this.activationCache.keys().next().value;
            this.activationCache.delete(oldestKey);
          }
        }
        
        return success;
      } else {
        // Fallback activation method for test/wmic windows
        console.log(`WindowManagerWindows: Using fallback activation for ${windowId}`);
        return this.activateWindowFallback(windowId);
      }
    } catch (error) {
      console.error('WindowManagerWindows: Error activating window:', error);
      return false;
    }
  }

  async activateWindowFallback(windowId) {
    try {
      // Try using basic Windows commands
      if (windowId.startsWith('wmic_')) {
        const processId = windowId.split('_')[1];
        if (processId) {
          // Try to focus using process ID
          const command = `powershell.exe -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate(${processId})"`;
          await execAsync(command, { timeout: 2000 }); // Reduced timeout
          return true;
        }
      }
      
      // For test windows, just return success
      if (windowId.startsWith('test_')) {
        console.log(`WindowManagerWindows: Test window ${windowId} activated (simulated)`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('WindowManagerWindows: Fallback activation failed:', error);
      return false;
    }
  }

  async moveWindow(windowId, x, y, width = -1, height = -1) {
    try {
      if (this.psScriptReady && this.psScriptPath && !windowId.startsWith('test_') && !windowId.startsWith('wmic_')) {
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" move "${windowId}" "${x}" "${y}" "${width}" "${height}"`;
        const { stdout } = await execAsync(command, { timeout: 3000 });
        return stdout.trim() === 'true';
      }
      return false;
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
      // Get screen dimensions
      const { stdout } = await execAsync('wmic desktopmonitor get screenwidth,screenheight /format:csv', { timeout: 3000 });
      
      let screenWidth = 1920;
      let screenHeight = 1080;
      
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          if (line.includes(',')) {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const height = parseInt(parts[1]);
              const width = parseInt(parts[2]);
              if (height > 0 && width > 0) {
                screenWidth = width;
                screenHeight = height;
                break;
              }
            }
          }
        }
      }
      
      switch (layout) {
        case 'grid':
          await this.arrangeInGrid(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        case 'horizontal':
          await this.arrangeHorizontally(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        case 'vertical':
          await this.arrangeVertically(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        default:
          await this.arrangeInGrid(enabledWindows, 0, 0, screenWidth, screenHeight);
      }
      
      return true;
    } catch (error) {
      console.error('WindowManagerWindows: Error organizing windows:', error);
      return false;
    }
  }

  async arrangeInGrid(windows, startX, startY, totalWidth, totalHeight) {
    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const windowWidth = Math.floor(totalWidth / cols);
    const windowHeight = Math.floor(totalHeight / rows);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = startX + col * windowWidth;
      const y = startY + row * windowHeight;
      
      await this.moveWindow(windowData.info.id, x, y, windowWidth - 10, windowHeight - 50);
    }
  }

  async arrangeHorizontally(windows, startX, startY, totalWidth, totalHeight) {
    const windowWidth = Math.floor(totalWidth / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const x = startX + i * windowWidth;
      await this.moveWindow(windowData.info.id, x, startY, windowWidth - 10, totalHeight - 50);
    }
  }

  async arrangeVertically(windows, startX, startY, totalWidth, totalHeight) {
    const windowHeight = Math.floor(totalHeight / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const y = startY + i * windowHeight;
      await this.moveWindow(windowData.info.id, startX, y, totalWidth - 10, windowHeight - 10);
    }
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
    
    // Clear activation cache
    this.activationCache.clear();
  }
}

module.exports = WindowManagerWindows;