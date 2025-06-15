            console.log(`DofusOrganizerPython: Sending current ${this.dofusWindows.length} windows to config`);
            this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
          }
        }, 500);
      });

      this.mainWindow.on('closed', () => {
        console.log('DofusOrganizerPython: Python config window closed');
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