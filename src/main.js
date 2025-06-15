const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');


// Import your custom modules (adjust paths as needed)
const performanceMonitor = require('./core/PerformanceMonitor');
const LanguageManager = require('./services/LanguageManager');
const ShortcutManager = require('./services/ShortcutManager');
const PythonWindowManager = require('./services/WindowManager');
const NotificationManager = require('./services/NotificationManager');
const ShortcutConfig = require('./services/ShortcutConfig');  // Add this import

class DofusOrganizerPython {
  constructor() {
    this.mainWindow = null;
    this.dockWindow = null;
    this.isConfiguring = false;
    this.shortcutsEnabled = true;
    this.pythonValidated = false;
    this.dofusWindows = [];

    // Initialize services
    this.store = new Store();
    this.languageManager = new LanguageManager();
    this.shortcutManager = new ShortcutManager();
    this.windowManager = new PythonWindowManager();
    this.notificationManager = new NotificationManager();
    this.shortcutConfig = new ShortcutConfig(); // Add this initialization

    // Global shortcuts tracking
    this.globalShortcuts = {
      nextWindow: null,
      toggleShortcuts: null
    };

    this.init();
  }

  init() {
    console.log('DofusOrganizerPython: Initializing...');

    app.whenReady().then(() => {
      this.loadSettings();
      this.migrateOldSettings();
      this.startWindowDetection();
      this.setupIPC();
      this.createConfigWindow();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  startWindowDetection() {
    // Start periodic window detection
    setInterval(() => {
      this.detectDofusWindows();
    }, 1000);
  }

  detectDofusWindows() {
    // Implement window detection logic here
    // This is a placeholder - implement your actual window detection
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log(`DofusOrganizerPython: Sending current ${this.dofusWindows.length} windows to config`);
      this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
    }
  }

  setupIPC() {
    // Setup IPC handlers here
    ipcMain.on('activate-window', (event, windowId) => {
      this.activateWindow(windowId);
    });

    ipcMain.on('toggle-shortcuts', () => {
      this.toggleShortcuts();
    });
  }

  activateWindow(windowId) {
    // Implement window activation logic
    console.log(`DofusOrganizerPython: Activating window ${windowId}`);
    this.windowManager.activateWindow(windowId);
  }

  activateNextWindow() {
    // Implement next window activation logic
    const enabledWindows = this.dofusWindows.filter(w => w.enabled);
    if (enabledWindows.length === 0) return;

    // Simple cycling logic - implement your own
    const currentIndex = 0; // Determine current window index
    const nextIndex = (currentIndex + 1) % enabledWindows.length;
    this.activateWindow(enabledWindows[nextIndex].id);
  }

  toggleShortcuts() {
    this.shortcutsEnabled = !this.shortcutsEnabled;
    this.store.set('shortcutsEnabled', this.shortcutsEnabled);

    if (this.shortcutsEnabled) {
      this.activateShortcuts();
    } else {
      this.deactivateShortcuts();
    }

    console.log(`DofusOrganizerPython: Shortcuts ${this.shortcutsEnabled ? 'enabled' : 'disabled'}`);
    this.notificationManager.showInfo(
      `Shortcuts ${this.shortcutsEnabled ? 'enabled' : 'disabled'}`,
      { duration: 2000 }
    );
  }




  createConfigWindow() {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // 👈 attend ready-to-show avant d'afficher
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false // important si tu manipules ipcRenderer
      }
    });

    // Charger le fichier HTML
    this.mainWindow.loadFile(path.join(__dirname, 'renderer/config.html'))
      .then(() => {
        console.log('[Electron] config.html chargé avec succès');
      })
      .catch(err => {
        console.error('[Electron] Échec du chargement de config.html:', err);
      });

