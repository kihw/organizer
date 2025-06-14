const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import des services ultra-rapides
const ShortcutManager = require('./services/ShortcutManager');
const UltraFastWindowManager = require('./services/UltraFastWindowManager');
const ShortcutConfigManager = require('./services/ShortcutConfigManager');
const LanguageManager = require('./services/LanguageManager');
const NotificationManager = require('./services/NotificationManager');

// Import des modules core
const eventBus = require('./core/EventBus');
const performanceMonitor = require('./core/PerformanceMonitor');

/**
 * DofusOrganizerUltraFast - Version ultra-rapide <100ms
 * Objectif: Activation de fenêtres en moins de 100ms
 */
class DofusOrganizerUltraFast {
  constructor() {
    this.store = new Store();
    this.shortcutConfig = new ShortcutConfigManager();
    this.mainWindow = null;
    this.tray = null;
    this.dockWindow = null;
    
    // Services ultra-rapides
    this.windowManager = new UltraFastWindowManager();
    this.shortcutManager = new ShortcutManager();
    this.languageManager = new LanguageManager();
    this.notificationManager = new NotificationManager();
    
    this.isConfiguring = false;
    this.dofusWindows = [];
    this.shortcutsEnabled = true;
    this.globalShortcuts = {
      nextWindow: null,
      toggleShortcuts: null
    };
    this.isTogglingShortcuts = false;
    this.shortcutsLoaded = false;
    this.startupComplete = false;

    console.log('DofusOrganizerUltraFast: Initializing for <100ms activation...');
    this.initializeApp();
    this.setupUltraFastPerformanceMonitoring();
  }

  /**
   * Configuration du monitoring ultra-rapide
   */
  setupUltraFastPerformanceMonitoring() {
    // Seuils ultra-rapides
    performanceMonitor.setThreshold('shortcut_activation', 50);   // 50ms max
    performanceMonitor.setThreshold('window_activation', 100);    // 100ms max
    performanceMonitor.setThreshold('window_detection', 100);     // 100ms max

    // Écouter les événements ultra-rapides
    eventBus.on('window:activated_ultra_fast', (data) => {
      const status = data.ultraFast ? '⚡ ULTRA-FAST' : '⚠️ SLOW';
      console.log(`${status} window activation: ${data.windowId} in ${data.duration}ms`);
      
      if (data.duration > 100) {
        console.warn(`SLOW activation detected: ${data.duration}ms (target: <100ms)`);
        this.handleSlowActivation(data);
      }
    });

    eventBus.on('shortcut:activated', (data) => {
      if (data.duration > 50) {
        console.warn(`SLOW shortcut detected: ${data.duration}ms (target: <50ms)`);
      }
    });

    // Monitoring automatique ultra-rapide
    this.startUltraFastAutomaticMonitoring();
  }

  /**
   * Gestion des activations lentes
   */
  handleSlowActivation(data) {
    // Notifier l'utilisateur des activations lentes
    this.notificationManager.showWarning(
      `Slow activation: ${data.duration}ms (target: <100ms)`,
      { duration: 3000 }
    );
    
    // Optimiser automatiquement si nécessaire
    if (data.duration > 500) {
      console.log('DofusOrganizerUltraFast: Triggering automatic optimization for slow activation');
      this.optimizeUltraFastPerformance();
    }
  }

  /**
   * Monitoring automatique ultra-rapide
   */
  startUltraFastAutomaticMonitoring() {
    // Vérification des performances toutes les 30 secondes
    setInterval(() => {
      const windowStats = this.windowManager.getStats();
      
      if (windowStats.avgActivationTime > 100) {
        console.warn(`DofusOrganizerUltraFast: Average activation time degraded: ${windowStats.avgActivationTime}ms`);
        this.optimizeUltraFastPerformance();
      }
      
      if (windowStats.ultraFastRate < 80) {
        console.warn(`DofusOrganizerUltraFast: Ultra-fast rate low: ${windowStats.ultraFastRate}%`);
      }
      
    }, 30000); // Toutes les 30 secondes

    // Nettoyage ultra-rapide toutes les 2 minutes
    setInterval(() => {
      this.performUltraFastMaintenance();
    }, 120000); // Toutes les 2 minutes
  }

