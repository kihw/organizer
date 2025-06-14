const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import v2.0 services
const ShortcutManagerV2 = require('./services/ShortcutManagerV2');
const WindowManagerV2 = require('./services/WindowManagerV2');
const ShortcutConfigManager = require('./services/ShortcutConfigManager');
const LanguageManager = require('./services/LanguageManager');
const NotificationManager = require('./services/NotificationManager');

// Import core modules
const eventBus = require('./core/EventBus');
const performanceMonitor = require('./core/PerformanceMonitor');

class DofusOrganizerV2 {
  constructor() {
    this.store = new Store();
    this.shortcutConfig = new ShortcutConfigManager();
    this.mainWindow = null;
    this.tray = null;
    this.dockWindow = null;
    this.windowManager = new WindowManagerV2();
    this.shortcutManager = new ShortcutManagerV2();
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
    
    console.log('DofusOrganizerV2: Initializing application with enhanced performance...');
    this.initializeApp();
    this.setupPerformanceMonitoring();
  }

  /**
   * Configure le monitoring de performance
   */
  setupPerformanceMonitoring() {
    // Écouter les événements de performance
    eventBus.on('performance:alert', (alert) => {
      console.warn(`Performance Alert: ${alert.operation} took ${alert.duration}ms (threshold: ${alert.threshold}ms)`);
      
      // Afficher une notification pour les alertes critiques
      if (alert.severity === 'critical') {
        this.notificationManager.showWarning(
          `Performance issue detected: ${alert.operation} is running slowly`,
          { duration: 5000 }
        );
      }
    });

    // Écouter les événements de raccourcis
    eventBus.on('shortcut:activated', (data) => {
      console.log(`Shortcut activated for window ${data.windowId} in ${data.duration.toFixed(2)}ms`);
    });

    // Écouter les événements de fenêtres
    eventBus.on('window:activated', (data) => {
      console.log(`Window ${data.windowId} activated in ${data.duration.toFixed(2)}ms`);
    });

    // Démarrer le monitoring automatique
    this.startAutomaticMonitoring();
  }

  /**
   * Démarre le monitoring automatique
   */
  startAutomaticMonitoring() {
    // Rapport de performance toutes les 5 minutes
    setInterval(() => {
      const report = performanceMonitor.getReport();
      
      if (!report.summary.isHealthy) {
        console.warn('DofusOrganizerV2: Performance issues detected:', report.summary);
        
        // Optimiser automatiquement si nécessaire
        this.optimizePerformance();
      }
    }, 300000); // 5 minutes

    // Nettoyage automatique toutes les heures
    setInterval(() => {
      this.performMaintenance();
    }, 3600000); // 1 heure
  }

  /**
   * Optimise automatiquement les performances
   */
  optimizePerformance() {
    console.log('DofusOrganizerV2: Performing automatic performance optimization...');
    
    // Nettoyer les caches
    this.windowManager.invalidateCache();
    
    // Réinitialiser les métriques de performance
    performanceMonitor.reset();
    
    // Notifier l'utilisateur
    this.notificationManager.showInfo('Performance optimization completed', { duration: 3000 });
  }

  /**
   * Effectue la maintenance automatique
   */
  performMaintenance() {
    console.log('DofusOrganizerV2: Performing automatic maintenance...');
    
    // Nettoyer les anciennes métriques
    performanceMonitor.reset();
    
    // Nettoyer la configuration des raccourcis
    this.shortcutConfig.cleanupOldEntries(this.dofusWindows);
    
    console.log('DofusOrganizerV2: Maintenance completed');
  }

