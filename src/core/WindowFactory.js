
const { BrowserWindow, screen } = require('electron');
const path = require('path');

class WindowFactory {
  constructor(context) {
    this.context = context;
  }

  showConfigWindow() {
    if (this.context.mainWindow) {
      this.context.windowActivator.focusWindow('config-window');
      return;
    }

    const mainWindow = new BrowserWindow({
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
      frame: false,
      titleBarStyle: 'hidden'
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/config.html'));

    mainWindow.once('ready-to-show', () => {
      this.context.windowActivator.bringWindowToFront('config-window');
    });

    mainWindow.on('closed', () => {
      this.context.mainWindow = null;
      this.context.isConfiguring = false;
    });

    this.context.mainWindow = mainWindow;
    this.context.isConfiguring = true;
  }

  showDockWindow() {
    const dockSettings = this.context.store.get('dock', { enabled: false, position: 'SE' });
    if (!dockSettings.enabled || this.context.dockWindow) return;

    const enabledWindows = this.context.dofusWindows.filter(w => w.enabled);
    if (enabledWindows.length === 0) return;

    const displays = screen.getAllDisplays();
    const primary = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) || displays[0];
    const dockSize = 70;
    const itemWidth = 60;
    const count = enabledWindows.length + 2;
    const width = Math.min(600, count * itemWidth);
    const height = dockSize;

    let x = primary.bounds.x;
    let y = primary.bounds.y;

    switch (dockSettings.position) {
      case 'NE':
        x = primary.bounds.x + primary.bounds.width - width - 10;
        y = primary.bounds.y + 10;
        break;
      case 'SW':
        y = primary.bounds.y + primary.bounds.height - height - 10;
        break;
      case 'SE':
        x = primary.bounds.x + primary.bounds.width - width - 10;
        y = primary.bounds.y + primary.bounds.height - height - 10;
        break;
      case 'N':
        x = primary.bounds.x + (primary.bounds.width - width) / 2;
        y = primary.bounds.y + 10;
        break;
      case 'S':
        x = primary.bounds.x + (primary.bounds.width - width) / 2;
        y = primary.bounds.y + primary.bounds.height - height - 10;
        break;
    }

    const dockWindow = new BrowserWindow({
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

    dockWindow.loadFile(path.join(__dirname, '../renderer/dock.html'));

    dockWindow.on('closed', () => {
      this.context.dockWindow = null;
    });

    this.context.windowActivator.bringWindowToFront('dock-window');
    this.context.dockWindow = dockWindow;
  }
}

module.exports = WindowFactory;
