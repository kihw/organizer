const { globalShortcut } = require('electron');

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.active = false;
  }

  setWindowShortcut(windowId, shortcut, callback) {
    // Remove existing shortcut for this window
    this.removeWindowShortcut(windowId);
    
    if (!shortcut) return;

    try {
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      const success = globalShortcut.register(accelerator, callback);
      
      if (success) {
        this.shortcuts.set(windowId, {
          accelerator,
          callback,
          original: shortcut
        });
        
        // Store in persistent storage
        const Store = require('electron-store');
        const store = new Store();
        const shortcuts = store.get('shortcuts', {});
        shortcuts[windowId] = shortcut;
        store.set('shortcuts', shortcuts);
        
        return true;
      }
    } catch (error) {
      console.error('Error setting shortcut:', error);
    }
    
    return false;
  }

  removeWindowShortcut(windowId) {
    const shortcutInfo = this.shortcuts.get(windowId);
    if (shortcutInfo) {
      globalShortcut.unregister(shortcutInfo.accelerator);
      this.shortcuts.delete(windowId);
      
      // Remove from persistent storage
      const Store = require('electron-store');
      const store = new Store();
      const shortcuts = store.get('shortcuts', {});
      delete shortcuts[windowId];
      store.set('shortcuts', shortcuts);
    }
  }

  convertShortcutToAccelerator(shortcut) {
    // Convert AutoIt-style shortcuts to Electron accelerators
    let accelerator = shortcut.toLowerCase();
    
    // Handle modifiers
    accelerator = accelerator.replace(/\+/g, '+');
    accelerator = accelerator.replace(/ctrl/gi, 'CommandOrControl');
    accelerator = accelerator.replace(/alt/gi, 'Alt');
    accelerator = accelerator.replace(/shift/gi, 'Shift');
    accelerator = accelerator.replace(/win/gi, 'Super');
    
    // Handle special keys
    const keyMappings = {
      'space': 'Space',
      'enter': 'Return',
      'backspace': 'Backspace',
      'tab': 'Tab',
      'escape': 'Escape',
      'delete': 'Delete',
      'insert': 'Insert',
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp',
      'pagedown': 'PageDown',
      'up': 'Up',
      'down': 'Down',
      'left': 'Left',
      'right': 'Right',
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
    };
    
    Object.keys(keyMappings).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      accelerator = accelerator.replace(regex, keyMappings[key]);
    });
    
    return accelerator;
  }

  activateAll() {
    this.active = true;
    // Re-register all shortcuts
    const shortcuts = Array.from(this.shortcuts.entries());
    this.shortcuts.clear();
    
    shortcuts.forEach(([windowId, info]) => {
      this.setWindowShortcut(windowId, info.original, info.callback);
    });
  }

  deactivateAll() {
    this.active = false;
    globalShortcut.unregisterAll();
  }

  cleanup() {
    globalShortcut.unregisterAll();
    this.shortcuts.clear();
  }

  getShortcutLabel(shortcut) {
    // Convert shortcut to human-readable label
    if (!shortcut) return 'No shortcut';
    
    return shortcut
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/\+/g, ' + ')
      .toUpperCase();
  }
}

module.exports = ShortcutManager;