
const { Tray, Menu } = require('electron');
const path = require('path');

class TrayManager {
  constructor(context) {
    this.context = context;
    this.tray = null;
  }

  init() {
    const iconPath = path.join(__dirname, '../assets/icons/organizer.png');
    this.tray = new Tray(iconPath);
    this.tray.setToolTip('Dofus Organizer');

    this.tray.on('click', () => {
      this.context.windowActivator.focusWindow('config-window');
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });

    this.updateMenu();
  }

  updateMenu() {
    const { languageManager, shortcutConfig, store, dofusWindows } = this.context;
    const lang = languageManager.getCurrentLanguage();
    const shortcuts = {
      nextWindow: shortcutConfig.getGlobalShortcut('nextWindow') || 'Ctrl+Tab',
      toggleShortcuts: shortcutConfig.getGlobalShortcut('toggleShortcuts') || 'Ctrl+Shift+D'
    };

    const menu = Menu.buildFromTemplate([
      { label: lang.main_configure, click: () => this.context.windowActivator.focusWindow('config-window') },
      { label: lang.main_refreshsort, click: () => this.context.windowManager.refreshAndSort() },
      { type: 'separator' },
      { label: `Next Window (${shortcuts.nextWindow})`, click: () => this.context.windowActivator.activateNextWindow(dofusWindows) },
      { label: `${this.context.shortcutsEnabled ? 'Disable' : 'Enable'} Shortcuts (${shortcuts.toggleShortcuts})`, click: () => this.toggleShortcuts() },
      { type: 'separator' },
      {
        label: lang.main_language,
        submenu: languageManager.getLanguageMenu((langCode) => {
          languageManager.changeLanguage(langCode);
          this.updateMenu();
        })
      },
      { type: 'separator' },
      {
        label: lang.displayTray_dock,
        type: 'checkbox',
        checked: store.get('dock.enabled', false),
        click: () => this.toggleDock()
      },
      { type: 'separator' },
      {
        label: lang.main_quit,
        click: () => require('electron').app.quit()
      }
    ]);

    this.tray.setContextMenu(menu);
  }

  toggleShortcuts() {
    const { store } = this.context;
    this.context.shortcutsEnabled = !this.context.shortcutsEnabled;
    store.set('shortcutsEnabled', this.context.shortcutsEnabled);
    this.updateMenu();
  }

  toggleDock() {
    const { store } = this.context;
    const newValue = !store.get('dock.enabled', false);
    store.set('dock.enabled', newValue);
    this.context.dockManager.toggleDock(newValue);
    this.updateMenu();
  }
}

module.exports = TrayManager;
