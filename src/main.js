const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const ShortcutManager = require('./services/ShortcutManager');
const LanguageManager = require('./services/LanguageManager');

// Import the appropriate WindowManager based on platform
let WindowManager;
if (process.platform === 'win32') {
  WindowManager = require('./services/WindowManagerWindows');
} else {
  WindowManager = require('./services/WindowManager');
}

class DofusOrganizer {
  constructor() {
    this.store = new Store();
    this.mainWindow = null;
    this.tray = null;
    this.dockWindow = null;
    this.windowManager = new WindowManager();
    this.shortcutManager = new ShortcutManager();
    this.languageManager = new LanguageManager();
    this.isConfiguring = false;
    this.dofusWindows = [];
    this.windowMonitorInterval = null;
    this.shortcutsEnabled = true;
    this.globalShortcuts = {
      nextWindow: null,
      toggleShortcuts: null
    };
    this.isTogglingShortcuts = false; // Prevent infinite loops
    
    console.log('DofusOrganizer: Initializing application...');
    this.initializeApp();
  }

  initializeApp() {
    app.whenReady().then(() => {
      console.log('DofusOrganizer: App ready, setting up...');
      this.createTray();
      this.setupEventHandlers();
      this.loadSettings();
      this.startWindowMonitoring();
    });

    app.on('window-all-closed', (e) => {
      e.preventDefault(); // Keep app running in tray
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

  createTray() {
    const iconPath = path.join(__dirname, '../assets/icons/organizer.png');
    console.log('DofusOrganizer: Creating tray with icon:', iconPath);
    this.tray = new Tray(iconPath);
    this.updateTrayMenu();
    
    this.tray.setToolTip('Dofus Organizer');
    this.tray.on('click', () => {
      console.log('DofusOrganizer: Tray clicked, showing config window');
      this.showConfigWindow();
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });
  }

  updateTrayMenu() {
    const lang = this.languageManager.getCurrentLanguage();
    
    console.log('DofusOrganizer: Updating tray menu');
    
    const nextWindowShortcut = this.store.get('globalShortcuts.nextWindow', 'Ctrl+Tab');
    const toggleShortcutsShortcut = this.store.get('globalShortcuts.toggleShortcuts', 'Ctrl+Shift+D');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: lang.main_configure,
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
        label: lang.main_quit,
        click: () => this.quit()
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  showConfigWindow() {
    console.log('DofusOrganizer: showConfigWindow called');
    
    if (this.mainWindow) {
      console.log('DofusOrganizer: Config window already exists, focusing...');
      this.mainWindow.focus();
      return;
    }

    console.log('DofusOrganizer: Creating new config window...');
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
      title: 'Dofus Organizer - Configuration',
      show: false,
      frame: false,  // Remove title bar and menu bar
      titleBarStyle: 'hidden'  // Hide title bar on macOS
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/config.html'));
    
    this.mainWindow.once('ready-to-show', () => {
      console.log('DofusOrganizer: Config window ready to show');
      this.mainWindow.show();
      
      // Force refresh windows when config opens
      setTimeout(() => {
        console.log('DofusOrganizer: Forcing window refresh for config...');
        this.refreshAndSort();
        
        // Also force send current windows to the renderer
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            console.log(`DofusOrganizer: Force sending ${this.dofusWindows.length} windows to config renderer`);
            this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
          }
        }, 500);
      }, 1000);
    });

    this.mainWindow.on('closed', () => {
      console.log('DofusOrganizer: Config window closed');
      this.mainWindow = null;
      this.isConfiguring = false;
      this.activateShortcuts();
    });

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
    const windowCount = enabledWindows.length + 2; // +2 for refresh and config buttons
    
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

    // Prevent dock from stealing focus
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

  // New method: Activate next window
  activateNextWindow() {
    const enabledWindows = this.dofusWindows.filter(w => w.enabled);
    if (enabledWindows.length === 0) return;

    // Sort by initiative (descending), then by character name
    enabledWindows.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return a.character.localeCompare(b.character);
    });

    // Find current active window
    const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);
    
    // Get next window (cycle to first if at end)
    const nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
    const nextWindow = enabledWindows[nextIndex];
    
