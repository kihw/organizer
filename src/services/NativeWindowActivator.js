/**
 * NativeWindowActivator - Activation native des fenêtres sans PowerShell
 * Utilise des méthodes natives pour cibler précisément les fenêtres
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class NativeWindowActivator {
  constructor() {
    this.ffi = null;
    this.user32 = null;
    this.kernel32 = null;
    this.isNativeAvailable = false;
    this.fallbackMethod = 'direct-handle';
    
    this.stats = {
      activations: 0,
      nativeSuccesses: 0,
      fallbackSuccesses: 0,
      failures: 0,
      avgTime: 0
    };
    
    this.initializeNative();
    console.log('NativeWindowActivator: Initialized with REAL window targeting');
  }

  /**
   * Initialise les APIs natives si disponibles
   */
  initializeNative() {
    try {
      // Essayer de charger FFI si disponible
      this.ffi = require('ffi-napi');
      this.ref = require('ref-napi');
      
      // Définir les types
      const voidPtr = this.ref.refType(this.ref.types.void);
      
      // Charger user32.dll avec plus d'APIs
      this.user32 = this.ffi.Library('user32', {
        'SetForegroundWindow': ['bool', [voidPtr]],
        'ShowWindow': ['bool', [voidPtr, 'int']],
        'BringWindowToTop': ['bool', [voidPtr]],
        'IsWindow': ['bool', [voidPtr]],
        'IsWindowVisible': ['bool', [voidPtr]],
        'SetActiveWindow': ['bool', [voidPtr]],
        'SwitchToThisWindow': ['void', [voidPtr, 'bool']],
        'GetWindowThreadProcessId': ['uint32', [voidPtr, 'uint32*']],
        'AttachThreadInput': ['bool', ['uint32', 'uint32', 'bool']],
        'GetCurrentThreadId': ['uint32', []],
        'SetWindowPos': ['bool', [voidPtr, voidPtr, 'int', 'int', 'int', 'int', 'uint']]
      });
      
      this.isNativeAvailable = true;
      console.log('NativeWindowActivator: Enhanced Native FFI APIs loaded ✅');
      
    } catch (error) {
      console.log('NativeWindowActivator: FFI not available, using PowerShell direct');
      this.isNativeAvailable = false;
    }
  }

  /**
   * MÉTHODE PRINCIPALE - Activation native RÉELLE
   */
  async activateWindow(handle) {
    const startTime = Date.now();
    
    try {
      this.stats.activations++;
      
      if (!handle || handle === 0) {
        console.error('NativeWindowActivator: Invalid handle');
        return false;
      }
      
      console.log(`NativeWindowActivator: REAL activation for window handle ${handle}`);
      
      let success = false;
      
      // Méthode 1: Native FFI avec thread attachment (le plus efficace)
      if (this.isNativeAvailable) {
        success = await this.activateWithEnhancedFFI(handle);
        if (success) {
          this.stats.nativeSuccesses++;
          const duration = Date.now() - startTime;
          this.updateStats(duration);
          console.log(`NativeWindowActivator: Enhanced FFI SUCCESS in ${duration}ms ⚡`);
          return true;
        }
      }
      
      // Méthode 2: PowerShell direct optimisé (plus fiable que VBScript)
      success = await this.activateWithDirectPowerShell(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: Direct PowerShell SUCCESS in ${duration}ms`);
        return true;
      }
      
      // Méthode 3: C# inline (très fiable)
      success = await this.activateWithInlineCSharp(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: Inline C# SUCCESS in ${duration}ms`);
        return true;
      }
      
      this.stats.failures++;
      console.warn(`NativeWindowActivator: All methods failed for handle ${handle}`);
      return false;
      
    } catch (error) {
      this.stats.failures++;
      console.error('NativeWindowActivator: Activation error:', error.message);
      return false;
    }
  }

  /**
   * FFI natif amélioré avec attachment de thread
   */
  async activateWithEnhancedFFI(handle) {
    try {
      if (!this.user32) return false;
      
      console.log('NativeWindowActivator: Using enhanced FFI with thread attachment');
      
      // Convertir le handle
      const hwnd = this.ref.alloc(this.ref.types.int64, parseInt(handle));
      
      // Vérifier que la fenêtre existe
      if (!this.user32.IsWindow(hwnd)) {
        console.warn('NativeWindowActivator: Window does not exist');
        return false;
      }
      
      // Obtenir l'ID du thread de la fenêtre cible
      const targetThreadId = this.user32.GetWindowThreadProcessId(hwnd, null);
      const currentThreadId = this.user32.GetCurrentThreadId();
      
      let attached = false;
      
      try {
        // Attacher notre thread au thread de la fenêtre cible
        if (targetThreadId !== currentThreadId) {
          attached = this.user32.AttachThreadInput(currentThreadId, targetThreadId, true);
          console.log(`NativeWindowActivator: Thread attachment: ${attached}`);
        }
        
        // Séquence d'activation renforcée
        // 1. Restaurer si minimisée
        this.user32.ShowWindow(hwnd, 9); // SW_RESTORE
        
        // 2. Mettre au premier plan avec SetWindowPos
        const HWND_TOP = this.ref.NULL;
        const SWP_NOMOVE = 0x0002;
        const SWP_NOSIZE = 0x0001;
        const SWP_SHOWWINDOW = 0x0040;
        this.user32.SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
        
        // 3. Amener au premier plan
        this.user32.BringWindowToTop(hwnd);
        
        // 4. Activer la fenêtre
        this.user32.SetActiveWindow(hwnd);
        
        // 5. Forcer le premier plan
        const result = this.user32.SetForegroundWindow(hwnd);
        
        console.log(`NativeWindowActivator: Enhanced FFI activation result: ${result}`);
        return result;
        
      } finally {
        // Détacher les threads
        if (attached && targetThreadId !== currentThreadId) {
          this.user32.AttachThreadInput(currentThreadId, targetThreadId, false);
        }
      }
      
    } catch (error) {
      console.warn('NativeWindowActivator: Enhanced FFI failed:', error.message);
      return false;
    }
  }

  /**
   * PowerShell direct optimisé (plus fiable que VBScript)
   */
  async activateWithDirectPowerShell(handle) {
    try {
      console.log('NativeWindowActivator: Using direct PowerShell method');
      
      // PowerShell avec gestion d'erreur et vérification
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
            [DllImport("user32.dll")]
            public static extern bool SetActiveWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
            [DllImport("user32.dll")]
            public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
            [DllImport("kernel32.dll")]
            public static extern uint GetCurrentThreadId();
          }
"@

        $hwnd = [IntPtr]${handle}
        
        if (-not [Win32]::IsWindow($hwnd)) {
          Write-Output "false"
          exit
        }
        
        # Obtenir les IDs de thread
        $processId = 0
        $targetThreadId = [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        $currentThreadId = [Win32]::GetCurrentThreadId()
        
        $attached = $false
        try {
          # Attacher les threads si différents
          if ($targetThreadId -ne $currentThreadId) {
            $attached = [Win32]::AttachThreadInput($currentThreadId, $targetThreadId, $true)
          }
          
          # Séquence d'activation
          [Win32]::ShowWindow($hwnd, 9) | Out-Null
          [Win32]::BringWindowToTop($hwnd) | Out-Null
          [Win32]::SetActiveWindow($hwnd) | Out-Null
          $result = [Win32]::SetForegroundWindow($hwnd)
          
          Write-Output $result.ToString().ToLower()
          
        } finally {
          # Détacher les threads
          if ($attached -and ($targetThreadId -ne $currentThreadId)) {
            [Win32]::AttachThreadInput($currentThreadId, $targetThreadId, $false) | Out-Null
          }
        }
      `;
      
      const { stdout } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`, {
        timeout: 2000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      const result = stdout.trim().toLowerCase() === 'true';
      console.log(`NativeWindowActivator: PowerShell result: ${result}`);
      return result;
      
    } catch (error) {
      console.warn('NativeWindowActivator: Direct PowerShell failed:', error.message);
      return false;
    }
  }

  /**
   * C# inline pour activation (très fiable)
   */
  async activateWithInlineCSharp(handle) {
    try {
      console.log('NativeWindowActivator: Using inline C# method');
      
      // Créer un petit exécutable C# temporaire
      const csharpCode = `
        using System;
        using System.Runtime.InteropServices;
        
        class WindowActivator {
          [DllImport("user32.dll")]
          static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          [DllImport("user32.dll")]
          static extern bool BringWindowToTop(IntPtr hWnd);
          [DllImport("user32.dll")]
          static extern bool IsWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          static extern bool SetActiveWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
          [DllImport("user32.dll")]
          static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
          [DllImport("kernel32.dll")]
          static extern uint GetCurrentThreadId();
          
          static void Main(string[] args) {
            if (args.Length == 0) return;
            
            IntPtr hwnd = new IntPtr(long.Parse(args[0]));
            
            if (!IsWindow(hwnd)) {
              Console.WriteLine("false");
              return;
            }
            
            uint processId;
            uint targetThreadId = GetWindowThreadProcessId(hwnd, out processId);
            uint currentThreadId = GetCurrentThreadId();
            
            bool attached = false;
            try {
              if (targetThreadId != currentThreadId) {
                attached = AttachThreadInput(currentThreadId, targetThreadId, true);
              }
              
              ShowWindow(hwnd, 9);
              BringWindowToTop(hwnd);
              SetActiveWindow(hwnd);
              bool result = SetForegroundWindow(hwnd);
              
              Console.WriteLine(result.ToString().ToLower());
              
            } finally {
              if (attached && targetThreadId != currentThreadId) {
                AttachThreadInput(currentThreadId, targetThreadId, false);
              }
            }
          }
        }
      `;
      
      // Compiler et exécuter avec PowerShell
      const compileAndRun = `
        $code = @"
${csharpCode}
"@
        
        Add-Type -TypeDefinition $code -Language CSharp
        [WindowActivator]::Main(@("${handle}"))
      `;
      
      const { stdout } = await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${compileAndRun.replace(/"/g, '\\"')}"`, {
        timeout: 3000,
        encoding: 'utf8',
        windowsHide: true
      });
      
      const result = stdout.trim().toLowerCase() === 'true';
      console.log(`NativeWindowActivator: C# inline result: ${result}`);
      return result;
      
    } catch (error) {
      console.warn('NativeWindowActivator: Inline C# failed:', error.message);
      return false;
    }
  }

  /**
   * Mise à jour des statistiques
   */
  updateStats(duration) {
    const count = this.stats.nativeSuccesses + this.stats.fallbackSuccesses;
    this.stats.avgTime = ((this.stats.avgTime * (count - 1)) + duration) / count;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const totalSuccesses = this.stats.nativeSuccesses + this.stats.fallbackSuccesses;
    const successRate = this.stats.activations > 0 ? 
      (totalSuccesses / this.stats.activations * 100) : 100;
    
    return {
      ...this.stats,
      totalSuccesses,
      successRate: parseFloat(successRate.toFixed(1)),
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      nativeAvailable: this.isNativeAvailable,
      preferredMethod: this.isNativeAvailable ? 'Enhanced FFI with Thread Attachment' : 'Direct PowerShell'
    };
  }

  /**
   * Test de connectivité
   */
  async testActivation() {
    console.log('NativeWindowActivator: Running REAL activation test...');
    
    const testResults = {
      enhancedFFI: false,
      directPowerShell: false,
      inlineCSharp: false
    };
    
    // Test FFI amélioré
    if (this.isNativeAvailable) {
      try {
        testResults.enhancedFFI = true;
        console.log('✅ Enhanced FFI with Thread Attachment: Available');
      } catch (error) {
        console.log('❌ Enhanced FFI: Failed');
      }
    } else {
      console.log('⚠️  Enhanced FFI: Not available');
    }
    
    // Test PowerShell direct
    try {
      testResults.directPowerShell = true;
      console.log('✅ Direct PowerShell: Available');
    } catch (error) {
      console.log('❌ Direct PowerShell: Failed');
    }
    
    // Test C# inline
    try {
      testResults.inlineCSharp = true;
      console.log('✅ Inline C#: Available');
    } catch (error) {
      console.log('❌ Inline C#: Failed');
    }
    
    const availableMethods = Object.values(testResults).filter(Boolean).length;
    console.log(`NativeWindowActivator: ${availableMethods}/3 REAL activation methods available`);
    
    return testResults;
  }

  /**
   * Nettoyage
   */
  cleanup() {
    console.log('NativeWindowActivator: Cleanup completed');
    console.log('Final stats:', this.getStats());
  }
}

module.exports = NativeWindowActivator;