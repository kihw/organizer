const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ShortcutConfigManager {
  constructor() {
    this.configDir = this.getConfigDirectory();
    this.configFile = path.join(this.configDir, 'shortcuts.json');
    this.config = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      shortcuts: {
        windows: {},
        global: {
          nextWindow: 'Ctrl+Tab',
          toggleShortcuts: 'Ctrl+Shift+D'
        }
      },
      characters: {}
    };
    
    this.ensureConfigDirectory();
    this.loadConfig();
  }

  getConfigDirectory() {
    // Get the user data directory for the app
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config');
  }

  ensureConfigDirectory() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
        console.log('ShortcutConfigManager: Created config directory:', this.configDir);
      }
    } catch (error) {
      console.error('ShortcutConfigManager: Error creating config directory:', error);
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(data);
        
        // Merge with default config to ensure all properties exist
        this.config = {
          ...this.config,
          ...loadedConfig,
          shortcuts: {
            ...this.config.shortcuts,
            ...loadedConfig.shortcuts,
            global: {
              ...this.config.shortcuts.global,
              ...loadedConfig.shortcuts?.global
            }
          }
        };
        
        console.log('ShortcutConfigManager: Loaded shortcuts config from file');
        console.log(`ShortcutConfigManager: Found ${Object.keys(this.config.shortcuts.windows).length} window shortcuts`);
        console.log(`ShortcutConfigManager: Found ${Object.keys(this.config.characters).length} character profiles`);
      } else {
        console.log('ShortcutConfigManager: No existing config file, using defaults');
        this.saveConfig();
      }
    } catch (error) {
      console.error('ShortcutConfigManager: Error loading config:', error);
      // Keep default config if loading fails
    }
  }

  saveConfig() {
    try {
      this.config.lastUpdated = new Date().toISOString();
      
      // Create a backup of the current config
      if (fs.existsSync(this.configFile)) {
        const backupFile = this.configFile + '.backup';
        fs.copyFileSync(this.configFile, backupFile);
      }
      
      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configFile, configData, 'utf8');
      
      console.log('ShortcutConfigManager: Saved shortcuts config to file');
    } catch (error) {
      console.error('ShortcutConfigManager: Error saving config:', error);
    }
  }

  // Window shortcuts management
  setWindowShortcut(windowId, shortcut) {
    if (!windowId || !shortcut) return false;
    
    try {
      this.config.shortcuts.windows[windowId] = {
        shortcut: shortcut,
        lastUsed: new Date().toISOString(),
        usageCount: (this.config.shortcuts.windows[windowId]?.usageCount || 0) + 1
      };
      
      this.saveConfig();
      console.log(`ShortcutConfigManager: Set shortcut ${shortcut} for window ${windowId}`);
      return true;
    } catch (error) {
      console.error('ShortcutConfigManager: Error setting window shortcut:', error);
      return false;
    }
  }

  getWindowShortcut(windowId) {
    return this.config.shortcuts.windows[windowId]?.shortcut || null;
  }

  removeWindowShortcut(windowId) {
    if (this.config.shortcuts.windows[windowId]) {
      delete this.config.shortcuts.windows[windowId];
      this.saveConfig();
      console.log(`ShortcutConfigManager: Removed shortcut for window ${windowId}`);
      return true;
    }
    return false;
  }

  getAllWindowShortcuts() {
    const shortcuts = {};
    Object.keys(this.config.shortcuts.windows).forEach(windowId => {
      shortcuts[windowId] = this.config.shortcuts.windows[windowId].shortcut;
    });
    return shortcuts;
  }

  // Global shortcuts management
  setGlobalShortcut(type, shortcut) {
    if (!type || !shortcut) return false;
    
    try {
      this.config.shortcuts.global[type] = shortcut;
      this.saveConfig();
      console.log(`ShortcutConfigManager: Set global shortcut ${shortcut} for ${type}`);
      return true;
    } catch (error) {
      console.error('ShortcutConfigManager: Error setting global shortcut:', error);
      return false;
    }
  }

  getGlobalShortcut(type) {
    return this.config.shortcuts.global[type] || null;
  }

  getAllGlobalShortcuts() {
    return { ...this.config.shortcuts.global };
  }

  removeGlobalShortcut(type) {
    if (this.config.shortcuts.global[type]) {
      delete this.config.shortcuts.global[type];
      this.saveConfig();
      console.log(`ShortcutConfigManager: Removed global shortcut for ${type}`);
      return true;
    }
    return false;
  }

  // Character profile management
  setCharacterProfile(windowId, character, dofusClass) {
    if (!windowId || !character) return false;
    
    try {
      this.config.characters[windowId] = {
        character: character,
        class: dofusClass || 'feca',
        lastSeen: new Date().toISOString(),
        windowId: windowId
      };
      
      this.saveConfig();
      console.log(`ShortcutConfigManager: Set character profile for ${character} (${dofusClass})`);
      return true;
    } catch (error) {
      console.error('ShortcutConfigManager: Error setting character profile:', error);
      return false;
    }
  }

  getCharacterProfile(windowId) {
    return this.config.characters[windowId] || null;
  }

  findCharacterByName(characterName, dofusClass) {
    // Find a character profile by name and class
    for (const [windowId, profile] of Object.entries(this.config.characters)) {
      if (profile.character.toLowerCase() === characterName.toLowerCase() && 
          profile.class === dofusClass) {
        return { windowId, profile };
      }
    }
    return null;
  }

  // Shortcut validation
  isShortcutInUse(shortcut, excludeWindowId = null) {
    // Check window shortcuts
    for (const [windowId, shortcutData] of Object.entries(this.config.shortcuts.windows)) {
      if (windowId !== excludeWindowId && shortcutData.shortcut === shortcut) {
        return { type: 'window', windowId };
      }
    }
    
    // Check global shortcuts
    for (const [type, globalShortcut] of Object.entries(this.config.shortcuts.global)) {
      if (globalShortcut === shortcut) {
        return { type: 'global', shortcutType: type };
      }
    }
    
    return null;
  }

  // Migration and cleanup
  migrateFromElectronStore(electronStore) {
    try {
      console.log('ShortcutConfigManager: Starting migration from electron-store...');
      
      // Migrate window shortcuts
      const oldShortcuts = electronStore.get('shortcuts', {});
      let migratedCount = 0;
      
      Object.keys(oldShortcuts).forEach(windowId => {
        const shortcut = oldShortcuts[windowId];
        if (shortcut && !this.config.shortcuts.windows[windowId]) {
          this.config.shortcuts.windows[windowId] = {
            shortcut: shortcut,
            lastUsed: new Date().toISOString(),
            usageCount: 1,
            migrated: true
          };
          migratedCount++;
        }
      });
      
      // Migrate global shortcuts
      const oldGlobalShortcuts = electronStore.get('globalShortcuts', {});
      Object.keys(oldGlobalShortcuts).forEach(type => {
        const shortcut = oldGlobalShortcuts[type];
        if (shortcut && !this.config.shortcuts.global[type]) {
          this.config.shortcuts.global[type] = shortcut;
        }
      });
      
      // Migrate character data
      const oldClasses = electronStore.get('classes', {});
      const oldInitiatives = electronStore.get('initiatives', {});
      const oldCustomNames = electronStore.get('customNames', {});
      
      Object.keys(oldClasses).forEach(windowId => {
        if (!this.config.characters[windowId]) {
          this.config.characters[windowId] = {
            character: oldCustomNames[windowId] || 'Unknown',
            class: oldClasses[windowId] || 'feca',
            initiative: oldInitiatives[windowId] || 0,
            lastSeen: new Date().toISOString(),
            windowId: windowId,
            migrated: true
          };
        }
      });
      
      if (migratedCount > 0) {
        this.saveConfig();
        console.log(`ShortcutConfigManager: Migrated ${migratedCount} shortcuts from electron-store`);
      }
      
      return migratedCount;
    } catch (error) {
      console.error('ShortcutConfigManager: Error during migration:', error);
      return 0;
    }
  }

  cleanupOldEntries(activeWindowIds) {
    // Remove shortcuts for windows that no longer exist
    const windowIds = Object.keys(this.config.shortcuts.windows);
    let cleanedCount = 0;
    
    windowIds.forEach(windowId => {
      if (!activeWindowIds.includes(windowId)) {
        // Keep the entry but mark it as inactive
        if (this.config.shortcuts.windows[windowId]) {
          this.config.shortcuts.windows[windowId].inactive = true;
          this.config.shortcuts.windows[windowId].lastInactive = new Date().toISOString();
        }
      } else {
        // Remove inactive flag if window is active again
        if (this.config.shortcuts.windows[windowId]?.inactive) {
          delete this.config.shortcuts.windows[windowId].inactive;
          delete this.config.shortcuts.windows[windowId].lastInactive;
        }
      }
    });
    
    // Remove very old inactive entries (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    Object.keys(this.config.shortcuts.windows).forEach(windowId => {
      const shortcutData = this.config.shortcuts.windows[windowId];
      if (shortcutData.inactive && shortcutData.lastInactive) {
        const lastInactiveDate = new Date(shortcutData.lastInactive);
        if (lastInactiveDate < thirtyDaysAgo) {
          delete this.config.shortcuts.windows[windowId];
          cleanedCount++;
        }
      }
    });
    
    if (cleanedCount > 0) {
      this.saveConfig();
      console.log(`ShortcutConfigManager: Cleaned up ${cleanedCount} old shortcut entries`);
    }
    
    return cleanedCount;
  }

  // Export/Import functionality
  exportConfig() {
    return {
      ...this.config,
      exportedAt: new Date().toISOString()
    };
  }

  importConfig(importedConfig) {
    try {
      // Validate imported config
      if (!importedConfig.shortcuts || !importedConfig.version) {
        throw new Error('Invalid config format');
      }
      
      // Backup current config
      const backupConfig = { ...this.config };
      
      // Merge imported config
      this.config = {
        ...this.config,
        ...importedConfig,
        shortcuts: {
          ...this.config.shortcuts,
          ...importedConfig.shortcuts,
          global: {
            ...this.config.shortcuts.global,
            ...importedConfig.shortcuts?.global
          }
        },
        importedAt: new Date().toISOString()
      };
      
      this.saveConfig();
      console.log('ShortcutConfigManager: Successfully imported config');
      return true;
    } catch (error) {
      console.error('ShortcutConfigManager: Error importing config:', error);
      return false;
    }
  }

  // Statistics and debugging
  getStatistics() {
    const windowShortcuts = Object.keys(this.config.shortcuts.windows).length;
    const activeShortcuts = Object.values(this.config.shortcuts.windows)
      .filter(s => !s.inactive).length;
    const characters = Object.keys(this.config.characters).length;
    
    return {
      totalWindowShortcuts: windowShortcuts,
      activeWindowShortcuts: activeShortcuts,
      inactiveWindowShortcuts: windowShortcuts - activeShortcuts,
      globalShortcuts: Object.keys(this.config.shortcuts.global).length,
      characters: characters,
      configFile: this.configFile,
      lastUpdated: this.config.lastUpdated
    };
  }

  // Get config file path for debugging
  getConfigFilePath() {
    return this.configFile;
  }
}

module.exports = ShortcutConfigManager;