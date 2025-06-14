const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.gameType = 'dofus3'; // Default to Dofus 3
    this.psScriptPath = null;
    
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
    // Create a PowerShell script for advanced window operations
    const script = `
# Dofus Organizer Windows Management Script
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

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
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public const int SW_RESTORE = 9;
    public const int SW_SHOW = 5;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const IntPtr HWND_TOP = (IntPtr)0;
}
"@

function Get-DofusWindows {
    param([string]$GameType = "dofus3")
    
    $windows = @()
    $callback = {
        param($hwnd, $lparam)
        
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
                
                $rect = New-Object WindowsAPI+RECT
                [WindowsAPI]::GetWindowRect($hwnd, [ref]$rect)
                
                $foregroundWindow = [WindowsAPI]::GetForegroundWindow()
                $isActive = $hwnd -eq $foregroundWindow
                
                # Check if this is a Dofus window based on game type
                $isDofus = $false
                switch ($GameType) {
                    "dofus2" {
                        $isDofus = ($title -match "Dofus(?!\s*3)" -or $title -match "Ankama") -and 
                                  ($title -notmatch "Retro|retro") -and
                                  ($className -match "Dofus|Ankama|SunAwtFrame|JavaFrame")
                    }
                    "dofus3" {
                        $isDofus = ($title -match "Dofus" -or $className -match "UnityWndClass|Dofus\.exe") -and
                                  ($title -notmatch "Retro|retro")
                    }
                    "retro" {
                        $isDofus = ($title -match "Retro|retro" -or $title -match "Dofus.*1\.29")
                    }
                    default {
                        $isDofus = $title -match "Dofus|Ankama|Retro"
                    }
                }
                
                if ($isDofus) {
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
        return $true
    }
    
    $script:windows = @()
    [WindowsAPI]::EnumWindows($callback, [IntPtr]::Zero)
    return $script:windows
}

function Activate-Window {
    param([int64]$Handle)
    
    $hwnd = [IntPtr]$Handle
    try {
        # First, restore the window if minimized
        [WindowsAPI]::ShowWindow($hwnd, [WindowsAPI]::SW_RESTORE)
        Start-Sleep -Milliseconds 50
        
        # Then bring it to foreground
        [WindowsAPI]::SetForegroundWindow($hwnd)
        Start-Sleep -Milliseconds 50
        
        # Ensure it's on top
        [WindowsAPI]::SetWindowPos($hwnd, [WindowsAPI]::HWND_TOP, 0, 0, 0, 0, 
                                  [WindowsAPI]::SWP_NOMOVE -bor [WindowsAPI]::SWP_NOSIZE)
        return $true
    } catch {
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
        return $false
    }
}

# Main command dispatcher
switch ($args[0]) {
    "get-windows" { 
        $gameType = if ($args[1]) { $args[1] } else { "dofus3" }
        Get-DofusWindows -GameType $gameType | ConvertTo-Json -Depth 3
    }
    "activate" { 
        Activate-Window -Handle $args[1]
    }
    "move" { 
        Move-Window -Handle $args[1] -X $args[2] -Y $args[3] -Width $args[4] -Height $args[5]
    }
    default { 
        Write-Host "Usage: script.ps1 [get-windows|activate|move] [args...]" 
    }
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
    } catch (error) {
      console.error('WindowManagerWindows: Error creating PowerShell script:', error);
    }
  }

  setGlobalGameType(gameType) {
    this.gameType = gameType;
    console.log(`WindowManagerWindows: Set game type to ${gameType}`);
  }

  getGlobalGameType() {
    return this.gameType;
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

      console.log(`WindowManagerWindows: Scanning for ${this.gameType} windows...`);
      
      let rawWindows = [];
      
      if (this.psScriptPath) {
        rawWindows = await this.getWindowsWithPowerShell();
      } else {
        // Fallback to basic Windows commands
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
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" get-windows "${this.gameType}"`;
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stderr) {
        console.warn('WindowManagerWindows: PowerShell stderr:', stderr);
      }
      
      if (stdout.trim()) {
        const windows = JSON.parse(stdout.trim());
        return Array.isArray(windows) ? windows : [windows];
      }
      
      return [];
    } catch (error) {
      console.error('WindowManagerWindows: PowerShell command failed:', error);
      return this.getWindowsWithWmic();
    }
  }

  async getWindowsWithWmic() {
    try {
      console.log('WindowManagerWindows: Using WMIC fallback method...');
      
      // Get processes that might be Dofus
      const processPatterns = this.getDofusProcessPatterns();
      const windows = [];
      
      for (const pattern of processPatterns) {
        try {
          const command = `wmic process where "name like '%${pattern}%'" get processid,commandline /format:csv`;
          const { stdout } = await execAsync(command, { timeout: 5000 });
          
          if (stdout.trim()) {
            const lines = stdout.trim().split('\n').slice(1); // Skip header
            
            for (const line of lines) {
              if (line.trim()) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                  const processId = parts[parts.length - 1].trim();
                  const commandLine = parts.slice(1, -1).join(',').trim();
                  
                  if (processId && this.isDofusProcess(commandLine)) {
                    // Create a basic window info object
                    const windowId = `wmic_${processId}_${Date.now()}`;
                    const title = this.extractTitleFromProcess(commandLine);
                    
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
      return this.createTestWindows();
    }
  }

  getDofusProcessPatterns() {
    switch (this.gameType) {
      case 'dofus2':
        return ['Dofus.exe', 'dofus.exe', 'ankama.exe', 'java.exe'];
      case 'dofus3':
        return ['Dofus.exe', 'dofus.exe', 'DofusUnity.exe', 'Dofus3.exe'];
      case 'retro':
        return ['DofusRetro.exe', 'retro.exe', 'dofus-retro.exe'];
      default:
        return ['Dofus.exe', 'dofus.exe', 'ankama.exe'];
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
    const dofusTerms = ['dofus', 'ankama', 'retro'];
    return dofusTerms.some(term => commandLower.includes(term));
  }

  extractTitleFromProcess(commandLine) {
    // Extract a reasonable title from the command line
    if (commandLine.toLowerCase().includes('retro')) {
      return 'Dofus Retro';
    } else if (commandLine.toLowerCase().includes('dofus')) {
      return 'Dofus';
    } else if (commandLine.toLowerCase().includes('ankama')) {
      return 'Ankama Launcher';
    }
    return 'Dofus Window';
  }

  createTestWindows() {
    // Create test windows for development/debugging with proper title format
    console.log('WindowManagerWindows: Creating test windows for debugging...');
    return [
      {
        Handle: 'test_12345',
        Title: 'Gandalf - Iop - Dofus 3 - Beta',
        ClassName: 'TestClass',
        ProcessId: 12345,
        IsActive: true,
        Bounds: { X: 100, Y: 100, Width: 800, Height: 600 }
      },
      {
        Handle: 'test_12346',
        Title: 'Legolas - Cra - Dofus 3 - Beta',
        ClassName: 'TestClass',
        ProcessId: 12346,
        IsActive: false,
        Bounds: { X: 200, Y: 200, Width: 800, Height: 600 }
      },
      {
        Handle: 'test_12347',
        Title: 'Gimli - Enutrof - Dofus 3 - Beta',
        ClassName: 'TestClass',
        ProcessId: 12347,
        IsActive: false,
        Bounds: { X: 300, Y: 300, Width: 800, Height: 600 }
      }
    ];
  }

  processRawWindows(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();
    
    for (const rawWindow of rawWindows) {
      const windowId = rawWindow.Handle.toString();
      currentWindowIds.add(windowId);
      
      // Parse character info from title using the format: Nom - Classe - Version - Release
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);
      
      // Get stored class or use detected class
      const storedClass = this.getStoredClass(windowId);
      const finalClass = storedClass !== 'feca' ? storedClass : dofusClass;
      
      const windowInfo = {
        id: windowId,
        title: rawWindow.Title,
        processName: this.extractProcessName(rawWindow.ClassName),
        className: rawWindow.ClassName,
        pid: rawWindow.ProcessId.toString(),
        character: character,
        dofusClass: finalClass,
        customName: this.getStoredCustomName(windowId),
        initiative: this.getStoredInitiative(windowId),
        isActive: rawWindow.IsActive,
        bounds: rawWindow.Bounds,
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
      
      if (this.psScriptPath && !windowId.startsWith('test_') && !windowId.startsWith('wmic_')) {
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" activate "${windowId}"`;
        await execAsync(command, { timeout: 5000 });
        return true;
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
          await execAsync(command, { timeout: 3000 });
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
      if (this.psScriptPath && !windowId.startsWith('test_') && !windowId.startsWith('wmic_')) {
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.psScriptPath}" move "${windowId}" "${x}" "${y}" "${width}" "${height}"`;
        await execAsync(command, { timeout: 3000 });
        return true;
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
  }
}

module.exports = WindowManagerWindows;