/**
 * NativeWindowActivator - Activation native avec détection de handle en temps réel
 * Trouve et active la bonne fenêtre par titre/processus
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
    console.log('NativeWindowActivator: Initialized with REAL-TIME handle detection');
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
        'SetActiveWindow': ['bool', [voidPtr]],
        'GetWindowThreadProcessId': ['uint32', [voidPtr, 'uint32*']],
        'AttachThreadInput': ['bool', ['uint32', 'uint32', 'bool']],
        'GetCurrentThreadId': ['uint32', []]
      });
      
      this.isNativeAvailable = true;
      console.log('NativeWindowActivator: Native FFI loaded ✅');
      
    } catch (error) {
      console.log('NativeWindowActivator: FFI not available, using PowerShell');
      this.isNativeAvailable = false;
    }
  }

  /**
   * MÉTHODE PRINCIPALE - Trouve et active la fenêtre
   */
  async activateWindow(windowId) {
    const startTime = Date.now();
    
    try {
      this.stats.activations++;
      
      console.log(`NativeWindowActivator: Finding and activating window ${windowId}`);
      
      // 1. Trouver le handle actuel de la fenêtre
      const currentHandle = await this.findCurrentWindowHandle(windowId);
      
      if (!currentHandle) {
        console.error(`NativeWindowActivator: Could not find window ${windowId}`);
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
   * Trouve le handle actuel d'une fenêtre par son ID
   */
  async findCurrentWindowHandle(windowId) {
    try {
      // Extraire les infos du windowId (format: character_class_pid)
      const parts = windowId.split('_');
      if (parts.length < 3) {
        console.warn(`NativeWindowActivator: Invalid windowId format: ${windowId}`);
        return null;
      }
      
      const character = parts[0];
      const dofusClass = parts[1];
      const pid = parts[2];
      
      console.log(`NativeWindowActivator: Looking for window - Character: ${character}, Class: ${dofusClass}, PID: ${pid}`);
      
      // Chercher la fenêtre par processus ET titre
      const command = `powershell.exe -NoProfile -Command "
        Get-Process | Where-Object { 
          $_.Id -eq ${pid} -and 
          $_.MainWindowHandle -ne 0 -and 
          $_.MainWindowTitle -ne '' 
        } | ForEach-Object { 
          [PSCustomObject]@{ 
            Handle = $_.MainWindowHandle.ToInt64(); 
            Title = $_.MainWindowTitle; 
            PID = $_.Id 
          } 
        } | ConvertTo-Json -Compress"`;
      
      const { stdout } = await execAsync(command, {
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      if (!stdout || stdout.trim() === '' || stdout.trim() === '[]') {
        console.warn(`NativeWindowActivator: No window found for PID ${pid}`);
        return null;
      }
      
      const result = JSON.parse(stdout.trim());
      const windows = Array.isArray(result) ? result : [result];
      
      // Trouver la fenêtre qui correspond à notre personnage
      for (const window of windows) {
        if (window.Title && window.Title.toLowerCase().includes(character.toLowerCase())) {
          console.log(`NativeWindowActivator: Found matching window: "${window.Title}" with handle ${window.Handle}`);
          return window.Handle;
        }
      }
      
      // Si pas de correspondance exacte, prendre la première fenêtre du processus
      if (windows.length > 0) {
        console.log(`NativeWindowActivator: Using first window of process: "${windows[0].Title}" with handle ${windows[0].Handle}`);
        return windows[0].Handle;
      }
      
      return null;
      
    } catch (error) {
      console.error('NativeWindowActivator: Error finding window handle:', error.message);
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
      
      const psScript = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            [DllImport("user32.dll")]
            public static extern bool BringWindowToTop(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool IsWindow(IntPtr hWnd);
          }
"@
        
        $hwnd = [IntPtr]${handle}
        
        if (-not [Win32]::IsWindow($hwnd)) {
          Write-Output "false"
          exit
        }
        
        [Win32]::ShowWindow($hwnd, 9) | Out-Null
        [Win32]::BringWindowToTop($hwnd) | Out-Null
        $result = [Win32]::SetForegroundWindow($hwnd)
        
        Write-Output $result.ToString().ToLower()
      `;
      
      const { stdout } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`, {
        timeout: 3000,
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
        timeout: 2000,
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
      method: 'Real-time handle detection + Native activation'
    };
  }

  /**
   * Nettoyage
   */
  cleanup() {
    this.handleCache.clear();
    console.log('NativeWindowActivator: Cleanup completed');
    console.log('Final stats:', this.getStats());
  }
}

module.exports = NativeWindowActivator;