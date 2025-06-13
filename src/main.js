const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const WindowManager = require('./services/WindowManager');
const ShortcutManager = require('./services/ShortcutManager');
const LanguageManager = require('./services/LanguageManager');

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
    
    this.initializeApp();
  }

  initializeApp() {
    app.whenReady().then(() => {
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
    this.tray = new Tray(iconPath);
    this.updateTrayMenu();
    
    this.tray.setToolTip('Dofus Organizer');
    this.tray.on('click', () => {
      this.showConfigWindow();
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });
  }

  updateTrayMenu() {
    const lang = this.languageManager.getCurrentLanguage();
    const gameType = this.store.get('globalGameType', 'dofus2');
    const gameTypeLabels = {
      'dofus2': 'Dofus 2',
      'dofus3': 'Dofus 3',
      'retro': 'Dofus Retro'
    };
    
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
        label: `Game Type: ${gameTypeLabels[gameType]}`,
        submenu: [
          {
            label: 'Dofus 2',
            type: 'radio',
            checked: gameType === 'dofus2',
            click: () => this.changeGameType('dofus2')
          },
          {
            label: 'Dofus 3',
            type: 'radio',
            checked: gameType === 'dofus3',
            click: () => this.changeGameType('dofus3')
          },
          {
            label: 'Dofus Retro',
            type: 'radio',
            checked: gameType === 'retro',
            click: () => this.changeGameType('retro')
          }
        ]
      },
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

  changeGameType(gameType) {
    this.store.set('globalGameType', gameType);
    this.windowManager.setGlobalGameType(gameType);
    this.updateTrayMenu();
    
    // Refresh windows to apply new detection
    setTimeout(() => this.refreshAndSort(), 500);
  }

  showConfigWindow() {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

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
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/config.html'));
    
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
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

  setupEventHandlers() {
    // IPC handlers for renderer processes
    ipcMain.handle('get-dofus-windows', () => this.dofusWindows);
    ipcMain.handle('get-language', () => this.languageManager.getCurrentLanguage());
    ipcMain.handle('get-settings', () => this.store.store);
    
    ipcMain.handle('save-settings', (event, settings) => {
      Object.keys(settings).forEach(key => {
        this.store.set(key, settings[key]);
      });
      
      // Update dock if settings changed
      if (settings.dock) {
        this.hideDockWindow();
        if (settings.dock.enabled) {
          setTimeout(() => this.showDockWindow(), 100);
        }
      }
    });
    
    ipcMain.handle('activate-window', (event, windowId) => {
      return this.windowManager.activateWindow(windowId);
    });
    
    ipcMain.handle('refresh-windows', () => this.refreshAndSort());
    
    ipcMain.handle('set-shortcut', (event, windowId, shortcut) => {
      return this.shortcutManager.setWindowShortcut(windowId, shortcut, () => {
        this.windowManager.activateWindow(windowId);
      });
    });
    
    ipcMain.handle('remove-shortcut', (event, windowId) => {
      this.shortcutManager.removeWindowShortcut(windowId);
    });

    ipcMain.handle('set-game-type', (event, gameType) => {
      this.changeGameType(gameType);
    });

    ipcMain.handle('organize-windows', (event, layout) => {
      return this.windowManager.organizeWindows(layout);
    });

    ipcMain.on('show-config', () => {
      this.showConfigWindow();
    });

    ipcMain.handle('close-app', () => {
      this.quit();
    });
  }

  loadSettings() {
    const language = this.store.get('language', 'FR');
    this.languageManager.setLanguage(language);
    
    // Load and set global game type
    const gameType = this.store.get('globalGameType', 'dofus2');
    this.windowManager.setGlobalGameType(gameType);
    
    // Load and register shortcuts
    const shortcuts = this.store.get('shortcuts', {});
    Object.keys(shortcuts).forEach(windowId => {
      this.shortcutManager.setWindowShortcut(windowId, shortcuts[windowId], () => {
        this.windowManager.activateWindow(windowId);
      });
    });
  }

  startWindowMonitoring() {
    this.refreshAndSort();
    
    // Monitor windows every 3 seconds
    this.windowMonitorInterval = setInterval(() => {
      if (!this.isConfiguring) {
        this.refreshAndSort();
      }
    }, 3000);
  }

  async refreshAndSort() {
    try {
      const windows = await this.windowManager.getDofusWindows();
      const hasChanged = JSON.stringify(windows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive }))) !== 
                        JSON.stringify(this.dofusWindows.map(w => ({ id: w.id, title: w.title, isActive: w.isActive })));
      
      if (hasChanged) {
        this.dofusWindows = windows;
        this.updateTrayTooltip();
        
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
        }
        
        if (this.dockWindow && !this.dockWindow.isDestroyed()) {
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
      }
    } catch (error) {
      console.error('Error refreshing windows:', error);
    }
  }

  updateTrayTooltip() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowCount = this.dofusWindows.length;
    const enabledCount = this.dofusWindows.filter(w => w.enabled).length;
    const gameType = this.store.get('globalGameType', 'dofus2');
    const gameTypeLabels = {
      'dofus2': 'Dofus 2',
      'dofus3': 'Dofus 3',
      'retro': 'Dofus Retro'
    };
    
    let tooltip = `Dofus Organizer (${gameTypeLabels[gameType]})\n`;
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
    
    this.tray.setToolTip(tooltip);
  }

  changeLanguage(langCode) {
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
    this.shortcutManager.activateAll();
  }

  deactivateShortcuts() {
    this.shortcutManager.deactivateAll();
  }

  cleanup() {
    if (this.windowMonitorInterval) {
      clearInterval(this.windowMonitorInterval);
    }
    this.shortcutManager.cleanup();
  }

  quit() {
    this.cleanup();
    if (this.dockWindow && !this.dockWindow.isDestroyed()) this.dockWindow.close();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.close();
    app.quit();
  }
}

// Initialize the application
new DofusOrganizer();