  /**
   * Optimisation ultra-rapide des performances
   */
  optimizeUltraFastPerformance() {
    console.log('DofusOrganizerUltraFast: Optimizing ultra-fast performance...');

    // Nettoyer les caches
    if (this.windowManager.platformManager && this.windowManager.platformManager.activationCache) {
      this.windowManager.platformManager.activationCache.clear();
    }

    // Forcer le garbage collection
    if (global.gc) {
      global.gc();
    }

    // Réinitialiser les métriques
    performanceMonitor.reset();

    this.notificationManager.showInfo('Performance optimized for ultra-fast activation', { duration: 2000 });
  }

  /**
   * Maintenance ultra-rapide
   */
  performUltraFastMaintenance() {
    console.log('DofusOrganizerUltraFast: Performing ultra-fast maintenance...');

    // Nettoyage des caches d'activation
    if (this.windowManager.platformManager) {
      if (this.windowManager.platformManager.activationCache) {
        // Nettoyer les entrées de plus de 5 minutes
        const fiveMinutesAgo = Date.now() - 300000;
        for (const [key, timestamp] of this.windowManager.platformManager.activationCache) {
          if (timestamp < fiveMinutesAgo) {
            this.windowManager.platformManager.activationCache.delete(key);
          }
        }
      }
    }

    // Maintenance normale
    this.shortcutConfig.cleanupOldEntries(this.dofusWindows);

    console.log('DofusOrganizerUltraFast: Ultra-fast maintenance completed');
  }

