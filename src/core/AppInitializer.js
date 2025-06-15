
const { app } = require('electron');

class AppInitializer {
  constructor(context) {
    this.context = context;
  }

  async initialize() {
    await app.whenReady();
    console.log('AppInitializer: Application is ready.');

    // Migration
    this.migrateOldSettings();

    app.on('window-all-closed', (e) => e.preventDefault());
    app.on('before-quit', () => {
      console.log('AppInitializer: Cleaning up before quit.');
    });
  }

  migrateOldSettings() {
    const { shortcutConfig, store } = this.context;

    try {
      console.log('AppInitializer: Checking for old settings to migrate...');
      const migratedCount = shortcutConfig.migrateFromElectronStore(store);
      if (migratedCount > 0) {
        console.log(`AppInitializer: Migrated ${migratedCount} old settings.`);
        store.delete('shortcuts');
        store.delete('globalShortcuts');
      }
    } catch (err) {
      console.error('AppInitializer: Migration failed:', err);
    }
  }
}

module.exports = AppInitializer;
