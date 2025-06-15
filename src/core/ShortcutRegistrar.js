
const { globalShortcut } = require('electron');

class ShortcutRegistrar {
  constructor(context) {
    this.context = context;
  }

  register() {
    const { shortcutManager, shortcutConfig, windowActivator } = this.context;

    const nextShortcut = shortcutConfig.getGlobalShortcut('nextWindow');
    if (nextShortcut) {
      const acc = shortcutManager.convertShortcutToAccelerator(nextShortcut);
      if (acc) {
        globalShortcut.register(acc, () => {
          const enabled = this.context.dofusWindows.filter(w => w.enabled);
          windowActivator.activateNextWindow(enabled);
        });
      }
    }

    const toggleShortcut = shortcutConfig.getGlobalShortcut('toggleShortcuts');
    if (toggleShortcut) {
      const acc = shortcutManager.convertShortcutToAccelerator(toggleShortcut);
      if (acc) {
        globalShortcut.register(acc, () => {
          this.context.shortcutsEnabled = !this.context.shortcutsEnabled;
        });
      }
    }
  }

  unregister() {
    globalShortcut.unregisterAll();
  }
}

module.exports = ShortcutRegistrar;
