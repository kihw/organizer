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

    loadShortcuts() {
        return Object.assign(this.defaultShortcuts, this.store.get('shortcuts') || {});
    }

    saveShortcuts(shortcuts) {
        this.store.set('shortcuts', shortcuts);
    }

    getShortcut(key) {
        return this.loadShortcuts()[key];
    }

    setShortcut(key, value) {
        const shortcuts = this.loadShortcuts();
        shortcuts[key] = value;
        this.saveShortcuts(shortcuts);
    }

    loadSettings() {
        performanceMonitor.measure('python_settings_load', () => {
            console.log('DofusOrganizerPython: Loading Python-enhanced settings...');

            const language = this.store.get('language', 'FR');
            console.log(`DofusOrganizerPython: Setting language to ${language}`);
            this.languageManager.setLanguage(language);

            // Charger l'état d'activation des raccourcis
            this.shortcutsEnabled = this.store.get('shortcutsEnabled', true);
            console.log(`DofusOrganizerPython: Shortcuts enabled: ${this.shortcutsEnabled}`);

            // Définir les raccourcis globaux par défaut s'ils ne sont pas définis
            if (!this.shortcutConfig.getGlobalShortcut('nextWindow')) {
                this.shortcutConfig.setGlobalShortcut('nextWindow', 'Ctrl+Tab');
            }
            if (!this.shortcutConfig.getGlobalShortcut('toggleShortcuts')) {
                this.shortcutConfig.setGlobalShortcut('toggleShortcuts', 'Ctrl+Shift+D');
            }

            // Enregistrer les raccourcis globaux
            this.registerGlobalShortcuts();
        });
    }

    async registerGlobalShortcuts() {
        try {
            // Désenregistrer les raccourcis existants
            this.unregisterGlobalShortcuts();

            const nextWindowShortcut = this.shortcutConfig.getGlobalShortcut('nextWindow');
            const toggleShortcutsShortcut = this.shortcutConfig.getGlobalShortcut('toggleShortcuts');

            // Enregistrer le raccourci de fenêtre suivante (seulement si les raccourcis sont activés)
            if (nextWindowShortcut && this.shortcutsEnabled) {
                const accelerator = this.shortcutManager.convertShortcutToAccelerator(nextWindowShortcut);
                if (accelerator) {
                    const success = globalShortcut.register(accelerator, () => {
                        this.activateNextWindow();
                    });

                    if (success) {
                        this.globalShortcuts.nextWindow = accelerator;
                        console.log(`DofusOrganizerPython: Registered next window shortcut: ${accelerator}`);
                    } else {
                        console.warn(`DofusOrganizerPython: Failed to register next window shortcut: ${accelerator}`);
                    }
                }
            }

            // Le raccourci de basculement doit TOUJOURS fonctionner
            if (toggleShortcutsShortcut) {
                const accelerator = this.shortcutManager.convertShortcutToAccelerator(toggleShortcutsShortcut);
                if (accelerator) {
                    const success = globalShortcut.register(accelerator, () => {
                        this.toggleShortcuts();
                    });

                    if (success) {
                        this.globalShortcuts.toggleShortcuts = accelerator;
                        console.log(`DofusOrganizerPython: Registered toggle shortcuts shortcut: ${accelerator}`);
                    } else {
                        console.warn(`DofusOrganizerPython: Failed to register toggle shortcuts shortcut: ${accelerator}`);
                    }
                }
            }
        } catch (error) {
            console.error('DofusOrganizerPython: Error registering global shortcuts:', error);
        }
    }

    async activateShortcuts() {
        try {
            if (this.shortcutsEnabled) {
                console.log('DofusOrganizerPython: Activating Python-enhanced shortcuts');
                await this.shortcutManager.activateAll();
                // Réenregistrer les raccourcis globaux
                await this.registerGlobalShortcuts();
            }
        } catch (error) {
            console.error('DofusOrganizerPython: Error activating shortcuts:', error);
        }
    }
}

module.exports = ShortcutConfig;