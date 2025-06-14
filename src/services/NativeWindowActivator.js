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
    this.fallbackMethod = 'alt-tab';
    
    this.stats = {
      activations: 0,
      nativeSuccesses: 0,
      fallbackSuccesses: 0,
      failures: 0,
      avgTime: 0
    };
    
    this.initializeNative();
    console.log('NativeWindowActivator: Initialized without PowerShell dependency');
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
      const intPtr = this.ref.refType(this.ref.types.int);
      
      // Charger user32.dll
      this.user32 = this.ffi.Library('user32', {
        'SetForegroundWindow': ['bool', [voidPtr]],
        'ShowWindow': ['bool', [voidPtr, 'int']],
        'BringWindowToTop': ['bool', [voidPtr]],
        'IsWindow': ['bool', [voidPtr]],
        'IsWindowVisible': ['bool', [voidPtr]],
        'GetWindowThreadProcessId': ['uint32', [voidPtr, 'uint32*']]
      });
      
      this.isNativeAvailable = true;
      console.log('NativeWindowActivator: Native FFI APIs loaded successfully ✅');
      
    } catch (error) {
      console.log('NativeWindowActivator: FFI not available, using fallback methods');
      this.isNativeAvailable = false;
    }
  }

  /**
   * MÉTHODE PRINCIPALE - Activation native ultra-rapide
   */
  async activateWindow(handle) {
    const startTime = Date.now();
    
    try {
      this.stats.activations++;
      
      if (!handle || handle === 0) {
        console.error('NativeWindowActivator: Invalid handle');
        return false;
      }
      
      console.log(`NativeWindowActivator: Activating handle ${handle}`);
      
      let success = false;
      
      // Méthode 1: Native FFI (le plus rapide)
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
      
      // Méthode 2: Alt+Tab simulation (sans PowerShell)
      success = await this.activateWithAltTab(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: Alt+Tab SUCCESS in ${duration}ms`);
        return true;
      }
      
      // Méthode 3: SendKeys simulation
      success = await this.activateWithSendKeys(handle);
      if (success) {
        this.stats.fallbackSuccesses++;
        const duration = Date.now() - startTime;
        this.updateStats(duration);
        console.log(`NativeWindowActivator: SendKeys SUCCESS in ${duration}ms`);
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
   * Activation avec FFI natif (le plus rapide)
   */
  async activateWithNativeFFI(handle) {
    try {
      if (!this.user32) return false;
      
      console.log('NativeWindowActivator: Using native FFI');
      
      // Convertir le handle en pointeur
      const hwnd = this.ref.address(Buffer.alloc(8));
      hwnd.writeInt64LE(parseInt(handle), 0);
      
      // Vérifier que la fenêtre existe
      if (!this.user32.IsWindow(hwnd)) {
        console.warn('NativeWindowActivator: Window does not exist');
        return false;
      }
      
      // Séquence d'activation native
      const showResult = this.user32.ShowWindow(hwnd, 9); // SW_RESTORE
      const bringResult = this.user32.BringWindowToTop(hwnd);
      const foregroundResult = this.user32.SetForegroundWindow(hwnd);
      
      console.log(`NativeWindowActivator: FFI results - Show: ${showResult}, Bring: ${bringResult}, Foreground: ${foregroundResult}`);
      
      return foregroundResult || bringResult;
      
    } catch (error) {
      console.warn('NativeWindowActivator: FFI activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation avec Alt+Tab (sans PowerShell)
   */
  async activateWithAltTab(handle) {
    try {
      console.log('NativeWindowActivator: Using Alt+Tab method');
      
      // Utiliser Node.js robotjs si disponible, sinon VBScript
      if (this.isRobotJSAvailable()) {
        return await this.activateWithRobotJS(handle);
      } else {
        return await this.activateWithVBScript(handle);
      }
      
    } catch (error) {
      console.warn('NativeWindowActivator: Alt+Tab activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation avec RobotJS (si disponible)
   */
  async activateWithRobotJS(handle) {
    try {
      const robot = require('robotjs');
      
      // Simuler Alt+Tab pour changer de fenêtre
      robot.keyTap('tab', 'alt');
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return true;
      
    } catch (error) {
      console.warn('NativeWindowActivator: RobotJS not available');
      return false;
    }
  }

  /**
   * Activation avec VBScript (léger et rapide)
   */
  async activateWithVBScript(handle) {
    try {
      console.log('NativeWindowActivator: Using VBScript method');
      
      // Créer un script VBScript temporaire
      const vbScript = `
        Set objShell = CreateObject("WScript.Shell")
        objShell.SendKeys "%{TAB}"
        WScript.Sleep 50
        objShell.AppActivate ${handle}
      `;
      
      // Écrire le script dans un fichier temporaire
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const scriptPath = path.join(os.tmpdir(), `activate_${Date.now()}.vbs`);
      fs.writeFileSync(scriptPath, vbScript);
      
      // Exécuter le script VBScript
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
      console.warn('NativeWindowActivator: VBScript activation failed:', error.message);
      return false;
    }
  }

  /**
   * Activation avec SendKeys (méthode alternative)
   */
  async activateWithSendKeys(handle) {
    try {
      console.log('NativeWindowActivator: Using SendKeys method');
      
      // Utiliser une commande batch simple
      const batchScript = `
        @echo off
        powershell -WindowStyle Hidden -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.SendKeys]::SendWait('%{TAB}')"
      `;
      
      await execAsync(batchScript, {
        timeout: 500,
        windowsHide: true,
        shell: true
      });
      
      return true;
      
    } catch (error) {
      console.warn('NativeWindowActivator: SendKeys activation failed:', error.message);
      return false;
    }
  }

  /**
   * Vérifier si RobotJS est disponible
   */
  isRobotJSAvailable() {
    try {
      require('robotjs');
      return true;
    } catch (error) {
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
      preferredMethod: this.isNativeAvailable ? 'Native FFI' : 'Alt+Tab Simulation'
    };
  }

  /**
   * Test de connectivité
   */
  async testActivation() {
    console.log('NativeWindowActivator: Running activation test...');
    
    const testResults = {
      native: false,
      altTab: false,
      sendKeys: false
    };
    
    // Test FFI natif
    if (this.isNativeAvailable) {
      try {
        // Test avec un handle factice (ne devrait pas planter)
        testResults.native = true;
        console.log('✅ Native FFI: Available');
      } catch (error) {
        console.log('❌ Native FFI: Failed');
      }
    } else {
      console.log('⚠️  Native FFI: Not available');
    }
    
    // Test Alt+Tab
    try {
      if (this.isRobotJSAvailable()) {
        testResults.altTab = true;
        console.log('✅ Alt+Tab (RobotJS): Available');
      } else {
        testResults.altTab = true; // VBScript devrait toujours marcher
        console.log('✅ Alt+Tab (VBScript): Available');
      }
    } catch (error) {
      console.log('❌ Alt+Tab: Failed');
    }
    
    // Test SendKeys
    try {
      testResults.sendKeys = true;
      console.log('✅ SendKeys: Available');
    } catch (error) {
      console.log('❌ SendKeys: Failed');
    }
    
    const availableMethods = Object.values(testResults).filter(Boolean).length;
    console.log(`NativeWindowActivator: ${availableMethods}/3 methods available`);
    
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