    if (nextWindow) {
      console.log(`DofusOrganizer: Activating next window: ${nextWindow.character}`);
      this.windowManager.activateWindow(nextWindow.id);
    }
  }

  // New method: Toggle shortcuts on/off
  toggleShortcuts() {
    // Prevent infinite loops
    if (this.isTogglingShortcuts) {
      console.log('DofusOrganizer: Toggle already in progress, ignoring...');
      return;
    }
    
    this.isTogglingShortcuts = true;
    
    try {
      this.shortcutsEnabled = !this.shortcutsEnabled;
      this.store.set('shortcutsEnabled', this.shortcutsEnabled);
      
      console.log(`DofusOrganizer: Shortcuts ${this.shortcutsEnabled ? 'enabled' : 'disabled'}`);
      
      if (this.shortcutsEnabled && !this.isConfiguring) {
        this.activateShortcuts();
      } else {
        this.deactivateShortcuts();
      }
      
      this.updateTrayMenu();
      
      // Notify user
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('shortcuts-toggled', this.shortcutsEnabled);
      }
    } finally {
      // Reset the flag after a short delay
      setTimeout(() => {
        this.isTogglingShortcuts = false;
      }, 500);
    }
  }

  // Register global shortcuts
  registerGlobalShortcuts() {
    try {
      // Unregister existing global shortcuts
      this.unregisterGlobalShortcuts();
      
      const nextWindowShortcut = this.store.get('globalShortcuts.nextWindow');
      const toggleShortcutsShortcut = this.store.get('globalShortcuts.toggleShortcuts');
      
      // Register next window shortcut (only when shortcuts are enabled)
      if (nextWindowShortcut && this.shortcutsEnabled) {
        const accelerator = this.shortcutManager.convertShortcutToAccelerator(nextWindowShortcut);
        if (accelerator) {
          const success = globalShortcut.register(accelerator, () => {
            this.activateNextWindow();
          });
          
          if (success) {
            this.globalShortcuts.nextWindow = accelerator;
            console.log(`DofusOrganizer: Registered next window shortcut: ${accelerator}`);
          } else {
            console.warn(`DofusOrganizer: Failed to register next window shortcut: ${accelerator}`);
          }
        }
      }
      
      // CRITICAL: Toggle shortcuts shortcut should ALWAYS work
      if (toggleShortcutsShortcut) {
        const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
        if (accelerator) {
          const success = globalShortcut.register(accelerator, () => {
            // This shortcut always works, even when shortcuts are disabled
            this.toggleShortcuts();
          });
          
          if (success) {
            this.globalShortcuts.toggleShortcuts = accelerator;
            console.log(`DofusOrganizer: Registered toggle shortcuts shortcut: ${accelerator}`);
          } else {
            console.warn(`DofusOrganizer: Failed to register toggle shortcuts shortcut: ${accelerator}`);
          }
        }
      }
      
    } catch (error) {
      console.error('DofusOrganizer: Error registering global shortcuts:', error);
    }
  }

  // Unregister global shortcuts
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
      console.error('DofusOrganizer: Error unregistering global shortcuts:', error);
    }
  }

  setupEventHandlers() {
    console.log('DofusOrganizer: Setting up IPC event handlers...');
    
    // IPC handlers for renderer processes
    ipcMain.handle('get-dofus-windows', () => {
      console.log(`IPC: get-dofus-windows called, returning ${this.dofusWindows.length} windows`);
      console.log(`IPC: Windows data:`, this.dofusWindows.map(w => ({ 
        id: w.id, 
        title: w.title, 
        character: w.character,
        dofusClass: w.dofusClass,
        enabled: w.enabled 
      })));
      return this.dofusWindows;
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
    
    ipcMain.handle('save-settings', (event, settings) => {
      console.log('IPC: save-settings called with:', Object.keys(settings));
      Object.keys(settings).forEach(key => {
        this.store.set(key, settings[key]);
      });
      
      // Special handling for class changes
      const classChanges = Object.keys(settings).filter(key => key.startsWith('classes.'));
      if (classChanges.length > 0) {
        classChanges.forEach(key => {
          const windowId = key.replace('classes.', '');
          const classKey = settings[key];
          this.windowManager.setWindowClass(windowId, classKey);
        });
        
        // Force refresh to update avatars
        setTimeout(() => this.refreshAndSort(), 100);
      }
      
      // Handle global shortcut changes
      const globalShortcutChanges = Object.keys(settings).filter(key => key.startsWith('globalShortcuts.'));
      if (globalShortcutChanges.length > 0) {
        console.log('DofusOrganizer: Global shortcuts changed, re-registering...');
        setTimeout(() => this.registerGlobalShortcuts(), 100);
        this.updateTrayMenu();
      }
      
      // Update dock if settings changed
      if (settings.dock) {
        this.hideDockWindow();
        if (settings.dock.enabled) {
          setTimeout(() => this.showDockWindow(), 100);
        }
      }
    });
    
    ipcMain.handle('activate-window', async (event, windowId) => {
      console.log(`IPC: activate-window called for: ${windowId}`);
      
      try {
        const result = await this.windowManager.activateWindow(windowId);
        
        // Enhanced activation with immediate feedback
        if (result) {
          // Update the active state in our local data immediately
          this.dofusWindows.forEach(w => {
            w.isActive = w.id === windowId;
          });
          
          // Notify all windows about the state change immediately
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
    
    ipcMain.handle('refresh-windows', () => {
      console.log('IPC: refresh-windows called');
      return this.refreshAndSort();
    });
    
    ipcMain.handle('set-shortcut', (event, windowId, shortcut) => {
      console.log(`IPC: set-shortcut called for ${windowId}: ${shortcut}`);
      
      // Validate shortcut before setting
      if (!this.shortcutManager.validateShortcut(shortcut)) {
        console.warn(`IPC: Invalid or conflicting shortcut: ${shortcut}`);
        return false;
      }
      
      return this.shortcutManager.setWindowShortcut(windowId, shortcut, async () => {
        console.log(`ShortcutManager: Executing shortcut for window ${windowId}`);
        await this.windowManager.activateWindow(windowId);
      });
    });
    
    ipcMain.handle('remove-shortcut', (event, windowId) => {
      console.log(`IPC: remove-shortcut called for: ${windowId}`);
      this.shortcutManager.removeWindowShortcut(windowId);
    });

    ipcMain.handle('organize-windows', (event, layout) => {
      console.log(`IPC: organize-windows called with layout: ${layout}`);
      return this.windowManager.organizeWindows(layout);
    });

    ipcMain.on('show-config', () => {
      console.log('IPC: show-config called');
      this.showConfigWindow();
    });

    ipcMain.handle('close-app', () => {
      console.log('IPC: close-app called');
      this.quit();
    });

    // New IPC handlers for global shortcuts
    ipcMain.handle('activate-next-window', () => {
      console.log('IPC: activate-next-window called');
      this.activateNextWindow();
    });

    ipcMain.handle('toggle-shortcuts', () => {
      console.log('IPC: toggle-shortcuts called');
      this.toggleShortcuts();
      return this.shortcutsEnabled;
    });

    ipcMain.handle('get-shortcuts-enabled', () => {
      return this.shortcutsEnabled;
    });

    // Global shortcuts management
    ipcMain.handle('get-global-shortcuts', () => {
      console.log('IPC: get-global-shortcuts called');
      return {
        nextWindow: this.store.get('globalShortcuts.nextWindow', 'Ctrl+Tab'),
        toggleShortcuts: this.store.get('globalShortcuts.toggleShortcuts', 'Ctrl+Shift+D')
      };
    });

    ipcMain.handle('set-global-shortcut', (event, type, shortcut) => {
      console.log(`IPC: set-global-shortcut called for ${type}: ${shortcut}`);
      
      // Validate shortcut
      if (!this.shortcutManager.validateShortcut(shortcut)) {
        console.warn(`IPC: Invalid or conflicting global shortcut: ${shortcut}`);
        return false;
      }
      
      // Save the shortcut
      this.store.set(`globalShortcuts.${type}`, shortcut);
      
      // Re-register global shortcuts
      this.registerGlobalShortcuts();
      this.updateTrayMenu();
      
      return true;
    });

    ipcMain.handle('remove-global-shortcut', (event, type) => {
      console.log(`IPC: remove-global-shortcut called for: ${type}`);
      this.store.delete(`globalShortcuts.${type}`);
      this.registerGlobalShortcuts();
      this.updateTrayMenu();
    });
  }

  loadSettings() {
    console.log('DofusOrganizer: Loading settings...');
    
    const language = this.store.get('language', 'FR');
    console.log(`DofusOrganizer: Setting language to ${language}`);
    this.languageManager.setLanguage(language);
    
    // Load shortcuts enabled state
    this.shortcutsEnabled = this.store.get('shortcutsEnabled', true);
    console.log(`DofusOrganizer: Shortcuts enabled: ${this.shortcutsEnabled}`);
    
    // Set default global shortcuts if not set
    if (!this.store.get('globalShortcuts.nextWindow')) {
      this.store.set('globalShortcuts.nextWindow', 'Ctrl+Tab');
    }
    if (!this.store.get('globalShortcuts.toggleShortcuts')) {
      this.store.set('globalShortcuts.toggleShortcuts', 'Ctrl+Shift+D');
    }

    // Register global shortcuts FIRST
    this.registerGlobalShortcuts();
    
    // Load and register window shortcuts
    const shortcuts = this.store.get('shortcuts', {});
    console.log(`DofusOrganizer: Loading ${Object.keys(shortcuts).length} window shortcuts`);
    Object.keys(shortcuts).forEach(windowId => {
      this.shortcutManager.setWindowShortcut(windowId, shortcuts[windowId], async () => {
        console.log(`ShortcutManager: Executing shortcut for window ${windowId}`);
        await this.windowManager.activateWindow(windowId);
      });
    });
  }

  startWindowMonitoring() {
    console.log('DofusOrganizer: Starting window monitoring...');
    this.refreshAndSort();
    
    // Monitor windows every 3 seconds
    this.windowMonitorInterval = setInterval(() => {
      if (!this.isConfiguring) {
        console.log('DofusOrganizer: Periodic window refresh...');
        this.refreshAndSort();
      }
    }, 3000);
  }

  async refreshAndSort() {
    try {
      console.log('DofusOrganizer: refreshAndSort called');
      const windows = await this.windowManager.getDofusWindows();
      console.log(`DofusOrganizer: WindowManager returned ${windows.length} windows`);
      
      const hasChanged = JSON.stringify(windows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive, dofusClass: w.dofusClass }))) !== 
                        JSON.stringify(this.dofusWindows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive, dofusClass: w.dofusClass })));
      
      // FORCE UPDATE: Always update the array to ensure IPC gets fresh data
      const forceUpdate = this.dofusWindows.length === 0 && windows.length > 0;
      
      if (hasChanged || this.dofusWindows.length !== windows.length || forceUpdate) {
        console.log(`DofusOrganizer: Window list updating... (hasChanged: ${hasChanged}, lengthDiff: ${this.dofusWindows.length !== windows.length}, forceUpdate: ${forceUpdate})`);
        this.dofusWindows = windows;
        console.log(`DofusOrganizer: Updated dofusWindows array, now has ${this.dofusWindows.length} windows`);
        this.updateTrayTooltip();
        
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          console.log('DofusOrganizer: Sending windows-updated to config window');
          this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
        }
        
        if (this.dockWindow && !this.dockWindow.isDestroyed()) {
          console.log('DofusOrganizer: Sending windows-updated to dock window');
          this.dockWindow.webContents.send('windows-updated', this.dofusWindows);
        }
        
        // Update dock visibility
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
      } else {
        console.log(`DofusOrganizer: No changes in window list (current: ${this.dofusWindows.length}, new: ${windows.length})`);
        // But still update the array to ensure consistency
        this.dofusWindows = windows;
      }
    } catch (error) {
      console.error('DofusOrganizer: Error refreshing windows:', error);
    }
  }

  updateTrayTooltip() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowCount = this.dofusWindows.length;
    const enabledCount = this.dofusWindows.filter(w => w.enabled).length;
    
    let tooltip = `Dofus Organizer\n`;
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
    
    console.log(`DofusOrganizer: Updating tray tooltip: ${tooltip}`);
    this.tray.setToolTip(tooltip);
  }

  changeLanguage(langCode) {
    console.log(`DofusOrganizer: Changing language to ${langCode}`);
    this.languageManager.setLanguage(langCode);
    this.store.set('language', langCode);
    this.updateTrayMenu();
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('language-changed', this.languageManager.getCurrentLanguage());
    }
    
    if (this.dockWindow && !this.dockWindow.isDestroyed()) {
      this.dockWindow.webContents.send('language-changed', this.languageManager.getCurrentLanguage());
    }
  }

  activateShortcuts() {
    if (this.shortcutsEnabled) {
      console.log('DofusOrganizer: Activating shortcuts');
      this.shortcutManager.activateAll();
      // Re-register global shortcuts
      this.registerGlobalShortcuts();
    }
  }

  deactivateShortcuts() {
    console.log('DofusOrganizer: Deactivating shortcuts');
    this.shortcutManager.deactivateAll();
    
    // IMPORTANT: Keep the toggle shortcut active even when shortcuts are disabled
    const toggleShortcutsShortcut = this.store.get('globalShortcuts.toggleShortcuts');
    if (toggleShortcutsShortcut) {
      const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
      if (accelerator && !globalShortcut.isRegistered(accelerator)) {
        globalShortcut.register(accelerator, () => {
          this.toggleShortcuts();
        });
        this.globalShortcuts.toggleShortcuts = accelerator;
        console.log('DofusOrganizer: Keeping toggle shortcut active while shortcuts are disabled');
      }
    }
  }

  cleanup() {
    console.log('DofusOrganizer: Cleaning up...');
    if (this.windowMonitorInterval) {
      clearInterval(this.windowMonitorInterval);
    }
    this.shortcutManager.cleanup();
    
    // Unregister global shortcuts
    try {
      this.unregisterGlobalShortcuts();
      globalShortcut.unregisterAll();
    } catch (error) {
      console.error('DofusOrganizer: Error unregistering global shortcuts:', error);
    }
    
    // Clean up Windows-specific resources
    if (this.windowManager && typeof this.windowManager.cleanup === 'function') {
      this.windowManager.cleanup();
    }
  }

  quit() {
    console.log('DofusOrganizer: Quitting application...');
    this.cleanup();
    if (this.dockWindow && !this.dockWindow.isDestroyed()) this.dockWindow.close();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.close();
    app.quit();
  }
}

// Initialize the application
console.log('Starting Dofus Organizer...');
new DofusOrganizer();