    // Afficher la fenêtre quand elle est prête
    this.mainWindow.once('ready-to-show', () => {
      console.log('[Electron] Fenêtre prête, affichage...');
      this.mainWindow.show();

      if (process.argv.includes('--dev')) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Nettoyage lors de la fermeture
    this.mainWindow.on('closed', () => {
      console.log('[Electron] Fenêtre de configuration fermée');
      this.mainWindow = null;
      this.isConfiguring = false;
      this.activateShortcuts(); // Restaurer les raccourcis
    });

    // Désactiver les raccourcis pendant la config
    this.isConfiguring = true;
    this.deactivateShortcuts();
  }

  showDockWindow() {
    const dockSettings = this.store.get('dock', { enabled: false, position: 'SE' });

    if (!dockSettings.enabled || this.dockWindow) return;

    const enabledWindows = this.dofusWindows.filter(w => w.enabled);
    if (enabledWindows.length === 0) return;

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays.find(display => display.bounds.x === 0 && display.bounds.y === 0) || displays[0];

    let x, y, width, height;
    const dockSize = 70;
    const itemWidth = 60;
    const windowCount = enabledWindows.length + 2; // +2 pour refresh et config

    switch (dockSettings.position) {
      case 'NW': // Top-left
        x = primaryDisplay.bounds.x + 10;
        y = primaryDisplay.bounds.y + 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
      case 'NE': // Top-right
        x = primaryDisplay.bounds.x + primaryDisplay.bounds.width - Math.min(600, windowCount * itemWidth) - 10;
        y = primaryDisplay.bounds.y + 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
      case 'SW': // Bottom-left
        x = primaryDisplay.bounds.x + 10;
        y = primaryDisplay.bounds.y + primaryDisplay.bounds.height - dockSize - 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
      case 'SE': // Bottom-right (default)
      default:
        x = primaryDisplay.bounds.x + primaryDisplay.bounds.width - Math.min(600, windowCount * itemWidth) - 10;
        y = primaryDisplay.bounds.y + primaryDisplay.bounds.height - dockSize - 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
      case 'N': // Top horizontal
        x = primaryDisplay.bounds.x + (primaryDisplay.bounds.width - Math.min(600, windowCount * itemWidth)) / 2;
        y = primaryDisplay.bounds.y + 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
      case 'S': // Bottom horizontal
        x = primaryDisplay.bounds.x + (primaryDisplay.bounds.width - Math.min(600, windowCount * itemWidth)) / 2;
        y = primaryDisplay.bounds.y + primaryDisplay.bounds.height - dockSize - 10;
        width = Math.min(600, windowCount * itemWidth);
        height = dockSize;
        break;
    }

    this.dockWindow = new BrowserWindow({
      x, y, width, height,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.dockWindow.loadFile(path.join(__dirname, 'renderer/dock.html'));

    this.dockWindow.on('closed', () => {
      this.dockWindow = null;
    });

    this.dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  hideDockWindow() {
    if (this.dockWindow) {
      this.dockWindow.close();
      this.dockWindow = null;
    }
  }

  loadSettings() {
    return performanceMonitor.measure('python_settings_load', () => {
      console.log('DofusOrganizerPython: Loading Python-enhanced settings...');

      const language = this.store.get('language', 'FR');
      console.log(`DofusOrganizerPython: Setting language to ${language}`);
      this.languageManager.setLanguage(language);

      // Charger l'état d'activation des raccourcis
      this.shortcutsEnabled = this.store.get('shortcutsEnabled', true);
      console.log(`DofusOrganizerPython: Shortcuts enabled: ${this.shortcutsEnabled}`);

      // Définir les raccourcis globaux par défaut s'ils ne sont pas définis
      if (!this.shortcutConfig.getGlobalShortcut('nextWindow')) {
        this.shortcutConfig.setGlobalShortcut('nextWindow', 'Ctrl+Tab');
      }
      if (!this.shortcutConfig.getGlobalShortcut('toggleShortcuts')) {
        this.shortcutConfig.setGlobalShortcut('toggleShortcuts', 'Ctrl+Shift+D');
      }

      // Enregistrer les raccourcis globaux
      this.registerGlobalShortcuts();
    });
  }

  async registerGlobalShortcuts() {
    return performanceMonitor.measureAsync('python_global_shortcuts_registration', async () => {
      try {
        // Désenregistrer les raccourcis existants
        this.unregisterGlobalShortcuts();

        const nextWindowShortcut = this.shortcutConfig.getGlobalShortcut('nextWindow');
        const toggleShortcutsShortcut = this.shortcutConfig.getGlobalShortcut('toggleShortcuts');

        // Enregistrer le raccourci de fenêtre suivante (seulement si les raccourcis sont activés)
        if (nextWindowShortcut && this.shortcutsEnabled) {
          const accelerator = this.shortcutManager.convertShortcutToAccelerator(nextWindowShortcut);
          if (accelerator) {
            const success = globalShortcut.register(accelerator, () => {
              this.activateNextWindow();
            });

            if (success) {
              this.globalShortcuts.nextWindow = accelerator;
              console.log(`DofusOrganizerPython: Registered next window shortcut: ${accelerator}`);
            } else {
              console.warn(`DofusOrganizerPython: Failed to register next window shortcut: ${accelerator}`);
            }
          }
        }

        // Le raccourci de basculement doit TOUJOURS fonctionner
        if (toggleShortcutsShortcut) {
          const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
          if (accelerator) {
            const success = globalShortcut.register(accelerator, () => {
              this.toggleShortcuts();
            });

            if (success) {
              this.globalShortcuts.toggleShortcuts = accelerator;
              console.log(`DofusOrganizerPython: Registered toggle shortcuts shortcut: ${accelerator}`);
            } else {
              console.warn(`DofusOrganizerPython: Failed to register toggle shortcuts shortcut: ${accelerator}`);
            }
          }
        }

      } catch (error) {
        console.error('DofusOrganizerPython: Error registering global shortcuts:', error);
      }
    });
  }

  unregisterGlobalShortcuts() {
    try {
      if (this.globalShortcuts.nextWindow) {
        globalShortcut.unregister(this.globalShortcuts.nextWindow);
        this.globalShortcuts.nextWindow = null;
      }

      if (this.globalShortcuts.toggleShortcuts) {
        globalShortcut.unregister(this.globalShortcuts.toggleShortcuts);
        this.globalShortcuts.toggleShortcuts = null;
      }
    } catch (error) {
      console.error('DofusOrganizerPython: Error unregistering global shortcuts:', error);
    }
  }

  async activateShortcuts() {
    return performanceMonitor.measureAsync('python_shortcuts_activation', async () => {
      if (this.shortcutsEnabled) {
        console.log('DofusOrganizerPython: Activating Python-enhanced shortcuts');
        await this.shortcutManager.activateAll();
        // Réenregistrer les raccourcis globaux
        await this.registerGlobalShortcuts();
      }
    });
  }

  deactivateShortcuts() {
    return performanceMonitor.measure('python_shortcuts_deactivation', () => {
      console.log('DofusOrganizerPython: Deactivating shortcuts');
      this.shortcutManager.deactivateAll();

      // IMPORTANT: Garder le raccourci de basculement actif même quand les raccourcis sont désactivés
      const toggleShortcutsShortcut = this.shortcutConfig.getGlobalShortcut('toggleShortcuts');
      if (toggleShortcutsShortcut) {
        const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
        if (accelerator && !globalShortcut.isRegistered(accelerator)) {
          globalShortcut.register(accelerator, () => {
            this.toggleShortcuts();
          });
          this.globalShortcuts.toggleShortcuts = accelerator;
          console.log('DofusOrganizerPython: Keeping toggle shortcut active while shortcuts are disabled');
        }
      }
    });
  }

  migrateOldSettings() {
    return performanceMonitor.measure('python_settings_migration', () => {
      try {
        console.log('DofusOrganizerPython: Checking for old settings to migrate...');
        const migratedCount = this.shortcutConfig.migrateFromElectronStore(this.store);

        if (migratedCount > 0) {
          console.log(`DofusOrganizerPython: Migrated ${migratedCount} settings to Python config system`);

          // Nettoyer les anciens paramètres
          this.store.delete('shortcuts');
          this.store.delete('globalShortcuts');
          console.log('DofusOrganizerPython: Cleaned up old electron-store settings');

          // Notifier l'utilisateur
          this.notificationManager.showSuccess(
            `Successfully migrated ${migratedCount} shortcuts to Python v2.0`,
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.error('DofusOrganizerPython: Error during migration:', error);
        this.notificationManager.showError('Error during settings migration', { duration: 5000 });
      }
    });
  }

  updateTrayMenu() {
    // Implement tray menu update logic if needed
    console.log('DofusOrganizerPython: Updating tray menu...');
  }

  changeLanguage(langCode) {
    return performanceMonitor.measure('python_language_change', () => {
      console.log(`DofusOrganizerPython: Changing language to ${langCode}`);
      this.languageManager.setLanguage(langCode);
      this.store.set('language', langCode);
      this.updateTrayMenu();

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('language-changed', this.languageManager.getCurrentLanguage());
      }

      if (this.dockWindow && !this.dockWindow.isDestroyed()) {
        this.dockWindow.webContents.send('language-changed', this.languageManager.getCurrentLanguage());
      }

      // Notifier du changement
      this.notificationManager.showSuccess(`Language changed to ${langCode} (Python)`, { duration: 2000 });
    });
  }

  /**
   * Nettoyage spécifique Python
   */
  cleanup() {
    return performanceMonitor.measure('python_application_cleanup', () => {
      console.log('DofusOrganizerPython: Cleaning up Python application...');

      // Nettoyage des services Python
      this.shortcutManager.cleanup();
      this.windowManager.cleanup();
      this.notificationManager.cleanup();

      // Désenregistrer les raccourcis globaux
      try {
        this.unregisterGlobalShortcuts();
        globalShortcut.unregisterAll();
      } catch (error) {
        console.error('DofusOrganizerPython: Error unregistering global shortcuts:', error);
      }

      // Afficher un rapport final Python
      const finalReport = performanceMonitor.getReport();
      const windowStats = this.windowManager.getStats();

      console.log('=== FINAL PYTHON PERFORMANCE REPORT ===');
      console.log('Summary:', finalReport.summary);
      console.log('Python Window Stats:', windowStats);
      console.log('Python Validated:', this.pythonValidated);
      console.log('Total Operations:', finalReport.summary.totalOperations);
      console.log('======================================');
    });
  }

  quit() {
    console.log('DofusOrganizerPython: Quitting Python application...');
    this.cleanup();
    if (this.dockWindow && !this.dockWindow.isDestroyed()) this.dockWindow.close();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.close();
    app.quit();
  }
}

// Initialiser l'application Python
console.log('Starting Dofus Organizer Python with Native Python Activation...');
new DofusOrganizerPython();