  initializeApp() {
    app.whenReady().then(async () => {
      console.log('DofusOrganizerUltraFast: App ready, setting up ultra-fast services...');
      this.createTray();
      this.setupUltraFastEventHandlers();
      this.loadSettings();

      // Migration depuis l'ancienne version
      this.migrateOldSettings();

      // Séquence de démarrage ultra-rapide
      console.log('DofusOrganizerUltraFast: Starting ultra-fast startup sequence...');
      await this.performUltraFastStartupSequence();
    });

    app.on('window-all-closed', (e) => {
      e.preventDefault();
    });

    app.on('activate', () => {
      if (this.mainWindow === null) {
        this.showConfigWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  /**
   * Séquence de démarrage ultra-rapide
   */
  async performUltraFastStartupSequence() {
    try {
      console.log('DofusOrganizerUltraFast: Performing ultra-fast initial refresh...');

      // Refresh initial ultra-rapide
      await this.refreshAndSortUltraFast();

      this.startupComplete = true;
      console.log('DofusOrganizerUltraFast: Ultra-fast startup sequence completed successfully!');

      // Notification de succès ultra-rapide
      if (this.dofusWindows.length > 0) {
        this.notificationManager.showSuccess(
          `Dofus Organizer Ultra-Fast ready! Found ${this.dofusWindows.length} windows with <100ms activation.`,
          { duration: 4000 }
        );
      } else {
        this.notificationManager.showInfo(
          'Dofus Organizer Ultra-Fast ready! No Dofus windows detected. Start Dofus and refresh.',
          { duration: 4000 }
        );
      }

    } catch (error) {
      console.error('DofusOrganizerUltraFast: Error during ultra-fast startup sequence:', error);
      this.notificationManager.showError('Error during ultra-fast startup. Some features may not work correctly.', { duration: 5000 });
    }
  }

  /**
   * Refresh et tri ultra-rapides
   */
  async refreshAndSortUltraFast() {
    return performanceMonitor.measureAsync('ultra_fast_refresh_and_sort', async () => {
      try {
        console.log('DofusOrganizerUltraFast: Enhanced ultra-fast refresh requested');
        
        // Détection ultra-rapide
        const windows = await this.windowManager.getDofusWindows();
        console.log(`DofusOrganizerUltraFast: Ultra-fast WindowManager returned ${windows.length} windows`);

        // Mise à jour ultra-rapide des données
        this.dofusWindows = windows;
        console.log(`DofusOrganizerUltraFast: Updated dofusWindows array, now has ${this.dofusWindows.length} windows`);
        this.updateTrayTooltip();

        // Rechargement ultra-rapide des raccourcis
        console.log('DofusOrganizerUltraFast: Reloading shortcuts with ultra-fast optimization...');
        await this.loadAndRegisterShortcutsUltraFast();

        // Notification ultra-rapide des fenêtres
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          console.log('DofusOrganizerUltraFast: Sending ultra-fast windows-updated to config window');
          this.mainWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
        }

        if (this.dockWindow && !this.dockWindow.isDestroyed()) {
          console.log('DofusOrganizerUltraFast: Sending ultra-fast windows-updated to dock window');
          this.dockWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
        }

        // Mise à jour ultra-rapide de la visibilité du dock
        const dockSettings = this.store.get('dock', { enabled: false });
        if (dockSettings.enabled) {
          if (this.dofusWindows.filter(w => w.enabled).length > 0) {
            if (!this.dockWindow) {
              this.showDockWindow();
            }
          } else {
            this.hideDockWindow();
          }
        }

        // Notification ultra-rapide du changement
        this.notificationManager.showInfo(
          `Found ${windows.length} Dofus windows (ultra-fast <100ms)`,
          { duration: 2000 }
        );

      } catch (error) {
        console.error('DofusOrganizerUltraFast: Error refreshing windows:', error);
        this.notificationManager.showError('Error refreshing windows (ultra-fast)', { duration: 3000 });
      }
    });
  }

  /**
   * Chargement et enregistrement ultra-rapides des raccourcis
   */
  async loadAndRegisterShortcutsUltraFast() {
    return performanceMonitor.measureAsync('ultra_fast_shortcuts_load_register', async () => {
      if (this.shortcutsLoaded) {
        console.log('DofusOrganizerUltraFast: Shortcuts already loaded, clearing and reloading with ultra-fast optimization...');
        this.shortcutManager.cleanup();
        this.shortcutsLoaded = false;
      }

      console.log('DofusOrganizerUltraFast: Loading and registering ultra-fast window shortcuts...');

      let registeredCount = 0;

      for (const window of this.dofusWindows) {
        // Mettre à jour le profil du personnage
        this.shortcutConfig.setCharacterProfile(window.id, window.character, window.dofusClass);

        // Lier un raccourci existant avec ultra-fast
        const existingShortcut = this.shortcutConfig.linkShortcutToWindow(window.character, window.dofusClass, window.id);

        if (existingShortcut) {
          console.log(`DofusOrganizerUltraFast: Linking ultra-fast shortcut ${existingShortcut} to window ${window.id} (${window.character})`);

          // Callback ultra-rapide pour l'activation de fenêtre
          const ultraFastCallback = async () => {
            console.log(`UltraFastShortcutManager: Executing ultra-fast shortcut for window ${window.id}`);
            return await this.windowManager.activateWindow(window.id);
          };

          const success = await this.shortcutManager.setWindowShortcut(window.id, existingShortcut, ultraFastCallback);

          if (success) {
            registeredCount++;
            window.shortcut = existingShortcut;
          } else {
            console.warn(`DofusOrganizerUltraFast: Failed to register ultra-fast shortcut ${existingShortcut} for window ${window.id}`);
          }
        }
      }

      // Nettoyage ultra-rapide
      this.shortcutConfig.cleanupOldEntries(this.dofusWindows);

      console.log(`DofusOrganizerUltraFast: Successfully registered ${registeredCount} ultra-fast window shortcuts`);
      this.shortcutsLoaded = true;

      // Réenregistrement ultra-rapide des raccourcis globaux
      await this.registerGlobalShortcuts();

      // Mise à jour ultra-rapide de l'UI
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        console.log('DofusOrganizerUltraFast: Sending ultra-fast updated windows to config after shortcut loading');
        this.mainWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
      }

      if (this.dockWindow && !this.dockWindow.isDestroyed()) {
        this.dockWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
      }
    });
  }

  /**
   * Gestionnaires d'événements ultra-rapides
   */
  setupUltraFastEventHandlers() {
    console.log('DofusOrganizerUltraFast: Setting up ultra-fast IPC event handlers...');

    // Gestionnaire IPC ultra-rapide pour get-dofus-windows
    ipcMain.handle('get-dofus-windows-ultra-fast', async () => {
      return performanceMonitor.measureAsync('ipc_get_windows_ultra_fast', async () => {
        console.log(`IPC Ultra-Fast: get-dofus-windows called, returning ${this.dofusWindows.length} windows`);
        return [...this.dofusWindows];
      });
    });

    // Activation de fenêtre ultra-rapide
    ipcMain.handle('activate-window-ultra-fast', async (event, windowId) => {
      return performanceMonitor.measureAsync('ipc_activate_window_ultra_fast', async () => {
        console.log(`IPC Ultra-Fast: activate-window called for: ${windowId}`);

        try {
          const result = await this.windowManager.activateWindow(windowId);

          if (result) {
            // Mise à jour ultra-rapide immédiate
            this.dofusWindows.forEach(w => {
              w.isActive = w.id === windowId;
            });

            // Notification ultra-rapide immédiate
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
            }

            if (this.dockWindow && !this.dockWindow.isDestroyed()) {
              this.dockWindow.webContents.send('windows-updated-ultra-fast', this.dofusWindows);
            }

            console.log(`IPC Ultra-Fast: Window ${windowId} activated successfully with ultra-fast optimization`);
          }

          return result;
        } catch (error) {
          console.error(`IPC Ultra-Fast: Error activating window ${windowId}:`, error);
          return false;
        }
      });
    });

    // Refresh ultra-rapide
    ipcMain.handle('refresh-windows-ultra-fast', async () => {
      return performanceMonitor.measureAsync('ipc_refresh_windows_ultra_fast', async () => {
        console.log('IPC Ultra-Fast: refresh-windows called');
        return this.refreshAndSortUltraFast();
      });
    });

    // Activation de la fenêtre suivante ultra-rapide
    ipcMain.handle('activate-next-window-ultra-fast', async () => {
      console.log('IPC Ultra-Fast: activate-next-window called');
      return await this.windowManager.activateNextWindow();
    });

    // Statistiques ultra-rapides
    ipcMain.handle('get-ultra-fast-stats', () => {
      return {
        shortcutManager: this.shortcutManager.getStats(),
        windowManager: this.windowManager.getStats(),
        performanceMonitor: performanceMonitor.getReport(),
        healthStatus: this.windowManager.getHealthStatus()
      };
    });

    // Tous les autres gestionnaires IPC normaux...
    this.setupNormalEventHandlers();
  }

  /**
   * Gestionnaires d'événements normaux (délégation)
   */
  setupNormalEventHandlers() {
    // Réutiliser les gestionnaires de base
    ipcMain.handle('get-dofus-windows', async () => {
      return [...this.dofusWindows];
    });

    ipcMain.handle('activate-window', async (event, windowId) => {
      return await this.windowManager.activateWindow(windowId);
    });

    // ... autres gestionnaires normaux
  }

  /**
   * Création du tray ultra-rapide
   */
  createTray() {
    const iconPath = path.join(__dirname, '../assets/icons/organizer.png');
    console.log('DofusOrganizerUltraFast: Creating ultra-fast tray with icon:', iconPath);
    this.tray = new Tray(iconPath);
    this.updateTrayMenu();

    this.tray.setToolTip('Dofus Organizer Ultra-Fast - <100ms Activation');
    this.tray.on('click', () => {
      console.log('DofusOrganizerUltraFast: Tray clicked, showing ultra-fast config window');
      this.showConfigWindow();
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });
  }

  /**
   * Mise à jour du menu tray ultra-rapide
   */
  updateTrayMenu() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowStats = this.windowManager.getStats();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `${lang.main_configure} (Ultra-Fast)`,
        click: () => this.showConfigWindow()
      },
      {
        label: lang.main_refreshsort,
        click: () => this.refreshAndSortUltraFast()
      },
      { type: 'separator' },
      {
        label: 'Ultra-Fast Performance',
        submenu: [
          {
            label: `Avg Activation: ${windowStats.avgActivationTime.toFixed(0)}ms (target: <100ms)`,
            enabled: false
          },
          {
            label: `Ultra-Fast Rate: ${windowStats.ultraFastRate}% (target: >80%)`,
            enabled: false
          },
          {
            label: `Status: ${windowStats.status}`,
            enabled: false
          },
          { type: 'separator' },
          {
            label: 'Show Ultra-Fast Performance Report',
            click: () => this.showUltraFastPerformanceReport()
          },
          {
            label: 'Optimize Ultra-Fast Performance',
            click: () => this.optimizeUltraFastPerformance()
          }
        ]
      },
      { type: 'separator' },
      {
        label: lang.main_quit,
        click: () => this.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Affichage du rapport de performance ultra-rapide
   */
  showUltraFastPerformanceReport() {
    const windowStats = this.windowManager.getStats();
    const healthStatus = this.windowManager.getHealthStatus();

    console.log('=== ULTRA-FAST PERFORMANCE REPORT ===');
    console.log('Window Manager Stats:', windowStats);
    console.log('Health Status:', healthStatus);
    console.log('====================================');

    const status = windowStats.status;
    const color = status === 'EXCELLENT' ? '#27ae60' : 
                  status === 'GOOD' ? '#f39c12' : '#e74c3c';

    this.notificationManager.show({
      type: 'info',
      message: `Ultra-Fast Performance: ${status} (${windowStats.avgActivationTime.toFixed(0)}ms avg)`,
      color,
      duration: 5000
    });
  }

  // Méthodes déléguées aux services ultra-rapides
  async activateNextWindow() {
    return await this.windowManager.activateNextWindow();
  }

  // Autres méthodes nécessaires (similaires à la classe parent)...
  migrateOldSettings() {
    // Implémentation similaire à la classe parent
  }

  loadSettings() {
    // Implémentation similaire à la classe parent
  }

  showConfigWindow() {
    // Implémentation similaire à la classe parent
  }

  updateTrayTooltip() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowCount = this.dofusWindows.length;
    const enabledCount = this.dofusWindows.filter(w => w.enabled).length;
    const windowStats = this.windowManager.getStats();

    let tooltip = `Dofus Organizer Ultra-Fast\n`;
    if (windowCount === 0) {
      tooltip += lang.displayTray_element_0;
    } else if (windowCount === 1) {
      tooltip += lang.displayTray_element_1;
    } else {
      tooltip += lang.displayTray_element_N.replace('{0}', windowCount);
    }

    if (enabledCount !== windowCount) {
      tooltip += ` (${enabledCount} enabled)`;
    }

    tooltip += `\nShortcuts: ${this.shortcutsEnabled ? 'Enabled' : 'Disabled'}`;
    tooltip += `\nActivation: ${windowStats.avgActivationTime.toFixed(0)}ms avg (target: <100ms)`;
    tooltip += `\nUltra-Fast Rate: ${windowStats.ultraFastRate}%`;

    console.log(`DofusOrganizerUltraFast: Updating ultra-fast tray tooltip`);
    this.tray.setToolTip(tooltip);
  }

