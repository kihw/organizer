// main.js (nouveau point d'entrée)
const { app } = require('electron');

const AppInitializer = require('./core/AppInitializer');
const TrayManager = require('./core/TrayManager');
const WindowFactory = require('./core/WindowFactory');
const DockManager = require('./core/DockManager');
const ShortcutRegistrar = require('./core/ShortcutRegistrar');
const IPCHandler = require('./core/IPCHandler');

const Store = require('electron-store');
const ShortcutManager = require('./services/ShortcutManager');
const ShortcutConfigManager = require('./services/ShortcutConfigManager');
const LanguageManager = require('./services/LanguageManager');
const { DummyWindowActivator } = require('./services/DummyWindowActivator');

const WindowManager = require('./services/WindowManagerWindows');

(async () => {
  const store = new Store();
  const shortcutConfig = new ShortcutConfigManager();
  const shortcutManager = new ShortcutManager();
  const languageManager = new LanguageManager();
  const windowManager = new WindowManager();
  const windowActivator = new DummyWindowActivator();

  const context = {
    store,
    shortcutConfig,
    shortcutManager,
    languageManager,
    windowManager,
    windowActivator,
    dofusWindows: [],
    shortcutsEnabled: true,
    isConfiguring: false,
  };

  const appInit = new AppInitializer(context);
  const trayManager = new TrayManager(context);
  const windowFactory = new WindowFactory(context);
  const dockManager = new DockManager(context);
  const shortcutRegistrar = new ShortcutRegistrar(context);
  const ipcHandler = new IPCHandler(context);

  await appInit.initialize();
  trayManager.init();
  shortcutRegistrar.register();
  ipcHandler.register();
})();
