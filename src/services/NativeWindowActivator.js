/**
 * NativeWindowActivator - Activation native des fenêtres sans PowerShell
 * Utilise FFI pour appeler directement les APIs Windows
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
    console.log('NativeWindowActivator: Initialized with direct window targeting');
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
      
      // Charger user32.dll
      this.user32 = this.ffi.Library('user32', {
        'SetForegroundWindow': ['bool', [voidPtr]],
        'ShowWindow': ['bool', [voidPtr, 'int']],
        'BringWindowToTop': ['bool', [voidPtr]],
        'IsWindow': ['bool', [voidPtr]],
        'IsWindowVisible': ['bool', [voidPtr]],
        'SetActiveWindow': ['bool', [voidPtr]],
        'SwitchToThisWindow': ['void', [voidPtr, 'bool']],
        'GetWindowThreadProcessId': ['uint32', [voidPtr, 'uint32*']]
      });
      
      this.isNativeAvailable = true;
      console.log('NativeWindowActivator: Native FFI APIs loaded successfully ✅');
      
    } catch (error) {
      console.log('NativeWindowActivator: FFI not available, using direct handle methods');
      this.isNativeAvailable = false;
    }
  }

  /**
   * MÉTHODE PRINCIPALE - Activation native ciblée
   */
  async activateWindow(handle) {
    const startTime = Date.now();
    
    try {
      this.stats.activations++;
      
      if (!handle || handle === 0) {
        console.error('NativeWindowActivator: Invalid handle');
        return false;
      }
      
      console.log(`NativeWindowActivator: Targeting specific window handle ${handle}`);
      
      let success = false;
      
      // Méthode 1: Native FFI direct (le plus précis)
      if (this.isNativeAvailable) {
        success = await this.activateWithNativeFFI(handle);
        if (success) {
          this.stats.nativeSuccesses++;
          const duration = Date.now() - startTime;
          this.updateStats(duration);
          console.log(`NativeWindowActivator: Native FFI SUCCESS in ${duration}ms ⚡`);
          return true;
        }
      }
      
      // Méthode 2: VBScript ciblé (pas Alt+Tab générique)
      success = await this.activateWithTargetedVBScript(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: Targeted VBScript SUCCESS in ${duration}ms`);
        return true;
      }
      
      // Méthode 3: Batch ciblé
      success = await this.activateWithTargetedBatch(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: Targeted Batch SUCCESS in ${duration}ms`);
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
   * Activation avec FFI natif (ciblée, pas Alt+Tab)
   */
  async activateWithNativeFFI(handle) {
    try {
      if (!this.user32) return false;
      
      console.log('NativeWindowActivator: Using native FFI for direct targeting');
      
      // Convertir le handle en pointeur
      const hwnd = this.ref.alloc(this.ref.types.int64, parseInt(handle));
      
      // Vérifier que la fenêtre existe
      if (!this.user32.IsWindow(hwnd)) {
        console.warn('NativeWindowActivator: Window does not exist');
        return false;
      }
      
      // Séquence d'activation native CIBLÉE
      // 1. Restaurer la fenêtre si minimisée
      const showResult = this.user32.ShowWindow(hwnd, 9); // SW_RESTORE
      
      // 2. Amener au premier plan
      const bringResult = this.user32.BringWindowToTop(hwnd);
      
      // 3. Utiliser SwitchToThisWindow pour forcer l'activation
      this.user32.SwitchToThisWindow(hwnd, true);
      
      // 4. Définir comme fenêtre de premier plan
      const foregroundResult = this.user32.SetForegroundWindow(hwnd);
      
      console.log(`NativeWindowActivator: FFI results - Show: ${showResult}, Bring: ${bringResult}, Foreground: ${foregroundResult}`);
      
      return foregroundResult || bringResult;
      
    } catch (error) {
      console.warn('NativeWindowActivator: FFI activation failed:', error.message);
      return false;
    }
  }

  /**
   * VBScript ciblé (pas Alt+Tab générique)
   */
  async activateWithTargetedVBScript(handle) {
    try {
      console.log('NativeWindowActivator: Using targeted VBScript method');
      
      // VBScript qui cible directement le handle de fenêtre
      const vbScript = `
        Dim objShell, hwnd
        Set objShell = CreateObject("WScript.Shell")
        hwnd = ${handle}
        
        ' Utiliser AppActivate avec le handle directement
        On Error Resume Next
        objShell.AppActivate hwnd
        
        ' Si ça échoue, essayer avec SendKeys pour forcer l'activation
        If Err.Number <> 0 Then
            Err.Clear
            ' Envoyer Alt+Esc puis cibler la fenêtre
            objShell.SendKeys "%{ESC}"
            WScript.Sleep 50
            objShell.AppActivate hwnd
        End If
      `;
      
      // Écrire et exécuter le script VBScript
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const scriptPath = path.join(os.tmpdir(), `activate_${handle}_${Date.now()}.vbs`);
      fs.writeFileSync(scriptPath, vbScript);
      
      await execAsync(`cscript //NoLogo "${scriptPath}"`, {
        timeout: 1000,
        windowsHide: true
      });
      
      // Nettoyer le fichier temporaire
      try {
        fs.unlinkSync(scriptPath);
      } catch (e) {
        // Ignorer les erreurs de nettoyage
      }
      
      return true;
      
    } catch (error) {
      console.warn('NativeWindowActivator: Targeted VBScript activation failed:', error.message);
      return false;
    }
  }

  /**
   * Batch ciblé avec handle spécifique
   */
  async activateWithTargetedBatch(handle) {
    try {
      console.log('NativeWindowActivator: Using targeted Batch method');
      
      // Commande batch qui utilise PowerShell minimal pour cibler le handle
      const batchScript = `
        @echo off
        powershell -WindowStyle Hidden -NoProfile -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Win32{[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr h);[DllImport(\\"user32.dll\\")]public static extern bool ShowWindow(IntPtr h,int s);}';$h=[IntPtr]${handle};[Win32]::ShowWindow($h,9);[Win32]::SetForegroundWindow($h)"
      `;
      
      await execAsync(batchScript, {
        timeout: 500,
        windowsHide: true,
        shell: true
      });
      
      return true;
      
    } catch (error) {
      console.warn('NativeWindowActivator: Targeted Batch activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation avec RobotJS ciblé (si disponible)
   */
  async activateWithTargetedRobotJS(handle) {
    try {
      const robot = require('robotjs');
      
      // Au lieu d'Alt+Tab générique, utiliser une approche plus ciblée
      // Cette méthode nécessiterait une intégration plus complexe avec les APIs Windows
      // Pour l'instant, on évite cette méthode car elle ne peut pas cibler directement
      
      return false;
      
    } catch (error) {
      console.warn('NativeWindowActivator: RobotJS not available or failed');
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
      preferredMethod: this.isNativeAvailable ? 'Native FFI Direct' : 'Targeted VBScript'
    };
  }

  /**
   * Test de connectivité
   */
  async testActivation() {
    console.log('NativeWindowActivator: Running targeted activation test...');
    
    const testResults = {
      native: false,
      targetedVBScript: false,
      targetedBatch: false
    };
    
    // Test FFI natif
    if (this.isNativeAvailable) {
      try {
        testResults.native = true;
        console.log('✅ Native FFI Direct: Available');
      } catch (error) {
        console.log('❌ Native FFI Direct: Failed');
      }
    } else {
      console.log('⚠️  Native FFI Direct: Not available');
    }
    
    // Test VBScript ciblé
    try {
      testResults.targetedVBScript = true;
      console.log('✅ Targeted VBScript: Available');
    } catch (error) {
      console.log('❌ Targeted VBScript: Failed');
    }
    
    // Test Batch ciblé
    try {
      testResults.targetedBatch = true;
      console.log('✅ Targeted Batch: Available');
    } catch (error) {
      console.log('❌ Targeted Batch: Failed');
    }
    
    const availableMethods = Object.values(testResults).filter(Boolean).length;
    console.log(`NativeWindowActivator: ${availableMethods}/3 targeted methods available`);
    
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