  initializeApp() {
    app.whenReady().then(async () => {
      console.log('DofusOrganizerV2: App ready, setting up enhanced services...');
      this.createTray();
      this.setupEventHandlers();
      this.loadSettings();
      
      // Migration depuis l'ancienne version
      this.migrateOldSettings();
      
      // CORRECTION: Séquence de démarrage simplifiée
      console.log('DofusOrganizerV2: Starting simplified startup sequence...');
      await this.performStartupSequence();
    });

    app.on('window-all-closed', (e) => {
      e.preventDefault(); // Garder l'app en cours dans le tray
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
   * NOUVELLE: Séquence de démarrage simplifiée
   */
  async performStartupSequence() {
    try {
      console.log('DofusOrganizerV2: Performing initial refresh...');
      
      // Faire un refresh initial qui va gérer tout automatiquement
      await this.refreshAndSort();
      
      this.startupComplete = true;
      console.log('DofusOrganizerV2: Startup sequence completed successfully!');
      
      // Notification de succès
      if (this.dofusWindows.length > 0) {
        this.notificationManager.showSuccess(
          `Dofus Organizer v2.0 ready! Found ${this.dofusWindows.length} windows.`,
          { duration: 4000 }
        );
      } else {
        this.notificationManager.showInfo(
          'Dofus Organizer v2.0 ready! No Dofus windows detected. Start Dofus and refresh.',
          { duration: 4000 }
        );
      }
      
    } catch (error) {
      console.error('DofusOrganizerV2: Error during startup sequence:', error);
      this.notificationManager.showError('Error during startup. Some features may not work correctly.', { duration: 5000 });
    }
  }

  migrateOldSettings() {
    return performanceMonitor.measure('settings_migration', () => {
      try {
        console.log('DofusOrganizerV2: Checking for old settings to migrate...');
        const migratedCount = this.shortcutConfig.migrateFromElectronStore(this.store);
        
        if (migratedCount > 0) {
          console.log(`DofusOrganizerV2: Migrated ${migratedCount} settings to new config system`);
          
          // Nettoyer les anciens paramètres
          this.store.delete('shortcuts');
          this.store.delete('globalShortcuts');
          console.log('DofusOrganizerV2: Cleaned up old electron-store settings');
          
          // Notifier l'utilisateur
          this.notificationManager.showSuccess(
            `Successfully migrated ${migratedCount} shortcuts to v2.0`,
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.error('DofusOrganizerV2: Error during migration:', error);
        this.notificationManager.showError('Error during settings migration', { duration: 5000 });
      }
    });
  }

  createTray() {
    const iconPath = path.join(__dirname, '../assets/icons/organizer.png');
    console.log('DofusOrganizerV2: Creating enhanced tray with icon:', iconPath);
    this.tray = new Tray(iconPath);
    this.updateTrayMenu();
    
    this.tray.setToolTip('Dofus Organizer v2.0 - Enhanced Performance');
    this.tray.on('click', () => {
      console.log('DofusOrganizerV2: Tray clicked, showing config window');
      this.showConfigWindow();
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });
  }

  updateTrayMenu() {
    const lang = this.languageManager.getCurrentLanguage();
    
    console.log('DofusOrganizerV2: Updating enhanced tray menu');
    
    const nextWindowShortcut = this.shortcutConfig.getGlobalShortcut('nextWindow') || 'Ctrl+Tab';
    const toggleShortcutsShortcut = this.shortcutConfig.getGlobalShortcut('toggleShortcuts') || 'Ctrl+Shift+D';
    
    // Obtenir les statistiques de performance
    const shortcutStats = this.shortcutManager.getStats();
    const windowStats = this.windowManager.getStats();
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `${lang.main_configure} (v2.0)`,
        click: () => this.showConfigWindow()
      },
      {
        label: lang.main_refreshsort,
        click: () => this.refreshAndSort()
      },
      { type: 'separator' },
      {
        label: `Next Window (${nextWindowShortcut})`,
        click: () => this.activateNextWindow()
      },
      {
        label: `${this.shortcutsEnabled ? 'Disable' : 'Enable'} Shortcuts (${toggleShortcutsShortcut})`,
        click: () => this.toggleShortcuts()
      },
      { type: 'separator' },
      {
        label: 'Performance',
        submenu: [
          {
            label: `Shortcuts: ${shortcutStats.avgActivationTime.toFixed(0)}ms avg`,
            enabled: false
          },
          {
            label: `Windows: ${windowStats.avgActivationTime.toFixed(0)}ms avg`,
            enabled: false
          },
          {
            label: `Cache Hit Rate: ${shortcutStats.cacheStats?.hitRate || 'N/A'}`,
            enabled: false
          },
          { type: 'separator' },
          {
            label: 'Show Performance Report',
            click: () => this.showPerformanceReport()
          },
          {
            label: 'Optimize Performance',
            click: () => this.optimizePerformance()
          }
        ]
      },
      { type: 'separator' },
      {
        label: lang.main_language,
        submenu: this.languageManager.getLanguageMenu((langCode) => {
          this.changeLanguage(langCode);
        })
      },
      { type: 'separator' },
      {
        label: lang.displayTray_dock,
        type: 'checkbox',
        checked: this.store.get('dock.enabled', false),
        click: () => this.toggleDock()
      },
      { type: 'separator' },
      {
        label: 'Show Config File',
        click: () => this.showConfigFile()
      },
      {
        label: 'Test Notifications',
        click: () => this.notificationManager.test()
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
   * Affiche un rapport de performance
   */
  showPerformanceReport() {
    const report = performanceMonitor.getReport();
    const shortcutStats = this.shortcutManager.getStats();
    const windowStats = this.windowManager.getStats();
    
    console.log('=== PERFORMANCE REPORT ===');
    console.log('Summary:', report.summary);
    console.log('Shortcut Manager:', shortcutStats);
    console.log('Window Manager:', windowStats);
    console.log('Recent Alerts:', report.alerts);
    console.log('========================');
    
    // Afficher une notification avec le résumé
    const status = report.summary.isHealthy ? 'Healthy' : 'Issues Detected';
    const color = report.summary.isHealthy ? '#27ae60' : '#e74c3c';
    
    this.notificationManager.show({
      type: 'info',
      message: `Performance Status: ${status}`,
      color,
      duration: 5000
    });
  }

  showConfigFile() {
    const { shell } = require('electron');
    const configPath = this.shortcutConfig.getConfigFilePath();
    
    try {
      shell.showItemInFolder(configPath);
      console.log('DofusOrganizerV2: Opened config file location:', configPath);
    } catch (error) {
      console.error('DofusOrganizerV2: Error opening config file location:', error);
    }
  }

  showConfigWindow() {
    return performanceMonitor.measure('config_window_show', () => {
      console.log('DofusOrganizerV2: showConfigWindow called');
      
      if (this.mainWindow) {
        console.log('DofusOrganizerV2: Config window already exists, focusing...');
        this.mainWindow.focus();
        return;
      }

      console.log('DofusOrganizerV2: Creating new enhanced config window...');
      this.mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        icon: path.join(__dirname, '../assets/icons/organizer.png'),
        title: 'Dofus Organizer v2.0 - Enhanced Configuration',
        show: false,
        frame: false,
        titleBarStyle: 'hidden'
      });

      this.mainWindow.loadFile(path.join(__dirname, 'renderer/config.html'));
      
      this.mainWindow.once('ready-to-show', () => {
        console.log('DofusOrganizerV2: Enhanced config window ready to show');
        this.mainWindow.show();
        
        // Force refresh avec monitoring
        setTimeout(() => {
          console.log('DofusOrganizerV2: Forcing enhanced window refresh for config...');
          performanceMonitor.measureAsync('config_refresh', async () => {
            await this.refreshAndSort();
            
            setTimeout(() => {
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                console.log(`DofusOrganizerV2: Force sending ${this.dofusWindows.length} windows to enhanced config renderer`);
                this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
              }
            }, 500);
          });
        }, 1000);
      });

      this.mainWindow.on('closed', () => {
        console.log('DofusOrganizerV2: Enhanced config window closed');
        this.mainWindow = null;
        this.isConfiguring = false;
        this.activateShortcuts();
      });

      this.isConfiguring = true;
      this.deactivateShortcuts();
    });
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

  toggleDock() {
    const currentState = this.store.get('dock.enabled', false);
    this.store.set('dock.enabled', !currentState);
    
    if (!currentState) {
      this.showDockWindow();
    } else {
      this.hideDockWindow();
    }
    
    this.updateTrayMenu();
  }

  // Méthode améliorée pour activer la fenêtre suivante
  async activateNextWindow() {
    return performanceMonitor.measureAsync('next_window_activation', async () => {
      const enabledWindows = this.dofusWindows.filter(w => w.enabled);
      if (enabledWindows.length === 0) return;

      // Trier par initiative (descendant), puis par nom de personnage
      enabledWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });

      // Trouver la fenêtre active actuelle
      const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);
      
      // Obtenir la fenêtre suivante (cycle vers la première si à la fin)
      const nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
      const nextWindow = enabledWindows[nextIndex];
      
      if (nextWindow) {
        console.log(`DofusOrganizerV2: Activating next window: ${nextWindow.character}`);
        const success = await this.windowManager.activateWindow(nextWindow.id);
        
        if (success) {
          this.notificationManager.showActivationFeedback(nextWindow.id, 50); // Feedback rapide
        }
        
        return success;
      }
    });
  }

  // Méthode améliorée pour basculer les raccourcis
  async toggleShortcuts() {
    return performanceMonitor.measureAsync('shortcuts_toggle', async () => {
      // Prévenir les boucles infinies
      if (this.isTogglingShortcuts) {
        console.log('DofusOrganizerV2: Toggle already in progress, ignoring...');
        return;
      }
      
      this.isTogglingShortcuts = true;
      
      try {
        this.shortcutsEnabled = !this.shortcutsEnabled;
        this.store.set('shortcutsEnabled', this.shortcutsEnabled);
        
        console.log(`DofusOrganizerV2: Shortcuts ${this.shortcutsEnabled ? 'enabled' : 'disabled'}`);
        
        if (this.shortcutsEnabled && !this.isConfiguring) {
          await this.activateShortcuts();
        } else {
          this.deactivateShortcuts();
        }
        
        this.updateTrayMenu();
        
        // Notifier l'utilisateur avec feedback visuel
        this.notificationManager.show({
          type: this.shortcutsEnabled ? 'success' : 'warning',
          message: `Shortcuts ${this.shortcutsEnabled ? 'enabled' : 'disabled'}`,
          icon: this.shortcutsEnabled ? '✓' : '✗',
          duration: 2000
        });
        
        // Notifier les fenêtres
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('shortcuts-toggled', this.shortcutsEnabled);
        }
      } finally {
        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          this.isTogglingShortcuts = false;
        }, 500);
      }
    });
  }

  // Enregistrement amélioré des raccourcis globaux
  async registerGlobalShortcuts() {
    return performanceMonitor.measureAsync('global_shortcuts_registration', async () => {
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
              console.log(`DofusOrganizerV2: Registered next window shortcut: ${accelerator}`);
            } else {
              console.warn(`DofusOrganizerV2: Failed to register next window shortcut: ${accelerator}`);
            }
          }
        }
        
        // CRITIQUE: Le raccourci de basculement doit TOUJOURS fonctionner
        if (toggleShortcutsShortcut) {
          const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
          if (accelerator) {
            const success = globalShortcut.register(accelerator, () => {
              // Ce raccourci fonctionne toujours, même quand les raccourcis sont désactivés
              this.toggleShortcuts();
            });
            
            if (success) {
              this.globalShortcuts.toggleShortcuts = accelerator;
              console.log(`DofusOrganizerV2: Registered toggle shortcuts shortcut: ${accelerator}`);
            } else {
              console.warn(`DofusOrganizerV2: Failed to register toggle shortcuts shortcut: ${accelerator}`);
            }
          }
        }
        
      } catch (error) {
        console.error('DofusOrganizerV2: Error registering global shortcuts:', error);
      }
    });
  }

  // Désenregistrement des raccourcis globaux
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
      console.error('DofusOrganizerV2: Error unregistering global shortcuts:', error);
    }
  }

  setupEventHandlers() {
    console.log('DofusOrganizerV2: Setting up enhanced IPC event handlers...');
    
    // Gestionnaires IPC pour les processus de rendu
    ipcMain.handle('get-dofus-windows', async () => {
      return performanceMonitor.measureAsync('ipc_get_windows', async () => {
        console.log(`IPC: get-dofus-windows called, returning ${this.dofusWindows.length} windows`);
        return this.dofusWindows;
      });
    });

    ipcMain.handle('get-dofus-classes', () => {
      console.log('IPC: get-dofus-classes called');
      return this.windowManager.getDofusClasses();
    });
    
    ipcMain.handle('get-language', () => {
      const lang = this.languageManager.getCurrentLanguage();
      console.log('IPC: get-language called, returning:', Object.keys(lang).length, 'keys');
      return lang;
    });
    
    ipcMain.handle('get-settings', () => {
      const settings = this.store.store;
      console.log('IPC: get-settings called, returning:', Object.keys(settings).length, 'settings');
      return settings;
    });
    
    ipcMain.handle('save-settings', async (event, settings) => {
      return performanceMonitor.measureAsync('ipc_save_settings', async () => {
        console.log('IPC: save-settings called with:', Object.keys(settings));
        Object.keys(settings).forEach(key => {
          this.store.set(key, settings[key]);
        });
        
        // Gestion spéciale des changements de classe
        const classChanges = Object.keys(settings).filter(key => key.startsWith('classes.'));
        if (classChanges.length > 0) {
          classChanges.forEach(key => {
            const windowId = key.replace('classes.', '');
            const classKey = settings[key];
            this.windowManager.setWindowClass(windowId, classKey);
          });
          
          // Force refresh pour mettre à jour les avatars
          setTimeout(() => this.refreshAndSort(), 100);
        }
        
        // Gestion des changements de raccourcis globaux
        const globalShortcutChanges = Object.keys(settings).filter(key => key.startsWith('globalShortcuts.'));
        if (globalShortcutChanges.length > 0) {
          console.log('DofusOrganizerV2: Global shortcuts changed, updating config file...');
          globalShortcutChanges.forEach(key => {
            const type = key.replace('globalShortcuts.', '');
            const shortcut = settings[key];
            this.shortcutConfig.setGlobalShortcut(type, shortcut);
          });
          setTimeout(() => this.registerGlobalShortcuts(), 100);
          this.updateTrayMenu();
        }
        
        // Gestion des changements de raccourcis de fenêtre
        const shortcutChanges = Object.keys(settings).filter(key => key.startsWith('shortcuts.'));
        if (shortcutChanges.length > 0) {
          console.log('DofusOrganizerV2: Window shortcuts changed, updating config file...');
          shortcutChanges.forEach(key => {
            const windowId = key.replace('shortcuts.', '');
            const shortcut = settings[key];
            
            // Trouver la fenêtre pour obtenir les infos du personnage
            const window = this.dofusWindows.find(w => w.id === windowId);
            if (window) {
              this.shortcutConfig.setWindowShortcut(windowId, shortcut, window.character, window.dofusClass);
            }
          });
          setTimeout(() => this.loadAndRegisterShortcuts(), 100);
        }
        
        // Mettre à jour le dock si les paramètres ont changé
        if (settings.dock) {
          this.hideDockWindow();
          if (settings.dock.enabled) {
            setTimeout(() => this.showDockWindow(), 100);
          }
        }
      });
    });
    
    ipcMain.handle('activate-window', async (event, windowId) => {
      return performanceMonitor.measureAsync('ipc_activate_window', async () => {
        console.log(`IPC: activate-window called for: ${windowId}`);
        
        try {
          const result = await this.windowManager.activateWindow(windowId);
          
          // Activation améliorée avec feedback immédiat
          if (result) {
            // Mettre à jour l'état actif dans nos données locales immédiatement
            this.dofusWindows.forEach(w => {
              w.isActive = w.id === windowId;
            });
            
            // Notifier toutes les fenêtres du changement d'état immédiatement
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
            }
            
            if (this.dockWindow && !this.dockWindow.isDestroyed()) {
              this.dockWindow.webContents.send('windows-updated', this.dofusWindows);
            }
            
            console.log(`IPC: Window ${windowId} activated successfully`);
          } else {
            console.warn(`IPC: Failed to activate window ${windowId}`);
          }
          
          return result;
        } catch (error) {
          console.error(`IPC: Error activating window ${windowId}:`, error);
          return false;
        }
      });
    });
    
    ipcMain.handle('refresh-windows', async () => {
      return performanceMonitor.measureAsync('ipc_refresh_windows', async () => {
        console.log('IPC: refresh-windows called');
        return this.refreshAndSort();
      });
    });
    
    ipcMain.handle('set-shortcut', async (event, windowId, shortcut) => {
      return performanceMonitor.measureAsync('ipc_set_shortcut', async () => {
        console.log(`IPC: set-shortcut called for ${windowId}: ${shortcut}`);
        
        // Valider le raccourci avant de le définir
        const validation = this.shortcutManager.validateShortcut(shortcut);
        if (!validation.valid) {
          console.warn(`IPC: Invalid or conflicting shortcut: ${shortcut} - ${validation.reason}`);
          return false;
        }
        
        // Trouver la fenêtre pour obtenir les infos du personnage
        const window = this.dofusWindows.find(w => w.id === windowId);
        if (!window) {
          console.warn(`IPC: Window not found: ${windowId}`);
          return false;
        }
        
        // Sauvegarder le raccourci dans le fichier de config avec les infos du personnage
        const success = this.shortcutConfig.setWindowShortcut(windowId, shortcut, window.character, window.dofusClass);
        if (!success) {
          console.warn(`IPC: Failed to save shortcut to config: ${shortcut}`);
          return false;
        }
        
        // Enregistrer le raccourci
        return await this.shortcutManager.setWindowShortcut(windowId, shortcut, async () => {
          console.log(`ShortcutManager: Executing shortcut for window ${windowId}`);
          await this.windowManager.activateWindow(windowId);
        });
      });
    });
    
    ipcMain.handle('remove-shortcut', async (event, windowId) => {
      return performanceMonitor.measureAsync('ipc_remove_shortcut', async () => {
        console.log(`IPC: remove-shortcut called for: ${windowId}`);
        
        // Trouver la fenêtre pour obtenir les infos du personnage
        const window = this.dofusWindows.find(w => w.id === windowId);
        if (window) {
          // Supprimer du fichier de config en utilisant les infos du personnage
          this.shortcutConfig.removeCharacterShortcut(window.character, window.dofusClass);
        } else {
          // Fallback: supprimer par windowId
          this.shortcutConfig.removeWindowShortcut(windowId);
        }
        
        // Supprimer du gestionnaire de raccourcis
        return await this.shortcutManager.removeWindowShortcut(windowId);
      });
    });

    ipcMain.handle('organize-windows', async (event, layout) => {
      return performanceMonitor.measureAsync('ipc_organize_windows', async () => {
        console.log(`IPC: organize-windows called with layout: ${layout}`);
        return await this.windowManager.organizeWindows(layout);
      });
    });

    ipcMain.on('show-config', () => {
      console.log('IPC: show-config called');
      this.showConfigWindow();
    });

    ipcMain.handle('close-app', () => {
      console.log('IPC: close-app called');
      this.quit();
    });

    // Nouveaux gestionnaires IPC pour les raccourcis globaux
    ipcMain.handle('activate-next-window', async () => {
      console.log('IPC: activate-next-window called');
      return await this.activateNextWindow();
    });

    ipcMain.handle('toggle-shortcuts', async () => {
      console.log('IPC: toggle-shortcuts called');
      await this.toggleShortcuts();
      return this.shortcutsEnabled;
    });

    ipcMain.handle('get-shortcuts-enabled', () => {
      return this.shortcutsEnabled;
    });

    // Gestion des raccourcis globaux - maintenant en utilisant le fichier de config
    ipcMain.handle('get-global-shortcuts', () => {
      console.log('IPC: get-global-shortcuts called');
      return this.shortcutConfig.getAllGlobalShortcuts();
    });

    ipcMain.handle('set-global-shortcut', async (event, type, shortcut) => {
      return performanceMonitor.measureAsync('ipc_set_global_shortcut', async () => {
        console.log(`IPC: set-global-shortcut called for ${type}: ${shortcut}`);
        
        // Valider le raccourci
        const validation = this.shortcutManager.validateShortcut(shortcut);
        if (!validation.valid) {
          console.warn(`IPC: Invalid or conflicting global shortcut: ${shortcut} - ${validation.reason}`);
          return false;
        }
        
        // Sauvegarder le raccourci dans le fichier de config
        const success = this.shortcutConfig.setGlobalShortcut(type, shortcut);
        if (!success) {
          console.warn(`IPC: Failed to save global shortcut to config: ${shortcut}`);
          return false;
        }
        
        // Réenregistrer les raccourcis globaux
        await this.registerGlobalShortcuts();
        this.updateTrayMenu();
        
        return true;
      });
    });

    ipcMain.handle('remove-global-shortcut', async (event, type) => {
      return performanceMonitor.measureAsync('ipc_remove_global_shortcut', async () => {
        console.log(`IPC: remove-global-shortcut called for: ${type}`);
        this.shortcutConfig.removeGlobalShortcut(type);
        await this.registerGlobalShortcuts();
        this.updateTrayMenu();
      });
    });

    // Gestion du fichier de configuration
    ipcMain.handle('get-shortcut-config-stats', () => {
      return this.shortcutConfig.getStatistics();
    });

    ipcMain.handle('export-shortcut-config', () => {
      return this.shortcutConfig.exportConfig();
    });

    ipcMain.handle('import-shortcut-config', (event, config) => {
      return this.shortcutConfig.importConfig(config);
    });

    // Nouveaux gestionnaires pour les statistiques de performance
    ipcMain.handle('get-performance-stats', () => {
      return {
        shortcutManager: this.shortcutManager.getStats(),
        windowManager: this.windowManager.getStats(),
        performanceMonitor: performanceMonitor.getReport()
      };
    });

    ipcMain.handle('get-performance-report', () => {
      return performanceMonitor.getReport();
    });

    ipcMain.handle('reset-performance-metrics', () => {
      performanceMonitor.reset();
      return true;
    });
  }

  loadSettings() {
    return performanceMonitor.measure('settings_load', () => {
      console.log('DofusOrganizerV2: Loading enhanced settings...');
      
      const language = this.store.get('language', 'FR');
      console.log(`DofusOrganizerV2: Setting language to ${language}`);
      this.languageManager.setLanguage(language);
      
      // Charger l'état d'activation des raccourcis
      this.shortcutsEnabled = this.store.get('shortcutsEnabled', true);
      console.log(`DofusOrganizerV2: Shortcuts enabled: ${this.shortcutsEnabled}`);
      
      // Définir les raccourcis globaux par défaut s'ils ne sont pas définis dans le fichier de config
      if (!this.shortcutConfig.getGlobalShortcut('nextWindow')) {
        this.shortcutConfig.setGlobalShortcut('nextWindow', 'Ctrl+Tab');
      }
      if (!this.shortcutConfig.getGlobalShortcut('toggleShortcuts')) {
        this.shortcutConfig.setGlobalShortcut('toggleShortcuts', 'Ctrl+Shift+D');
      }

      // CORRECTION: Enregistrer seulement les raccourcis globaux au démarrage
      // Les raccourcis de fenêtres seront chargés après la détection des fenêtres
      this.registerGlobalShortcuts();
    });
  }

  // AMÉLIORATION: Charger et enregistrer les raccourcis de fenêtre après la détection des fenêtres
  async loadAndRegisterShortcuts() {
    return performanceMonitor.measureAsync('shortcuts_load_register', async () => {
      if (this.shortcutsLoaded) {
        console.log('DofusOrganizerV2: Shortcuts already loaded, clearing and reloading...');
        // Nettoyer les raccourcis existants avant de recharger
        this.shortcutManager.cleanup();
        this.shortcutsLoaded = false;
      }
      
      console.log('DofusOrganizerV2: Loading and registering window shortcuts from config file...');
      
      let registeredCount = 0;
      
      for (const window of this.dofusWindows) {
        // Mettre à jour le profil du personnage dans la config
        this.shortcutConfig.setCharacterProfile(window.id, window.character, window.dofusClass);
        
        // Essayer de lier un raccourci existant à cette fenêtre
        const existingShortcut = this.shortcutConfig.linkShortcutToWindow(window.character, window.dofusClass, window.id);
        
        if (existingShortcut) {
          console.log(`DofusOrganizerV2: Linking existing shortcut ${existingShortcut} to window ${window.id} (${window.character})`);
          
          const success = await this.shortcutManager.setWindowShortcut(window.id, existingShortcut, async () => {
            console.log(`ShortcutManager: Executing shortcut for window ${window.id}`);
            await this.windowManager.activateWindow(window.id);
          });
          
          if (success) {
            registeredCount++;
            // Mettre à jour les infos de la fenêtre avec le raccourci
            window.shortcut = existingShortcut;
          } else {
            console.warn(`DofusOrganizerV2: Failed to register shortcut ${existingShortcut} for window ${window.id}`);
          }
        }
      }
      
      // Nettoyer les anciennes entrées dans la config
      this.shortcutConfig.cleanupOldEntries(this.dofusWindows);
      
      console.log(`DofusOrganizerV2: Successfully registered ${registeredCount} window shortcuts`);
      this.shortcutsLoaded = true;
      
      // Réenregistrer les raccourcis globaux pour s'assurer qu'ils fonctionnent
      await this.registerGlobalShortcuts();
      
      // Mettre à jour l'UI avec les informations de raccourci
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
      }
      
      if (this.dockWindow && !this.dockWindow.isDestroyed()) {
        this.dockWindow.webContents.send('windows-updated', this.dofusWindows);
      }
    });
  }

  async refreshAndSort() {
    return performanceMonitor.measureAsync('refresh_and_sort', async () => {
      try {
        console.log('DofusOrganizerV2: Enhanced manual refresh requested');
        const windows = await this.windowManager.getDofusWindows();
        console.log(`DofusOrganizerV2: WindowManager returned ${windows.length} windows`);
        
        const hasChanged = JSON.stringify(windows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive, dofusClass: w.dofusClass }))) !== 
                          JSON.stringify(this.dofusWindows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive, dofusClass: w.dofusClass })));
        
        // FORCE UPDATE: Toujours mettre à jour le tableau pour s'assurer que l'IPC obtient des données fraîches
        const forceUpdate = this.dofusWindows.length === 0 && windows.length > 0;
        
        if (hasChanged || this.dofusWindows.length !== windows.length || forceUpdate) {
          console.log(`DofusOrganizerV2: Window list updating... (hasChanged: ${hasChanged}, lengthDiff: ${this.dofusWindows.length !== windows.length}, forceUpdate: ${forceUpdate})`);
          
          // Charger les raccourcis depuis la config pour chaque fenêtre basé sur le nom du personnage
          windows.forEach(window => {
            const existingShortcut = this.shortcutConfig.getCharacterShortcut(window.character, window.dofusClass);
            if (existingShortcut) {
              window.shortcut = existingShortcut;
            }
          });
          
          this.dofusWindows = windows;
          console.log(`DofusOrganizerV2: Updated dofusWindows array, now has ${this.dofusWindows.length} windows`);
          this.updateTrayTooltip();
          
          // CORRECTION PRINCIPALE: TOUJOURS recharger les raccourcis après un refresh
          console.log('DofusOrganizerV2: Refresh detected changes, reloading shortcuts...');
          await this.loadAndRegisterShortcuts();
          
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            console.log('DofusOrganizerV2: Sending windows-updated to config window');
            this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
          }
          
          if (this.dockWindow && !this.dockWindow.isDestroyed()) {
            console.log('DofusOrganizerV2: Sending windows-updated to dock window');
            this.dockWindow.webContents.send('windows-updated', this.dofusWindows);
          }
          
          // Mettre à jour la visibilité du dock
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
          
          // Notifier du changement
          this.notificationManager.showInfo(
            `Found ${windows.length} Dofus windows`,
            { duration: 2000 }
          );
        } else {
          console.log(`DofusOrganizerV2: No changes in window list (current: ${this.dofusWindows.length}, new: ${windows.length})`);
          // Mais quand même mettre à jour le tableau pour assurer la cohérence
          this.dofusWindows = windows;
        }
      } catch (error) {
        console.error('DofusOrganizerV2: Error refreshing windows:', error);
        this.notificationManager.showError('Error refreshing windows', { duration: 3000 });
      }
    });
  }

  updateTrayTooltip() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowCount = this.dofusWindows.length;
    const enabledCount = this.dofusWindows.filter(w => w.enabled).length;
    
    let tooltip = `Dofus Organizer v2.0\n`;
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
    
    // Ajouter les statistiques de performance
    const shortcutStats = this.shortcutManager.getStats();
    const windowStats = this.windowManager.getStats();
    
    tooltip += `\nPerformance: ${shortcutStats.avgActivationTime.toFixed(0)}ms avg`;
    
    console.log(`DofusOrganizerV2: Updating enhanced tray tooltip: ${tooltip}`);
    this.tray.setToolTip(tooltip);
  }

  changeLanguage(langCode) {
    return performanceMonitor.measure('language_change', () => {
      console.log(`DofusOrganizerV2: Changing language to ${langCode}`);
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
      this.notificationManager.showSuccess(`Language changed to ${langCode}`, { duration: 2000 });
    });
  }

  async activateShortcuts() {
    return performanceMonitor.measureAsync('shortcuts_activation', async () => {
      if (this.shortcutsEnabled) {
        console.log('DofusOrganizerV2: Activating enhanced shortcuts');
        await this.shortcutManager.activateAll();
        // Réenregistrer les raccourcis globaux
        await this.registerGlobalShortcuts();
      }
    });
  }

  deactivateShortcuts() {
    return performanceMonitor.measure('shortcuts_deactivation', () => {
      console.log('DofusOrganizerV2: Deactivating shortcuts');
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
          console.log('DofusOrganizerV2: Keeping toggle shortcut active while shortcuts are disabled');
        }
      }
    });
  }

  cleanup() {
    return performanceMonitor.measure('application_cleanup', () => {
      console.log('DofusOrganizerV2: Cleaning up enhanced application...');
      
      // Nettoyer le gestionnaire de raccourcis
      this.shortcutManager.cleanup();
      
      // Nettoyer le gestionnaire de fenêtres
      this.windowManager.cleanup();
      
      // Nettoyer le gestionnaire de notifications
      this.notificationManager.cleanup();
      
      // Désenregistrer les raccourcis globaux
      try {
        this.unregisterGlobalShortcuts();
        globalShortcut.unregisterAll();
      } catch (error) {
        console.error('DofusOrganizerV2: Error unregistering global shortcuts:', error);
      }
      
      // Afficher un rapport final de performance
      const finalReport = performanceMonitor.getReport();
      console.log('=== FINAL PERFORMANCE REPORT ===');
      console.log('Summary:', finalReport.summary);
      console.log('Total Operations:', finalReport.summary.totalOperations);
      console.log('================================');
    });
  }

  quit() {
    console.log('DofusOrganizerV2: Quitting enhanced application...');
    this.cleanup();
    if (this.dockWindow && !this.dockWindow.isDestroyed()) this.dockWindow.close();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.close();
    app.quit();
  }
}

// Initialiser l'application
console.log('Starting Dofus Organizer v2.0 with Enhanced Performance...');
new DofusOrganizerV2();