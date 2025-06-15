/**
 * NativeWindowActivator - FIXED VERSION - Activation native avec détection dynamique du PID
 * FIX: Improved process detection and window title matching for Steamer/Boulonix clients
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class NativeWindowActivator {
  constructor() {
    this.ffi = null;
    this.user32 = null;
    this.isNativeAvailable = false;
    this.handleCache = new Map();

    this.stats = {
      activations: 0,
      successes: 0,
      failures: 0,
      avgTime: 0
    };

    this.initializeNative();
    console.log('NativeWindowActivator: Initialized with ENHANCED dynamic PID detection');
  }

  /**
   * Initialise les APIs natives si disponibles
   */
  initializeNative() {
    try {
      this.ffi = require('ffi-napi');
      this.ref = require('ref-napi');

      const voidPtr = this.ref.refType(this.ref.types.void);

      this.user32 = this.ffi.Library('user32', {
        'SetForegroundWindow': ['bool', [voidPtr]],
        'ShowWindow': ['bool', [voidPtr, 'int']],
        'BringWindowToTop': ['bool', [voidPtr]],
        'IsWindow': ['bool', [voidPtr]],
        'SetActiveWindow': ['bool', [voidPtr]]
      });

      this.isNativeAvailable = true;
      console.log('NativeWindowActivator: Native FFI loaded ✅');

    } catch (error) {
      console.log('NativeWindowActivator: FFI not available, using enhanced PowerShell');
      this.isNativeAvailable = false;
    }
  }

  /**
   * MÉTHODE PRINCIPALE - FIXED - Trouve et active la fenêtre
   */
  async activateWindow(windowId) {
    const startTime = Date.now();

    try {
      this.stats.activations++;

      console.log(`NativeWindowActivator: ENHANCED finding and activating window ${windowId}`);

      // FIXED: Use enhanced window detection that works with current processes
      const currentHandle = await this.findCurrentWindowHandleEnhanced(windowId);

      if (!currentHandle) {
        console.error(`NativeWindowActivator: Could not find window ${windowId} with enhanced detection`);
        this.stats.failures++;
        return false;
      }

      console.log(`NativeWindowActivator: Found current handle ${currentHandle} for ${windowId}`);

      // 2. Activer avec le bon handle
      const success = await this.activateByHandle(currentHandle);

      const duration = Date.now() - startTime;
      this.updateStats(duration, success);

      if (success) {
        console.log(`NativeWindowActivator: SUCCESS for ${windowId} in ${duration}ms ⚡`);
        this.stats.successes++;
        return true;
      } else {
        console.warn(`NativeWindowActivator: FAILED for ${windowId} in ${duration}ms`);
        this.stats.failures++;
        return false;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('NativeWindowActivator: Error:', error.message);
      this.stats.failures++;
      return false;
    }
  }

  /**
   * FIXED: Enhanced window detection that works with Steamer/Boulonix
   */
  async findCurrentWindowHandleEnhanced(windowId) {
    try {
      // Extract character and class from windowId
      const parts = windowId.split('_');
      if (parts.length < 3) {
        console.warn(`NativeWindowActivator: Invalid windowId format: ${windowId}`);
        return null;
      }

      const character = parts[0];
      const dofusClass = parts[1];
      const originalPid = parts[2];

      console.log(`NativeWindowActivator: ENHANCED search - Character: ${character}, Class: ${dofusClass}, Original PID: ${originalPid}`);

      // STEP 1: Try by window title first (most reliable for current processes)
      let handle = await this.findByWindowTitleEnhanced(character, dofusClass);
      if (handle) {
        console.log(`NativeWindowActivator: Found by enhanced title search`);
        return handle;
      }

      // STEP 2: Try broader process search with Java processes included
      handle = await this.findByProcessNameEnhanced(character, dofusClass);
      if (handle) {
        console.log(`NativeWindowActivator: Found by enhanced process search`);
        return handle;
      }

      // STEP 3: Try direct window enumeration (most comprehensive)
      handle = await this.findByWindowEnumeration(character, dofusClass);
      if (handle) {
        console.log(`NativeWindowActivator: Found by window enumeration`);
        return handle;
      }

      console.warn(`NativeWindowActivator: Could not find window for ${character} with any enhanced method`);
      return null;

    } catch (error) {
      console.error('NativeWindowActivator: Error in enhanced window detection:', error.message);
      return null;
    }
  }

  /**
   * FIXED: Enhanced window title search
   */
  async findByWindowTitleEnhanced(character, dofusClass) {
    try {
      console.log(`NativeWindowActivator: Enhanced title search for "${character}" and "${dofusClass}"`);

      // More flexible title matching that works with Steamer format
      const command = `powershell.exe -NoProfile -Command "
        Get-Process | Where-Object { 
          $_.MainWindowHandle -ne 0 -and 
          $_.MainWindowTitle -ne '' -and
          (
            $_.MainWindowTitle -match '${character}.*-.*${dofusClass}' -or
            $_.MainWindowTitle -match '${character}.*${dofusClass}' -or
            $_.MainWindowTitle -match '${character}' -and $_.MainWindowTitle -match '${dofusClass}' -or
            $_.MainWindowTitle -match '${character}.*-.*[Ss]teamer' -or
            $_.MainWindowTitle -match '${character}.*[Bb]oulonix'
          )
        } | Select-Object -First 1 | ForEach-Object { 
          [PSCustomObject]@{ 
            Handle = $_.MainWindowHandle.ToInt64(); 
            Title = $_.MainWindowTitle; 
            PID = $_.Id;
            ProcessName = $_.ProcessName
          } 
        } | ConvertTo-Json -Compress"`;

      const { stdout } = await execAsync(command, {
        timeout: 3000,
        encoding: 'utf8',
        windowsHide: true
      });

      if (!stdout || stdout.trim() === '' || stdout.trim() === '[]') {
        console.log(`NativeWindowActivator: No window found by enhanced title search`);
        return null;
      }

      const result = JSON.parse(stdout.trim());
      const window = Array.isArray(result) ? result[0] : result;

      if (window && window.Handle) {
        console.log(`NativeWindowActivator: Enhanced title match found: "${window.Title}" (PID: ${window.PID}, Process: ${window.ProcessName})`);
        return window.Handle;
      }

      return null;

    } catch (error) {
      console.warn(`NativeWindowActivator: Enhanced title search failed:`, error.message);
      return null;
    }
  }

  /**
   * Enhanced process name search
   */
  async findByProcessNameEnhanced(character, dofusClass) {
    try {
      console.log(`NativeWindowActivator: Enhanced process search for "${character}" and "${dofusClass}"`);

      // Much broader search that includes Java processes and any process with game windows
      const command = `powershell.exe -NoProfile -Command "
      Get-Process | Where-Object { 
        (
          $_.ProcessName -like '*java*' -or 
          $_.ProcessName -like '*dofus*' -or 
          $_.ProcessName -like '*steamer*' -or 
          $_.ProcessName -like '*boulonix*' -or
          $_.ProcessName -like '*javaw*' -or
          $_.ProcessName -eq 'java' -or
          $_.MainWindowTitle -match '[Dd]ofus|[Ss]teamer|[Bb]oulonix'
        ) -and
        $_.MainWindowHandle -ne 0 -and 
        $_.MainWindowTitle -ne '' -and
        $_.MainWindowTitle -match '${character}'
      } | ForEach-Object { 
        [PSCustomObject]@{ 
          Handle = $_.MainWindowHandle.ToInt64(); 
          Title = $_.MainWindowTitle; 
          PID = $_.Id;
          ProcessName = $_.ProcessName
        } 
      } | ConvertTo-Json -Compress"`;

      const { stdout } = await execAsync(command, {
        timeout: 4000,
        encoding: 'utf8',
        windowsHide: true
      });

      if (!stdout || stdout.trim() === '' || stdout.trim() === '[]') {
        console.log(`NativeWindowActivator: No processes found by enhanced search`);
        return null;
      }

      const result = JSON.parse(stdout.trim());
      const windows = Array.isArray(result) ? result : [result];

      console.log(`NativeWindowActivator: Found ${windows.length} potential windows by enhanced process search`);

      // Find the best match
      for (const window of windows) {
        const title = window.Title.toLowerCase();
        const charLower = character.toLowerCase();
        const classLower = dofusClass.toLowerCase();

        if (title.includes(charLower) && (title.includes(classLower) || title.includes('steamer') || title.includes('boulonix'))) {
          console.log(`NativeWindowActivator: Enhanced process match found: "${window.Title}" (PID: ${window.PID}, Process: ${window.ProcessName})`);
          return window.Handle;
        }
      }

      // If no perfect match, take the first one that contains the character
      if (windows.length > 0 && windows[0].Handle) {
        console.log(`NativeWindowActivator: Using first enhanced process match: "${windows[0].Title}"`);
        return windows[0].Handle;
      }

      return null;

    } catch (error) {
      console.warn(`NativeWindowActivator: Enhanced process search failed:`, error.message);
      return null;
    }
  }

  /**
   * NEW: Window enumeration as last resort
   */
  async findByWindowEnumeration(character, dofusClass) {
    try {
      console.log(`NativeWindowActivator: Window enumeration search for "${character}"`);

      // Get ALL windows that have handles and search through their titles
      const command = `powershell.exe -NoProfile -Command "
      Get-Process | Where-Object { 
        $_.MainWindowHandle -ne 0 -and 
        $_.MainWindowTitle -ne ''
      } | ForEach-Object { 
        [PSCustomObject]@{ 
          Handle = $_.MainWindowHandle.ToInt64(); 
          Title = $_.MainWindowTitle; 
          PID = $_.Id;
          ProcessName = $_.ProcessName
        } 
      } | Where-Object {
        $_.Title -match '${character}' -and
        ($_.Title -match '[Dd]ofus|[Ss]teamer|[Bb]oulonix' -or $_.ProcessName -match 'java|dofus')
      } | ConvertTo-Json -Compress"`;

      const { stdout } = await execAsync(command, {
        timeout: 5000,
        encoding: 'utf8',
        windowsHide: true
      });

      if (!stdout || stdout.trim() === '' || stdout.trim() === '[]') {
        console.log(`NativeWindowActivator: No windows found by enumeration`);
        return null;
      }

      const result = JSON.parse(stdout.trim());
      const windows = Array.isArray(result) ? result : [result];

      if (windows.length > 0 && windows[0].Handle) {
        console.log(`NativeWindowActivator: Window enumeration found: "${windows[0].Title}" (PID: ${windows[0].PID})`);
        return windows[0].Handle;
      }

      return null;

    } catch (error) {
      console.warn(`NativeWindowActivator: Window enumeration failed:`, error.message);
      return null;
    }
  }

  /**
   * Active une fenêtre par son handle
   */
  async activateByHandle(handle) {
    if (!handle || handle === 0) {
      return false;
    }

    // Méthode 1: FFI natif si disponible
    if (this.isNativeAvailable) {
      const success = await this.activateWithFFI(handle);
      if (success) {
        console.log('NativeWindowActivator: FFI activation SUCCESS');
        return true;
      }
    }

    // Méthode 2: PowerShell optimisé
    const success = await this.activateWithPowerShell(handle);
    if (success) {
      console.log('NativeWindowActivator: PowerShell activation SUCCESS');
      return true;
    }

    // Méthode 3: Fallback simple
    const fallbackSuccess = await this.activateWithSimplePowerShell(handle);
    if (fallbackSuccess) {
      console.log('NativeWindowActivator: Simple PowerShell activation SUCCESS');
      return true;
    }

    return false;
  }

  /**
   * Activation avec FFI natif
   */
  async activateWithFFI(handle) {
    try {
      if (!this.user32) return false;

      console.log(`NativeWindowActivator: FFI activation for handle ${handle}`);

      // Convertir le handle
      const hwnd = this.ref.alloc(this.ref.types.int64, parseInt(handle));

      // Vérifier que la fenêtre existe
      if (!this.user32.IsWindow(hwnd)) {
        console.warn('NativeWindowActivator: Window does not exist (FFI)');
        return false;
      }

      // Séquence d'activation simple mais efficace
      this.user32.ShowWindow(hwnd, 9); // SW_RESTORE
      this.user32.BringWindowToTop(hwnd);
      this.user32.SetActiveWindow(hwnd);
      const result = this.user32.SetForegroundWindow(hwnd);

      return result;

    } catch (error) {
      console.warn('NativeWindowActivator: FFI activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation avec PowerShell optimisé
   */
  async activateWithPowerShell(handle) {
    try {
      console.log(`NativeWindowActivator: PowerShell activation for handle ${handle}`);

      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport(\\"user32.dll\\")] public static extern bool BringWindowToTop(IntPtr hWnd); [DllImport(\\"user32.dll\\")] public static extern bool IsWindow(IntPtr hWnd); }'
        
        \\$hwnd = [IntPtr]${handle}
        
        if (-not [Win32]::IsWindow(\\$hwnd)) {
          Write-Output 'false'
          exit
        }
        
        [Win32]::ShowWindow(\\$hwnd, 9) | Out-Null
        [Win32]::BringWindowToTop(\\$hwnd) | Out-Null
        \\$result = [Win32]::SetForegroundWindow(\\$hwnd)
        
        Write-Output \\$result.ToString().ToLower()
      "`;

      const { stdout } = await execAsync(command, {
        timeout: 1000, // Reduced timeout for faster response
        encoding: 'utf8',
        windowsHide: true
      });

      const result = stdout.trim().toLowerCase() === 'true';
      return result;

    } catch (error) {
      console.warn('NativeWindowActivator: PowerShell activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation simple en fallback
   */
  async activateWithSimplePowerShell(handle) {
    try {
      console.log(`NativeWindowActivator: Simple PowerShell activation for handle ${handle}`);

      // Méthode très simple mais souvent efficace
      const command = `powershell.exe -NoProfile -Command "
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.Interaction]::AppActivate(${handle})
        Write-Output 'true'
      "`;

      await execAsync(command, {
        timeout: 1000, // Reduced timeout
        encoding: 'utf8',
        windowsHide: true
      });

      return true;

    } catch (error) {
      console.warn('NativeWindowActivator: Simple PowerShell failed:', error.message);
      return false;
    }
  }

  /**
   * Mise à jour des statistiques
   */
  updateStats(duration, success) {
    const count = this.stats.successes + this.stats.failures;
    this.stats.avgTime = ((this.stats.avgTime * (count - 1)) + duration) / count;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const successRate = this.stats.activations > 0 ?
      (this.stats.successes / this.stats.activations * 100) : 100;

    return {
      ...this.stats,
      successRate: parseFloat(successRate.toFixed(1)),
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      nativeAvailable: this.isNativeAvailable,
      method: 'Enhanced dynamic detection + Native activation'
    };
  }

  /**
   * Nettoyage
   */
  cleanup() {
    this.handleCache.clear();
    console.log('NativeWindowActivator: Cleanup completed');
    console.log('Final enhanced stats:', this.getStats());
  }
}

module.exports = NativeWindowActivator;
