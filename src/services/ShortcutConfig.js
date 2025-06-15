const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

class ShortcutConfig {
    constructor() {
        this.store = new Store();
        this.defaultShortcuts = {
            primaryWindow: 'Ctrl+1',
            secondaryWindow: 'Ctrl+2',
            refresh: 'F5',
            nextWindow: 'Ctrl+Tab'
        };
    }

    getGlobalShortcut(key) {
        return Object.assign(this.defaultShortcuts, this.store.get('shortcuts') || {})[key];
    }

    setGlobalShortcut(key, value) {
        const shortcuts = Object.assign(this.defaultShortcuts, this.store.get('shortcuts') || {});
        shortcuts[key] = value;
        this.store.set('shortcuts', shortcuts);
    }

    migrateFromElectronStore(store) {
        const existingShortcuts = store.get('shortcuts');
        if (existingShortcuts) {
            this.store.set('shortcuts', existingShortcuts);
        }
    }
}

module.exports = ShortcutConfig;