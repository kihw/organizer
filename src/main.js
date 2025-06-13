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
  }

  createTray() {
    this.tray = new Tray(path.join(__dirname, '../assets/icons/organizer.png'));
    this.updateTrayMenu();
    
    this.tray.setToolTip('Dofus Organizer');
    this.tray.on('click', () => {
      this.showConfigWindow();
    });
  }

  updateTrayMenu() {
    const lang = this.languageManager.getCurrentLanguage();
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
        label: lang.main_language,
        submenu: this.languageManager.getLanguageMenu((langCode) => {
          this.changeLanguage(langCode);
        })
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
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      icon: path.join(__dirname, '../assets/icons/organizer.png'),
      title: 'Dofus Organizer - Configuration'
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/config.html'));
    
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

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays.find(display => display.bounds.x === 0 && display.bounds.y === 0) || displays[0];
    
    let x, y, width, height;
    const dockSize = 60;
    const windowCount = this.dofusWindows.length;
    
    switch (dockSettings.position) {
      case 'NW': // Top-left
        x = primaryDisplay.bounds.x;
        y = primaryDisplay.bounds.y;
        width = Math.min(400, windowCount * 50);
        height = dockSize;
        break;
      case 'NE': // Top-right
        x = primaryDisplay.bounds.x + primaryDisplay.bounds.width - Math.min(400, windowCount * 50);
        y = primaryDisplay.bounds.y;
        width = Math.min(400, windowCount * 50);
        height = dockSize;
        break;
      case 'SW': // Bottom-left
        x = primaryDisplay.bounds.x;
        y = primaryDisplay.bounds.y + primaryDisplay.bounds.height - dockSize;
        width = Math.min(400, windowCount * 50);
        height = dockSize;
        break;
      case 'SE': // Bottom-right (default)
      default:
        x = primaryDisplay.bounds.x + primaryDisplay.bounds.width - Math.min(400, windowCount * 50);
        y = primaryDisplay.bounds.y + primaryDisplay.bounds.height - dockSize;
        width = Math.min(400, windowCount * 50);
        height = dockSize;
        break;
    }

    this.dockWindow = new BrowserWindow({
      x, y, width, height,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.dockWindow.loadFile(path.join(__dirname, 'renderer/dock.html'));
    
    this.dockWindow.on('closed', () => {
      this.dockWindow = null;
    });
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
    });
    ipcMain.handle('activate-window', (event, windowId) => {
      this.windowManager.activateWindow(windowId);
    });
    ipcMain.handle('refresh-windows', () => this.refreshAndSort());
    ipcMain.handle('set-shortcut', (event, windowId, shortcut) => {
      this.shortcutManager.setWindowShortcut(windowId, shortcut, () => {
        this.windowManager.activateWindow(windowId);
      });
    });
    ipcMain.handle('remove-shortcut', (event, windowId) => {
      this.shortcutManager.removeWindowShortcut(windowId);
    });
  }

  loadSettings() {
    const language = this.store.get('language', 'FR');
    this.languageManager.setLanguage(language);
    
    const shortcuts = this.store.get('shortcuts', {});
    Object.keys(shortcuts).forEach(windowId => {
      this.shortcutManager.setWindowShortcut(windowId, shortcuts[windowId], () => {
        this.windowManager.activateWindow(windowId);
      });
    });
  }

  startWindowMonitoring() {
    this.refreshAndSort();
    
    // Monitor windows every 5 seconds
    setInterval(() => {
      if (!this.isConfiguring) {
        this.refreshAndSort();
      }
    }, 5000);
  }

  async refreshAndSort() {
    try {
      const windows = await this.windowManager.getDofusWindows();
      const hasChanged = JSON.stringify(windows) !== JSON.stringify(this.dofusWindows);
      
      if (hasChanged) {
        this.dofusWindows = windows;
        this.updateTrayTooltip();
        
        if (this.mainWindow) {
          this.mainWindow.webContents.send('windows-updated', this.dofusWindows);
        }
        
        if (this.dockWindow) {
          this.dockWindow.webContents.send('windows-updated', this.dofusWindows);
        }
        
        // Show dock if enabled
        const dockSettings = this.store.get('dock', { enabled: false });
        if (dockSettings.enabled && !this.dockWindow) {
          this.showDockWindow();
        }
      }
    } catch (error) {
      console.error('Error refreshing windows:', error);
    }
  }

  updateTrayTooltip() {
    const lang = this.languageManager.getCurrentLanguage();
    const windowCount = this.dofusWindows.length;
    
    let tooltip = 'Dofus Organizer\n';
    if (windowCount === 0) {
      tooltip += lang.displayTray_element_0;
    } else if (windowCount === 1) {
      tooltip += lang.displayTray_element_1;
    } else {
      tooltip += lang.displayTray_element_N.replace('{0}', windowCount);
    }
    
    this.tray.setToolTip(tooltip);
  }

  changeLanguage(langCode) {
    this.languageManager.setLanguage(langCode);
    this.store.set('language', langCode);
    this.updateTrayMenu();
    
    if (this.mainWindow) {
      this.mainWindow.webContents.send('language-changed', this.languageManager.getCurrentLanguage());
    }
  }

  activateShortcuts() {
    this.shortcutManager.activateAll();
  }

  deactivateShortcuts() {
    this.shortcutManager.deactivateAll();
  }

  quit() {
    this.shortcutManager.cleanup();
    if (this.dockWindow) this.dockWindow.close();
    if (this.mainWindow) this.mainWindow.close();
    app.quit();
  }
}

// Initialize the application
new DofusOrganizer();