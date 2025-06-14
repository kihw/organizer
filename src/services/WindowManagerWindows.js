const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');

class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.activationCache = new Map();
    this.windowIdMapping = new Map(); // ID stable -> handle string
    this.realWindowHandles = new Map(); // ID stable -> handle numérique RÉEL
    this.activationScriptPath = null;
    this.fastActivationScript = null; // NOUVEAU: Script ultra-rapide
    
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
    
    // Créer les scripts d'activation optimisés
    this.createOptimizedActivationScripts();
    
    console.log('WindowManagerWindows: Initialized with ULTRA-FAST activation system');
  }

  /**
   * NOUVEAU: Scripts PowerShell ultra-optimisés pour activation rapide
   */
  async createOptimizedActivationScripts() {
    try {
      // Script ultra-rapide (méthode principale)
      const fastScriptContent = `
param([string]$Handle)

# Définition des APIs Windows en une seule fois
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FastWin32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(uint dwProcessId);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    public const int SW_RESTORE = 9;
}
"@

try {
    # Conversion rapide du handle
    $hwnd = [IntPtr]::new([long]$Handle)
    
    # Vérification rapide
    if (-not [FastWin32]::IsWindow($hwnd)) { return $false }
    
    # Obtenir le PID pour AllowSetForegroundWindow
    $processId = 0
    [FastWin32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
    
    # Permettre l'activation
    if ($processId -gt 0) {
        [FastWin32]::AllowSetForegroundWindow($processId)
    }
    
    # Restaurer si minimisée (rapide)
    if ([FastWin32]::IsIconic($hwnd)) {
        [FastWin32]::ShowWindow($hwnd, 9)
    }
    
    # Activation ultra-rapide
    [FastWin32]::BringWindowToTop($hwnd)
    $result = [FastWin32]::SetForegroundWindow($hwnd)
    
    return $result
    
} catch {
    return $false
}
`;

      // Script de secours (encore plus simple)
      const backupScriptContent = `
param([string]$Handle)
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class SimpleWin32 { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'
try {
    $result = [SimpleWin32]::SetForegroundWindow([IntPtr]::new([long]$Handle))
    return $result
} catch {
    return $false
}
`;

      // Créer les fichiers de script
      this.fastActivationScript = path.join(os.tmpdir(), 'dofus-fast-activate.ps1');
      this.activationScriptPath = path.join(os.tmpdir(), 'dofus-backup-activate.ps1');
      
      fs.writeFileSync(this.fastActivationScript, fastScriptContent, 'utf8');
      fs.writeFileSync(this.activationScriptPath, backupScriptContent, 'utf8');
      
      console.log('WindowManagerWindows: Created ULTRA-FAST activation scripts');
      return true;
    } catch (error) {
      console.error('WindowManagerWindows: Failed to create fast activation scripts:', error);
      return false;
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

  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${processId}`;
  }

  async getDofusWindows() {
    try {
      // Cache moins agressif pour permettre les vraies détections
      const now = Date.now();
      if (now - this.lastWindowCheck < 2000) { // 2 secondes de cache
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        console.log(`WindowManagerWindows: Returning ${cachedWindows.length} cached windows (FAST)`);
        return cachedWindows;
      }
      this.lastWindowCheck = now;

      console.log('WindowManagerWindows: Starting CORRECTED window detection...');
      
      // Essayer d'abord la méthode PowerShell simple (la plus fiable)
      let windows = await this.detectWithSimplePowerShell();
      
      // Si ça échoue, essayer la méthode tasklist
      if (!windows || windows.length === 0) {
        console.log('WindowManagerWindows: Simple PowerShell failed, trying tasklist...');
        windows = await this.detectWithTasklist();
      }
      
      if (windows && windows.length > 0) {
        const dofusWindows = this.processRawWindows(windows);
        
        // Sort by initiative (descending), then by character name
        dofusWindows.sort((a, b) => {
          if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
          }
          return a.character.localeCompare(b.character);
        });
        
        return dofusWindows;
      }
      
      // Si toutes les méthodes ont échoué
      console.warn('WindowManagerWindows: All detection methods failed, using last known windows');
      return this.getLastKnownWindows();
      
    } catch (error) {
      console.error('WindowManagerWindows: Critical detection error:', error);
      return this.getLastKnownWindows();
    }
  }

  /**
   * MÉTHODE SIMPLIFIÉE: PowerShell simple
   */
  async detectWithSimplePowerShell() {
    try {
      console.log('WindowManagerWindows: Using Simple PowerShell detection...');
      
      // Commande PowerShell simplifiée
      const command = 'powershell.exe -Command "Get-Process | Where-Object { $_.MainWindowTitle -match \'dofus|steamer|boulonix|ankama\' -and $_.MainWindowHandle -ne 0 } | Select-Object Id, ProcessName, MainWindowTitle, @{Name=\'Handle\';Expression={$_.MainWindowHandle.ToInt64()}} | ConvertTo-Json"';
      
      const { stdout, stderr } = await execAsync(command, { timeout: 3000 });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Simple PowerShell stderr:', stderr);
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: Simple PowerShell returned no output');
        return [];
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        const processes = Array.isArray(result) ? result : [result];
        
        const windows = processes
          .filter(proc => proc.MainWindowTitle && proc.Handle && proc.Handle !== 0)
          .map(proc => ({
            Handle: proc.Handle,
            Title: proc.MainWindowTitle,
            ProcessId: proc.Id || 0,
            ClassName: 'Dofus',
            IsActive: false,
            Bounds: { X: 0, Y: 0, Width: 800, Height: 600 }
          }));
        
        console.log(`WindowManagerWindows: Simple PowerShell found ${windows.length} Dofus windows with REAL handles`);
        return windows;
      } catch (parseError) {
        console.error('WindowManagerWindows: Simple PowerShell parse error:', parseError);
        return [];
      }
    } catch (error) {
      console.error('WindowManagerWindows: Simple PowerShell detection failed:', error.message);
      return [];
    }
  }

  /**
   * MÉTHODE SIMPLIFIÉE: Détection avec Tasklist
   */
  async detectWithTasklist() {
    try {
      console.log('WindowManagerWindows: Using Tasklist detection...');
      
      // Commande tasklist simplifiée
      const command = 'tasklist /v /fo csv | findstr /i "dofus java steamer boulonix ankama"';
      
      const { stdout, stderr } = await execAsync(command, { timeout: 3000 });
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Tasklist stderr:', stderr);
      }
      
      if (!stdout || !stdout.trim()) {
        console.log('WindowManagerWindows: Tasklist returned no output');
        return [];
      }
      
      const lines = stdout.trim().split('\n');
      const windows = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Parse CSV line
        const parts = line.split('","').map(part => part.replace(/"/g, ''));
        if (parts.length >= 8) {
          const imageName = parts[0] || '';
          const pid = parts[1] || '';
          const windowTitle = parts[8] || '';
          
          if (windowTitle && windowTitle !== 'N/A') {
            // Obtenir le handle via PowerShell
            try {
              const handleCommand = `powershell.exe -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).MainWindowHandle.ToInt64()"`;
              const { stdout: handleStdout } = await execAsync(handleCommand, { timeout: 1000 });
              
              const handle = parseInt(handleStdout.trim());
              if (handle && handle !== 0) {
                windows.push({
                  Handle: handle,
                  Title: windowTitle,
                  ProcessId: parseInt(pid) || 0,
                  ClassName: 'Dofus',
                  IsActive: false,
                  Bounds: { X: 0, Y: 0, Width: 800, Height: 600 }
                });
              }
            } catch (handleError) {
              console.warn(`WindowManagerWindows: Failed to get handle for PID ${pid}:`, handleError.message);
            }
          }
        }
      }
      
      console.log(`WindowManagerWindows: Tasklist found ${windows.length} Dofus processes with REAL handles`);
      return windows;
    } catch (error) {
      console.error('WindowManagerWindows: Tasklist detection failed:', error.message);
      return [];
    }
  }

  /**
   * Retourne les dernières fenêtres connues
   */
  getLastKnownWindows() {
    const lastKnown = Array.from(this.windows.values()).map(w => w.info);
    
    if (lastKnown.length > 0) {
      console.log(`WindowManagerWindows: Returning ${lastKnown.length} last known windows`);
      return lastKnown;
    }
    
    // CRITIQUE: PAS de fallback simulé - retourner tableau vide si pas de vraies fenêtres
    console.log('WindowManagerWindows: No real windows found, returning empty array (NO SIMULATION)');
    return [];
  }

  processRawWindows(rawWindows) {
    const processedWindows = [];
    const currentWindowIds = new Set();
    
    for (const rawWindow of rawWindows) {
      // CRITIQUE: Vérifier que nous avons un VRAI handle
      if (!rawWindow.Handle || rawWindow.Handle === 0) {
        console.warn('WindowManagerWindows: Skipping window with no REAL Handle:', rawWindow);
        continue;
      }
      
      const windowHandle = rawWindow.Handle.toString();
      
      // Parse character info from title
      const { character, dofusClass } = this.parseWindowTitle(rawWindow.Title);
      
      // CORRECTION CRITIQUE: Générer l'ID stable de façon cohérente
      const stableId = this.generateStableWindowId(character, dofusClass, rawWindow.ProcessId || windowHandle);
      
      // CORRECTION MAJEURE: Stocker TOUS les mappings nécessaires
      this.windowIdMapping.set(stableId, windowHandle);
      this.realWindowHandles.set(stableId, rawWindow.Handle);
      
      // NOUVEAU: Stocker aussi les mappings inverses pour compatibilité
      this.windowIdMapping.set(`fallback_${character.toLowerCase()}_${dofusClass}`, windowHandle);
      this.realWindowHandles.set(`fallback_${character.toLowerCase()}_${dofusClass}`, rawWindow.Handle);
      
      currentWindowIds.add(stableId);
      
      // Get stored class or use detected class
      const storedClass = this.getStoredClass(stableId);
      const finalClass = storedClass !== 'feca' ? storedClass : dofusClass;
      
      const windowInfo = {
        id: stableId,
        handle: windowHandle,
        realHandle: rawWindow.Handle, // CRITIQUE: Vrai handle Windows
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
      
      console.log(`WindowManagerWindows: Processed window ${stableId} with REAL handle ${rawWindow.Handle}`);
      console.log(`WindowManagerWindows: Mapped ${stableId} -> handle ${rawWindow.Handle}`);
      console.log(`WindowManagerWindows: Also mapped fallback_${character.toLowerCase()}_${dofusClass} -> handle ${rawWindow.Handle}`);
    }
    
    // Remove windows that no longer exist
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        this.windows.delete(windowId);
        this.windowIdMapping.delete(windowId);
        this.realWindowHandles.delete(windowId);
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
    
    // Fallback
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
    
    if (className.includes('Unity')) return 'Dofus 3 (Unity)';
    if (className.includes('Java') || className.includes('SunAwt')) return 'Dofus 2 (Java)';
    if (className.includes('Retro')) return 'Dofus Retro';
    
    return 'Dofus';
  }

  extractCharacterNameFallback(title) {
    if (!title) return { character: 'Dofus Player', dofusClass: 'feca' };
    
    if (title.trim() === 'Dofus') {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }
    
    const patterns = [
      /^([^-]+)\s*-\s*([^-]+)/i,
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
        
        if (match[2]) {
          detectedClass = this.normalizeClassName(match[2].trim());
        }
        
        name = name.replace(/\s*\(.*\)$/, '');
        name = name.replace(/\s*-.*$/, '');
        
        if (name.length > 0 && name.length < 50 && name !== 'Dofus') {
          return { character: name, dofusClass: detectedClass };
        }
      }
    }
    
    return { character: 'Dofus Player', dofusClass: 'feca' };
  }

  /**
   * NOUVEAU: Activation ultra-rapide avec méthodes optimisées
   */
  async activateWindow(windowId) {
    try {
      console.log(`WindowManagerWindows: ULTRA-FAST activation for ${windowId}`);
      
      // CORRECTION CRITIQUE: Chercher le handle dans tous les mappings possibles
      let realHandle = this.realWindowHandles.get(windowId);
      
      if (!realHandle || realHandle === 0) {
        console.log(`WindowManagerWindows: No direct handle for ${windowId}, checking alternative mappings...`);
        
        // Essayer les mappings alternatifs
        const alternativeIds = [
          windowId,
          windowId.replace('fallback_', ''),
          `fallback_${windowId}`,
          windowId.replace(/_\d+$/, '') // Enlever le PID à la fin
        ];
        
        for (const altId of alternativeIds) {
          realHandle = this.realWindowHandles.get(altId);
          if (realHandle && realHandle !== 0) {
            console.log(`WindowManagerWindows: Found handle ${realHandle} using alternative ID ${altId}`);
            break;
          }
        }
      }
      
      if (!realHandle || realHandle === 0) {
        console.error(`WindowManagerWindows: NO REAL HANDLE found for ${windowId} - CANNOT ACTIVATE`);
        return false;
      }
      
      console.log(`WindowManagerWindows: Using REAL handle ${realHandle} for ULTRA-FAST activation`);
      
      // Cache d'activation ultra-court pour éviter les activations répétées
      const cacheKey = realHandle.toString();
      const now = Date.now();
      
      if (this.activationCache.has(cacheKey)) {
        const lastActivation = this.activationCache.get(cacheKey);
        if (now - lastActivation < 100) { // 100ms cooldown ultra-court
          console.log(`WindowManagerWindows: Recent activation cached for ${windowId}`);
          return true;
        }
      }
      
      // MÉTHODE 1: Script ultra-rapide (priorité absolue)
      if (this.fastActivationScript && fs.existsSync(this.fastActivationScript)) {
        try {
          console.log(`WindowManagerWindows: Using ULTRA-FAST script for ${windowId}`);
          
          const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.fastActivationScript}" -Handle "${realHandle}"`;
          
          const { stdout, stderr } = await execAsync(command, { timeout: 800 }); // Timeout réduit à 800ms
          
          if (stderr && stderr.trim()) {
            console.warn(`WindowManagerWindows: Fast script stderr: ${stderr}`);
          }
          
          const success = stdout.includes('True') || stdout.includes('$true');
          
          if (success) {
            this.activationCache.set(cacheKey, now);
            this.updateActiveState(windowId);
            console.log(`WindowManagerWindows: ULTRA-FAST script SUCCESS for ${windowId}`);
            return true;
          } else {
            console.warn(`WindowManagerWindows: Fast script failed for ${windowId}, trying backup...`);
          }
        } catch (fastError) {
          console.warn(`WindowManagerWindows: Fast script error: ${fastError.message}, trying backup...`);
        }
      }
      
      // MÉTHODE 2: Script de secours (simple et rapide)
      if (this.activationScriptPath && fs.existsSync(this.activationScriptPath)) {
        try {
          console.log(`WindowManagerWindows: Using backup script for ${windowId}`);
          
          const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.activationScriptPath}" -Handle "${realHandle}"`;
          
          const { stdout } = await execAsync(command, { timeout: 500 }); // Timeout très court
          
          const success = stdout.includes('True') || stdout.includes('$true');
          
          if (success) {
            this.activationCache.set(cacheKey, now);
            this.updateActiveState(windowId);
            console.log(`WindowManagerWindows: Backup script SUCCESS for ${windowId}`);
            return true;
          }
        } catch (backupError) {
          console.warn(`WindowManagerWindows: Backup script error: ${backupError.message}`);
        }
      }
      
      // MÉTHODE 3: Commande PowerShell inline ultra-simple
      try {
        console.log(`WindowManagerWindows: Using inline PowerShell for ${windowId}`);
        
        // Commande ultra-simplifiée
        const command = `powershell.exe -Command "[System.Runtime.InteropServices.DllImport('user32.dll')] param(); Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);' -Name Win32 -Namespace User32; [User32.Win32]::SetForegroundWindow([IntPtr]${realHandle})"`;
        
        const { stdout } = await execAsync(command, { timeout: 300 }); // Timeout ultra-court
        
        const success = stdout.includes('True') || stdout.trim() === 'True';
        
        if (success) {
          this.activationCache.set(cacheKey, now);
          this.updateActiveState(windowId);
          console.log(`WindowManagerWindows: Inline PowerShell SUCCESS for ${windowId}`);
          return true;
        }
      } catch (inlineError) {
        console.warn(`WindowManagerWindows: Inline PowerShell error: ${inlineError.message}`);
      }
      
      // MÉTHODE 4: AppActivate de dernier recours (très rapide)
      try {
        console.log(`WindowManagerWindows: Using AppActivate for ${windowId}`);
        
        const window = this.windows.get(windowId);
        const pid = window?.info?.pid;
        
        if (pid && pid !== '0') {
          const command = `powershell.exe -Command "$shell = New-Object -ComObject WScript.Shell; $shell.AppActivate(${pid})"`;
          
          await execAsync(command, { timeout: 200 }); // Timeout ultra-court
          
          this.activationCache.set(cacheKey, now);
          this.updateActiveState(windowId);
          console.log(`WindowManagerWindows: AppActivate SUCCESS for ${windowId}`);
          return true;
        }
      } catch (appError) {
        console.warn(`WindowManagerWindows: AppActivate error: ${appError.message}`);
      }
      
      // Si toutes les méthodes ont échoué
      console.error(`WindowManagerWindows: ALL ULTRA-FAST methods failed for ${windowId}`);
      return false;
      
    } catch (error) {
      console.error('WindowManagerWindows: Critical ultra-fast activation error:', error.message);
      return false;
    }
  }

  updateActiveState(activeWindowId) {
    // Update the active state of all windows
    for (const [windowId, windowData] of this.windows) {
      windowData.info.isActive = windowId === activeWindowId;
    }
    
    console.log(`WindowManagerWindows: Updated active state - ${activeWindowId} is now active`);
  }

  async moveWindow(windowId, x, y, width = -1, height = -1) {
    try {
      // CORRECTION: Chercher le handle dans tous les mappings possibles
      let realHandle = this.realWindowHandles.get(windowId);
      
      if (!realHandle || realHandle === 0) {
        // Essayer les mappings alternatifs
        const alternativeIds = [
          windowId,
          windowId.replace('fallback_', ''),
          `fallback_${windowId}`,
          windowId.replace(/_\d+$/, '') // Enlever le PID à la fin
        ];
        
        for (const altId of alternativeIds) {
          realHandle = this.realWindowHandles.get(altId);
          if (realHandle && realHandle !== 0) {
            console.log(`WindowManagerWindows: Found handle ${realHandle} for move using alternative ID ${altId}`);
            break;
          }
        }
      }
      
      if (!realHandle || realHandle === 0) {
        console.log(`WindowManagerWindows: No REAL handle found for move operation: ${windowId}`);
        return false;
      }
      
      const command = `powershell.exe -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Move { [DllImport(\\"user32.dll\\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags); }'; [Win32Move]::SetWindowPos([IntPtr]${realHandle}, [IntPtr]0, ${x}, ${y}, ${width}, ${height}, 0x0040)"`;
      
      const { stdout } = await execAsync(command, { timeout: 100 });
      return stdout.trim() === 'True';
    } catch (error) {
      console.warn('WindowManagerWindows: Move operation failed:', error.message);
      return false;
    }
  }

  async organizeWindows(layout = 'grid') {
    const enabledWindows = Array.from(this.windows.values())
      .filter(w => w.info.enabled)
      .sort((a, b) => b.info.initiative - a.info.initiative);
    
    if (enabledWindows.length === 0) return false;

    try {
      console.log(`WindowManagerWindows: Organizing ${enabledWindows.length} windows in ${layout} layout`);
      
      const screenWidth = 1920;
      const screenHeight = 1080;
      
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
      console.error('WindowManagerWindows: Organization error:', error.message);
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
    return classes[windowId] || 'feca';
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
    // Clear activation cache
    this.activationCache.clear();
    this.windowIdMapping.clear();
    this.realWindowHandles.clear();
    
    // Supprimer les scripts d'activation
    const scriptsToRemove = [this.activationScriptPath, this.fastActivationScript];
    
    scriptsToRemove.forEach(scriptPath => {
      if (scriptPath && fs.existsSync(scriptPath)) {
        try {
          fs.unlinkSync(scriptPath);
          console.log(`WindowManagerWindows: Removed script: ${scriptPath}`);
        } catch (error) {
          console.warn(`WindowManagerWindows: Failed to remove script: ${error.message}`);
        }
      }
    });
    
    console.log('WindowManagerWindows: ULTRA-FAST activation system cleaned up');
  }
}

module.exports = WindowManagerWindows;