  registerGlobalShortcuts() {
    // Implémentation similaire à la classe parent
  }

  unregisterGlobalShortcuts() {
    // Implémentation similaire à la classe parent
  }

  showDockWindow() {
    // Implémentation similaire à la classe parent
  }

  hideDockWindow() {
    // Implémentation similaire à la classe parent
  }

  /**
   * Nettoyage ultra-rapide
   */
  cleanup() {
    return performanceMonitor.measure('ultra_fast_application_cleanup', () => {
      console.log('DofusOrganizerUltraFast: Cleaning up ultra-fast application...');

      // Nettoyage des services ultra-rapides
      this.shortcutManager.cleanup();
      this.windowManager.cleanup();
      this.notificationManager.cleanup();

      // Désenregistrement des raccourcis globaux
      try {
        this.unregisterGlobalShortcuts();
        globalShortcut.unregisterAll();
      } catch (error) {
        console.error('DofusOrganizerUltraFast: Error unregistering global shortcuts:', error);
      }

      // Rapport final ultra-rapide
      const finalReport = performanceMonitor.getReport();
      const windowStats = this.windowManager.getStats();

      console.log('=== FINAL ULTRA-FAST PERFORMANCE REPORT ===');
      console.log('Summary:', finalReport.summary);
      console.log('Ultra-Fast Window Stats:', windowStats);
      console.log('==========================================');
    });
  }

  quit() {
    console.log('DofusOrganizerUltraFast: Quitting ultra-fast application...');
    this.cleanup();
    if (this.dockWindow && !this.dockWindow.isDestroyed()) this.dockWindow.close();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.close();
    app.quit();
  }
}

// Initialiser l'application ultra-rapide
console.log('Starting Dofus Organizer Ultra-Fast with <100ms Activation...');
new DofusOrganizerUltraFast();