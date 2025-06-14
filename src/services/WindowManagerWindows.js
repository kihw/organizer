const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManagerWindows {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.activationCache = new Map();
    this.windowIdMapping = new Map(); // ID stable -> handle string
    this.realWindowHandles = new Map(); // ID stable -> handle numérique RÉEL
    this.quickActivationEnabled = true;
    this.detectionMethods = [];
    this.activationMethods = [];
    this.precompiledPowerShell = null;
    
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
    
    this.initializeDetectionMethods();
    this.initializeActivationMethods();
    this.precompilePowerShellActivation();
    
    console.log('WindowManagerWindows: Initialized with REAL WINDOW ACTIVATION (no simulation)');
  }

  /**
   * NOUVEAU: Précompile un script PowerShell ROBUSTE pour activation RÉELLE
   */
  async precompilePowerShellActivation() {
    try {
      console.log('WindowManagerWindows: Precompiling ROBUST PowerShell for REAL activation...');
      
      // Script PowerShell ultra-robuste pour activation RÉELLE
      this.precompiledPowerShell = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Threading;
        public class RealWin32 {
          [DllImport("user32.dll")]
          public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          [DllImport("user32.dll")]
          public static extern bool IsIconic(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool BringWindowToTop(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool SetActiveWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
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
          [DllImport("user32.dll")]
          public static extern bool IsWindowVisible(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool EnableWindow(IntPtr hWnd, bool bEnable);
          
          public const int SW_RESTORE = 9;
          public const int SW_SHOW = 5;
          public const int SW_FORCEMINIMIZE = 11;
        }
"@
        
        function Activate-WindowReal {
          param([string]$Handle)
          
          $hwnd = [IntPtr]$Handle
          
          try {
            Write-Host "Activating window handle: $Handle"
            
            # Vérifier que la fenêtre existe et est visible
            if (-not [RealWin32]::IsWindowVisible($hwnd)) {
              Write-Host "Window not visible, showing it first"
              [RealWin32]::ShowWindow($hwnd, [RealWin32]::SW_SHOW)
              Start-Sleep -Milliseconds 50
            }
            
            # Si la fenêtre est minimisée, la restaurer
            if ([RealWin32]::IsIconic($hwnd)) {
              Write-Host "Window is minimized, restoring"
              [RealWin32]::ShowWindow($hwnd, [RealWin32]::SW_RESTORE)
              Start-Sleep -Milliseconds 100
            }
            
            # Obtenir les threads
            $currentThread = [RealWin32]::GetCurrentThreadId()
            $targetProcessId = 0
            $targetThread = [RealWin32]::GetWindowThreadProcessId($hwnd, [ref]$targetProcessId)
            
            Write-Host "Current thread: $currentThread, Target thread: $targetThread, Target PID: $targetProcessId"
            
            # Permettre l'activation
            if ($targetProcessId -gt 0) {
              [RealWin32]::AllowSetForegroundWindow($targetProcessId)
            }
            
            # Attacher les threads si différents
            $threadsAttached = $false
            if ($targetThread -ne $currentThread -and $targetThread -gt 0) {
              Write-Host "Attaching input threads"
              $threadsAttached = [RealWin32]::AttachThreadInput($currentThread, $targetThread, $true)
            }
            
            try {
              # Séquence d'activation ROBUSTE
              Write-Host "Starting activation sequence"
              
              # 1. Amener au premier plan
              $result1 = [RealWin32]::BringWindowToTop($hwnd)
              Write-Host "BringWindowToTop result: $result1"
              
              # 2. Définir comme fenêtre de premier plan
              $result2 = [RealWin32]::SetForegroundWindow($hwnd)
              Write-Host "SetForegroundWindow result: $result2"
              
              # 3. Activer la fenêtre
              $result3 = [RealWin32]::SetActiveWindow($hwnd)
              Write-Host "SetActiveWindow result: $result3"
              
              # 4. Donner le focus
              $result4 = [RealWin32]::SetFocus($hwnd)
              Write-Host "SetFocus result: $result4"
              
              # 5. Méthode alternative si les autres échouent
              if (-not $result2) {
                Write-Host "Using SwitchToThisWindow as fallback"
                [RealWin32]::SwitchToThisWindow($hwnd, $true)
              }
              
              # Attendre un peu pour que l'activation prenne effet
              Start-Sleep -Milliseconds 50
              
              # Vérifier si l'activation a réussi
              $foregroundWindow = [RealWin32]::GetForegroundWindow()
              $success = ($foregroundWindow -eq $hwnd)
              
              Write-Host "Activation verification - Foreground window: $foregroundWindow, Target: $hwnd, Success: $success"
              
              return $success
              
            } finally {
              # Détacher les threads
              if ($threadsAttached) {
                Write-Host "Detaching input threads"
                [RealWin32]::AttachThreadInput($currentThread, $targetThread, $false)
              }
            }
            
          } catch {
            Write-Host "Error during activation: $_"
            return $false
          }
        }
      `;
      
      console.log('WindowManagerWindows: ROBUST PowerShell precompilation completed');
    } catch (error) {
      console.warn('WindowManagerWindows: PowerShell precompilation failed:', error.message);
      this.precompiledPowerShell = null;
    }
  }

  /**
   * NOUVEAU: Initialise les méthodes d'activation RÉELLES (pas de simulation)
   */
  initializeActivationMethods() {
    this.activationMethods = [
      {
        name: 'robust_powershell',
        timeout: 150, // Plus de temps pour activation RÉELLE
        method: this.robustPowerShellActivation.bind(this)
      },
      {
        name: 'win32_comprehensive',
        timeout: 100,
        method: this.comprehensiveWin32Activation.bind(this)
      },
      {
        name: 'process_focus',
        timeout: 80,
        method: this.processFocusActivation.bind(this)
      },
      {
        name: 'window_message',
        timeout: 60,
        method: this.windowMessageActivation.bind(this)
      }
    ];
    
    console.log('WindowManagerWindows: Initialized 4 REAL activation methods (NO SIMULATION)');
  }

  /**
   * NOUVEAU: Initialise plusieurs méthodes de détection
   */
  initializeDetectionMethods() {
    this.detectionMethods = [
      {
        name: 'wmic_process',
        timeout: 2000,
        method: this.detectWithWMIC.bind(this)
      },
      {
        name: 'tasklist',
        timeout: 3000,
        method: this.detectWithTasklist.bind(this)
      },
      {
        name: 'powershell_simple',
        timeout: 2000,
        method: this.detectWithSimplePowerShell.bind(this)
      },
      {
        name: 'powershell_advanced',
        timeout: 4000,
        method: this.detectWithAdvancedPowerShell.bind(this)
      }
    ];
    
    console.log('WindowManagerWindows: Initialized 4 detection methods');
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

      console.log('WindowManagerWindows: Starting ROBUST multi-method detection...');
      
      // Essayer chaque méthode de détection jusqu'à ce qu'une fonctionne
      for (const method of this.detectionMethods) {
        try {
          console.log(`WindowManagerWindows: Trying ${method.name}...`);
          
          const detectionPromise = method.method();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${method.name} timeout`)), method.timeout)
          );
          
          const rawWindows = await Promise.race([detectionPromise, timeoutPromise]);
          
          if (rawWindows && rawWindows.length > 0) {
            console.log(`WindowManagerWindows: SUCCESS with ${method.name} - found ${rawWindows.length} windows`);
            
            const dofusWindows = this.processRawWindows(rawWindows);
            
            // Sort by initiative (descending), then by character name
            dofusWindows.sort((a, b) => {
              if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
              }
              return a.character.localeCompare(b.character);
            });
            
            return dofusWindows;
          } else {
            console.log(`WindowManagerWindows: ${method.name} returned no windows, trying next method...`);
          }
        } catch (error) {
          console.warn(`WindowManagerWindows: ${method.name} failed: ${error.message}`);
          continue;
        }
      }
      
      // Si toutes les méthodes ont échoué
      console.warn('WindowManagerWindows: ALL detection methods failed, using last known windows');
      return this.getLastKnownWindows();
      
    } catch (error) {
      console.error('WindowManagerWindows: Critical detection error:', error);
      return this.getLastKnownWindows();
    }
  }

  /**
   * MÉTHODE 1: Détection avec WMIC (la plus fiable)
   */
  async detectWithWMIC() {
    try {
      console.log('WindowManagerWindows: Using WMIC detection...');
      
      const command = 'wmic process where "Name like \'%java%\' or Name like \'%Dofus%\' or Name like \'%dofus%\'" get ProcessId,Name,CommandLine,WindowTitle /format:csv';
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: WMIC stderr:', stderr);
      }
      
      if (!stdout || !stdout.trim()) {
        console.log('WindowManagerWindows: WMIC returned no output');
        return [];
      }
      
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const windows = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split(',');
        if (parts.length >= 4) {
          const commandLine = parts[1] || '';
          const name = parts[2] || '';
          const processId = parts[3] || '';
          const windowTitle = parts[4] || '';
          
          // Vérifier si c'est un processus Dofus
          if (this.isDofusProcess(commandLine, name, windowTitle)) {
            const title = windowTitle || this.extractTitleFromCommand(commandLine) || `${name} - Dofus`;
            
            // CRITIQUE: Obtenir le VRAI handle de fenêtre Windows
            const realHandle = await this.getRealWindowHandle(processId);
            
            if (realHandle && realHandle !== 0) {
              windows.push({
                Handle: realHandle,
                Title: title,
                ProcessId: parseInt(processId) || 0,
                ClassName: 'Dofus',
                IsActive: false,
                Bounds: { X: 0, Y: 0, Width: 800, Height: 600 }
              });
              
              console.log(`WindowManagerWindows: Found REAL window handle ${realHandle} for process ${processId}`);
            }
          }
        }
      }
      
      console.log(`WindowManagerWindows: WMIC found ${windows.length} Dofus processes with REAL handles`);
      return windows;
    } catch (error) {
      console.error('WindowManagerWindows: WMIC detection failed:', error.message);
      return [];
    }
  }

  /**
   * CRITIQUE: Obtient le VRAI handle de fenêtre Windows (pas de simulation)
   */
  async getRealWindowHandle(processId) {
    try {
      // Méthode robuste pour obtenir le handle RÉEL
      const command = `powershell.exe -Command "
        $process = Get-Process -Id ${processId} -ErrorAction SilentlyContinue
        if ($process -and $process.MainWindowHandle -and $process.MainWindowHandle -ne 0) {
          $handle = $process.MainWindowHandle.ToInt64()
          Write-Host \\"HANDLE:\$handle\\"
          
          # Vérifier que la fenêtre est valide
          Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Check { [DllImport(\\"user32.dll\\")] public static extern bool IsWindow(IntPtr hWnd); }'
          $isValid = [Win32Check]::IsWindow([IntPtr]$handle)
          
          if ($isValid) {
            return $handle
          }
        }
        return 0
      "`;
      
      const { stdout } = await execAsync(command, { timeout: 1000 });
      
      if (stdout && stdout.includes('HANDLE:')) {
        const handleMatch = stdout.match(/HANDLE:(\d+)/);
        if (handleMatch && handleMatch[1]) {
          const handle = parseInt(handleMatch[1]);
          if (handle > 0) {
            console.log(`WindowManagerWindows: Found VALID real handle ${handle} for process ${processId}`);
            return handle;
          }
        }
      }
    } catch (error) {
      console.warn(`WindowManagerWindows: Could not get real handle for process ${processId}:`, error.message);
    }
    
    return null;
  }

  /**
   * MÉTHODE 2: Détection avec Tasklist
   */
  async detectWithTasklist() {
    try {
      console.log('WindowManagerWindows: Using Tasklist detection...');
      
      const command = 'tasklist /fo csv /v | findstr /i "java dofus steamer boulonix"';
      
      const { stdout, stderr } = await execAsync(command);
      
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
          
          if (this.isDofusProcess('', imageName, windowTitle)) {
            const title = windowTitle !== 'N/A' ? windowTitle : `${imageName} - Dofus`;
            
            // CRITIQUE: Obtenir le VRAI handle
            const realHandle = await this.getRealWindowHandle(pid);
            
            if (realHandle && realHandle !== 0) {
              windows.push({
                Handle: realHandle,
                Title: title,
                ProcessId: parseInt(pid) || 0,
                ClassName: 'Dofus',
                IsActive: false,
                Bounds: { X: 0, Y: 0, Width: 800, Height: 600 }
              });
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
   * MÉTHODE 3: PowerShell simple
   */
  async detectWithSimplePowerShell() {
    try {
      console.log('WindowManagerWindows: Using Simple PowerShell detection...');
      
      const command = 'powershell.exe -Command "Get-Process | Where-Object { $_.ProcessName -match \'java|dofus|steamer|boulonix\' -and $_.MainWindowTitle -and $_.MainWindowHandle -ne 0 } | Select-Object Id, ProcessName, MainWindowTitle, @{Name=\'Handle\';Expression={$_.MainWindowHandle.ToInt64()}} | ConvertTo-Json"';
      
      const { stdout, stderr } = await execAsync(command);
      
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
          .filter(proc => proc.MainWindowTitle && proc.Handle && proc.Handle !== 0 && this.isDofusProcess('', proc.ProcessName, proc.MainWindowTitle))
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
   * MÉTHODE 4: PowerShell avancé
   */
  async detectWithAdvancedPowerShell() {
    try {
      console.log('WindowManagerWindows: Using Advanced PowerShell detection...');
      
      const command = `powershell.exe -Command "Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowHandle -ne 0 -and ($_.ProcessName -like '*Dofus*' -or $_.MainWindowTitle -like '*Dofus*' -or $_.MainWindowTitle -like '*Steamer*' -or $_.MainWindowTitle -like '*Boulonix*' -or $_.ProcessName -like '*java*') } | ForEach-Object { @{ Handle = $_.MainWindowHandle.ToInt64(); Title = $_.MainWindowTitle; ProcessId = $_.Id; ClassName = 'Dofus'; IsActive = $false; Bounds = @{ X = 0; Y = 0; Width = 800; Height = 600 } } } | ConvertTo-Json"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && stderr.trim()) {
        console.warn('WindowManagerWindows: Advanced PowerShell stderr:', stderr);
      }
      
      if (!stdout || !stdout.trim() || stdout.trim() === '[]') {
        console.log('WindowManagerWindows: Advanced PowerShell returned no output');
        return [];
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        const windows = Array.isArray(result) ? result : [result];
        
        // Filtrer les fenêtres organizer et vérifier les handles
        const filteredWindows = windows.filter(window => {
          if (!window.Title || !window.Handle || window.Handle === 0) return false;
          const title = window.Title.toLowerCase();
          return !title.includes('organizer') && !title.includes('configuration');
        });
        
        console.log(`WindowManagerWindows: Advanced PowerShell found ${filteredWindows.length} Dofus windows with REAL handles`);
        return filteredWindows;
      } catch (parseError) {
        console.error('WindowManagerWindows: Advanced PowerShell parse error:', parseError);
        return [];
      }
    } catch (error) {
      console.error('WindowManagerWindows: Advanced PowerShell detection failed:', error.message);
      return [];
    }
  }

  /**
   * Vérifie si un processus est lié à Dofus
   */
  isDofusProcess(commandLine = '', processName = '', windowTitle = '') {
    const searchText = `${commandLine} ${processName} ${windowTitle}`.toLowerCase();
    
    // Exclure l'organizer
    if (searchText.includes('organizer') || searchText.includes('configuration')) {
      return false;
    }
    
    // Chercher les termes Dofus
    const dofusTerms = ['dofus', 'steamer', 'boulonix', 'ankama', 'retro'];
    const hasDofusTerm = dofusTerms.some(term => searchText.includes(term));
    
    // Pour Java, vérifier plus spécifiquement
    if (searchText.includes('java')) {
      return hasDofusTerm || searchText.includes('dofus') || searchText.includes('ankama');
    }
    
    return hasDofusTerm;
  }

  /**
   * Extrait un titre depuis la ligne de commande
   */
  extractTitleFromCommand(commandLine) {
    if (!commandLine) return null;
    
    // Chercher des patterns dans la ligne de commande
    const patterns = [
      /--title[=\s]+"([^"]+)"/i,
      /--name[=\s]+"([^"]+)"/i,
      /-Dcharacter[=\s]+"([^"]+)"/i,
      /character[=:]([^\s]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = commandLine.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
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
   * CRITIQUE: Activation RÉELLE des fenêtres Windows (PAS DE SIMULATION)
   */
  async activateWindow(windowId) {
    try {
      console.log(`WindowManagerWindows: REAL activation for ${windowId} (NO SIMULATION)`);
      
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
        console.log('WindowManagerWindows: Available handles:', Array.from(this.realWindowHandles.entries()));
        return false;
      }
      
      console.log(`WindowManagerWindows: Using REAL handle ${realHandle} for activation`);
      
      // Cache d'activation pour éviter les activations répétées
      const cacheKey = realHandle.toString();
      const now = Date.now();
      
      if (this.activationCache.has(cacheKey)) {
        const lastActivation = this.activationCache.get(cacheKey);
        if (now - lastActivation < 200) { // 200ms cooldown
          console.log(`WindowManagerWindows: Recent activation cached for ${windowId}`);
          return true;
        }
      }
      
      // CRITIQUE: Essayer chaque méthode d'activation RÉELLE
      for (const method of this.activationMethods) {
        try {
          console.log(`WindowManagerWindows: Trying REAL ${method.name} for ${windowId}...`);
          
          const activationPromise = method.method(windowId, realHandle);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${method.name} timeout`)), method.timeout)
          );
          
          const success = await Promise.race([activationPromise, timeoutPromise]);
          
          if (success) {
            this.activationCache.set(cacheKey, now);
            this.updateActiveState(windowId);
            console.log(`WindowManagerWindows: REAL SUCCESS with ${method.name} for ${windowId}`);
            return true;
          }
        } catch (error) {
          console.warn(`WindowManagerWindows: REAL ${method.name} failed: ${error.message}`);
          continue;
        }
      }
      
      // Si toutes les méthodes ont échoué
      console.error(`WindowManagerWindows: ALL REAL activation methods failed for ${windowId}`);
      return false;
      
    } catch (error) {
      console.error('WindowManagerWindows: Critical REAL activation error:', error.message);
      return false;
    }
  }

  /**
   * MÉTHODE D'ACTIVATION 1: PowerShell robuste (RÉELLE)
   */
  async robustPowerShellActivation(windowId, realHandle) {
    try {
      console.log(`WindowManagerWindows: ROBUST PowerShell activation for handle ${realHandle}`);
      
      if (this.precompiledPowerShell) {
        const command = `powershell.exe -Command "${this.precompiledPowerShell}; Activate-WindowReal -Handle '${realHandle}'"`;
        
        const { stdout, stderr } = await execAsync(command, { timeout: 120 });
        
        if (stderr && stderr.trim()) {
          console.warn(`WindowManagerWindows: PowerShell stderr: ${stderr}`);
        }
        
        console.log(`WindowManagerWindows: PowerShell output: ${stdout}`);
        
        // Analyser la sortie pour déterminer le succès
        const success = stdout.includes('Success: True') || stdout.includes('Activation verification') && stdout.includes('Success: true');
        
        console.log(`WindowManagerWindows: ROBUST PowerShell result: ${success}`);
        return success;
      } else {
        console.warn('WindowManagerWindows: No precompiled PowerShell available');
        return false;
      }
    } catch (error) {
      console.warn(`WindowManagerWindows: ROBUST PowerShell failed: ${error.message}`);
      return false;
    }
  }

  /**
   * MÉTHODE D'ACTIVATION 2: Win32 complet (RÉELLE)
   */
  async comprehensiveWin32Activation(windowId, realHandle) {
    try {
      console.log(`WindowManagerWindows: COMPREHENSIVE Win32 activation for handle ${realHandle}`);
      
      const command = `powershell.exe -Command "
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Full { 
          [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); 
          [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); 
          [DllImport(\\"user32.dll\\")] public static extern bool BringWindowToTop(IntPtr hWnd); 
          [DllImport(\\"user32.dll\\")] public static extern bool IsIconic(IntPtr hWnd); 
          [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); 
        }'
        
        $hwnd = [IntPtr]${realHandle}
        
        # Restaurer si minimisée
        if ([Win32Full]::IsIconic($hwnd)) {
          [Win32Full]::ShowWindow($hwnd, 9)
          Start-Sleep -Milliseconds 50
        }
        
        # Séquence d'activation
        [Win32Full]::BringWindowToTop($hwnd)
        $result = [Win32Full]::SetForegroundWindow($hwnd)
        
        # Vérifier le succès
        Start-Sleep -Milliseconds 50
        $foreground = [Win32Full]::GetForegroundWindow()
        $success = ($foreground -eq $hwnd)
        
        Write-Host \\"Result: $result, Foreground: $foreground, Target: $hwnd, Success: $success\\"
        return $success
      "`;
      
      const { stdout } = await execAsync(command, { timeout: 80 });
      
      console.log(`WindowManagerWindows: Win32 output: ${stdout}`);
      
      const success = stdout.includes('Success: True') || stdout.includes('Result: True');
      
      console.log(`WindowManagerWindows: COMPREHENSIVE Win32 result: ${success}`);
      return success;
    } catch (error) {
      console.warn(`WindowManagerWindows: COMPREHENSIVE Win32 failed: ${error.message}`);
      return false;
    }
  }

  /**
   * MÉTHODE D'ACTIVATION 3: Focus par processus (RÉELLE)
   */
  async processFocusActivation(windowId, realHandle) {
    try {
      console.log(`WindowManagerWindows: PROCESS focus activation for handle ${realHandle}`);
      
      const command = `powershell.exe -Command "
        $hwnd = [IntPtr]${realHandle}
        
        # Obtenir le processus
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Proc { 
          [DllImport(\\"user32.dll\\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); 
          [DllImport(\\"user32.dll\\")] public static extern bool AllowSetForegroundWindow(uint dwProcessId); 
          [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); 
        }'
        
        $processId = 0
        [Win32Proc]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        
        if ($processId -gt 0) {
          [Win32Proc]::AllowSetForegroundWindow($processId)
          $result = [Win32Proc]::SetForegroundWindow($hwnd)
          return $result
        }
        
        return $false
      "`;
      
      const { stdout } = await execAsync(command, { timeout: 60 });
      
      const success = stdout.trim() === 'True';
      
      console.log(`WindowManagerWindows: PROCESS focus result: ${success}`);
      return success;
    } catch (error) {
      console.warn(`WindowManagerWindows: PROCESS focus failed: ${error.message}`);
      return false;
    }
  }

  /**
   * MÉTHODE D'ACTIVATION 4: Message Windows (RÉELLE)
   */
  async windowMessageActivation(windowId, realHandle) {
    try {
      console.log(`WindowManagerWindows: WINDOW message activation for handle ${realHandle}`);
      
      const command = `powershell.exe -Command "
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Msg { 
          [DllImport(\\"user32.dll\\")] public static extern bool SwitchToThisWindow(IntPtr hWnd, bool fUnknown); 
          [DllImport(\\"user32.dll\\")] public static extern bool SetActiveWindow(IntPtr hWnd); 
        }'
        
        $hwnd = [IntPtr]${realHandle}
        
        # Utiliser SwitchToThisWindow
        [Win32Msg]::SwitchToThisWindow($hwnd, $true)
        $result = [Win32Msg]::SetActiveWindow($hwnd)
        
        return $result
      "`;
      
      const { stdout } = await execAsync(command, { timeout: 40 });
      
      const success = stdout.trim() === 'True';
      
      console.log(`WindowManagerWindows: WINDOW message result: ${success}`);
      return success;
    } catch (error) {
      console.warn(`WindowManagerWindows: WINDOW message failed: ${error.message}`);
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
    this.precompiledPowerShell = null;
    console.log('WindowManagerWindows: REAL activation system cleaned up (NO SIMULATION)');
  }
}

module.exports = WindowManagerWindows;