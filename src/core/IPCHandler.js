
const { ipcMain } = require('electron');

class IPCHandler {
  constructor(context) {
    this.context = context;
  }

  register() {
    ipcMain.handle('get-dofus-windows', () => {
      return this.context.dofusWindows;
    });

    ipcMain.handle('get-language', () => {
      return this.context.languageManager.getCurrentLanguage();
    });

    ipcMain.handle('get-settings', () => {
      return this.context.store.store;
    });

    ipcMain.handle('save-settings', (event, settings) => {
      Object.keys(settings).forEach(key => {
        this.context.store.set(key, settings[key]);

        if (key.startsWith('classes.')) {
          const id = key.replace('classes.', '');
          this.context.windowManager.setWindowClass(id, settings[key]);
        }
      });
    });
  }
}

module.exports = IPCHandler;
