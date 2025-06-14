const { globalShortcut } = require('electron');

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.active = false;
    this.registeredAccelerators = new Set();
  }

  setWindowShortcut(windowId, shortcut, callback) {
    // Remove existing shortcut for this window
    this.removeWindowShortcut(windowId);
    
    if (!shortcut || !callback) return false;

    try {
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      
      // Check if accelerator is already registered
      if (this.registeredAccelerators.has(accelerator)) {
        console.warn(`Shortcut ${accelerator} is already registered`);
        return false;
      }
      
      const success = globalShortcut.register(accelerator, () => {
        try {
          callback();
        } catch (error) {
          console.error('Error executing shortcut callback:', error);
        }
      });
      
      if (success) {
        this.shortcuts.set(windowId, {
          accelerator,
          callback,
          original: shortcut
        });
        
        this.registeredAccelerators.add(accelerator);
        
        // Store in persistent storage
        this.saveShortcutToStore(windowId, shortcut);
        
        return true;
      } else {
        console.warn(`Failed to register shortcut: ${accelerator}`);
      }
    } catch (error) {
      console.error('Error setting shortcut:', error);
    }
    
    return false;
  }

  removeWindowShortcut(windowId) {
    const shortcutInfo = this.shortcuts.get(windowId);
    if (shortcutInfo) {
      try {
        globalShortcut.unregister(shortcutInfo.accelerator);
        this.registeredAccelerators.delete(shortcutInfo.accelerator);
        this.shortcuts.delete(windowId);
        
        // Remove from persistent storage
        this.removeShortcutFromStore(windowId);
        
        return true;
      } catch (error) {
        console.error('Error removing shortcut:', error);
      }
    }
    return false;
  }

  convertShortcutToAccelerator(shortcut) {
    if (!shortcut) return '';
    
    // Clean up the shortcut string
    let accelerator = shortcut.trim();
    
    // Handle different separator formats
    accelerator = accelerator.replace(/\s*\+\s*/g, '+');
    
    // Convert modifiers to Electron format
    const modifierMappings = {
      'ctrl': 'CommandOrControl',
      'control': 'CommandOrControl',
      'cmd': 'CommandOrControl',
      'command': 'CommandOrControl',
      'alt': 'Alt',
      'shift': 'Shift',
      'win': 'Super',
      'super': 'Super',
      'meta': 'Super'
    };
    
    // Split by + and process each part
    const parts = accelerator.split('+').map(part => part.trim().toLowerCase());
    const processedParts = [];
    
    parts.forEach(part => {
      if (modifierMappings[part]) {
        processedParts.push(modifierMappings[part]);
      } else {
        // Handle special keys and single keys
        const keyMappings = {
          'space': 'Space',
          'enter': 'Return',
          'return': 'Return',
          'backspace': 'Backspace',
          'tab': 'Tab',
          'escape': 'Escape',
          'esc': 'Escape',
          'delete': 'Delete',
          'del': 'Delete',
          'insert': 'Insert',
          'ins': 'Insert',
          'home': 'Home',
          'end': 'End',
          'pageup': 'PageUp',
          'pagedown': 'PageDown',
          'up': 'Up',
          'down': 'Down',
          'left': 'Left',
          'right': 'Right',
          'plus': 'Plus',
          'minus': 'Minus',
          // Function keys
          'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
          'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
          'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
          // Number pad
          'num0': 'num0', 'num1': 'num1', 'num2': 'num2', 'num3': 'num3',
          'num4': 'num4', 'num5': 'num5', 'num6': 'num6', 'num7': 'num7',
          'num8': 'num8', 'num9': 'num9',
          'numadd': 'numadd',
          'numsub': 'numsub',
          'nummult': 'nummult',
          'numdiv': 'numdiv',
          'numdec': 'numdec',
          // Special characters
          'semicolon': ';',
          'equal': '=',
          'comma': ',',
          'period': '.',
          'slash': '/',
          'backslash': '\\',
          'quote': "'",
          'backquote': '`',
          'bracketleft': '[',
          'bracketright': ']'
        };
        
        const mappedKey = keyMappings[part] || part.toUpperCase();
        processedParts.push(mappedKey);
      }
    });
    
    return processedParts.join('+');
  }

  validateShortcut(shortcut) {
    if (!shortcut) return false;
    
    try {
      const accelerator = this.convertShortcutToAccelerator(shortcut);
      
      // Allow single keys and combinations
      const validPattern = /^(CommandOrControl|Alt|Shift|Super)(\+(CommandOrControl|Alt|Shift|Super))*\+[A-Z0-9;=,.\/'`\[\]\\-]$|^[A-Z0-9;=,.\/'`\[\]\\-]$|^F[1-9]|F1[0-2]$|^num[0-9]$|^Space$|^Return$|^Backspace$|^Tab$|^Escape$/;
      
      return accelerator.length > 0 && !this.registeredAccelerators.has(accelerator);
    } catch (error) {
      return false;
    }
  }

  activateAll() {
    this.active = true;
    // Re-register all shortcuts
    const shortcuts = Array.from(this.shortcuts.entries());
    this.shortcuts.clear();
    this.registeredAccelerators.clear();
    
    shortcuts.forEach(([windowId, info]) => {
      this.setWindowShortcut(windowId, info.original, info.callback);
    });
  }

  deactivateAll() {
    this.active = false;
    try {
      globalShortcut.unregisterAll();
      this.registeredAccelerators.clear();
    } catch (error) {
      console.error('Error deactivating shortcuts:', error);
    }
  }

  cleanup() {
    try {
      globalShortcut.unregisterAll();
      this.shortcuts.clear();
      this.registeredAccelerators.clear();
    } catch (error) {
      console.error('Error cleaning up shortcuts:', error);
    }
  }

  getShortcutLabel(shortcut) {
    if (!shortcut) return 'No shortcut';
    
    return shortcut
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/\+/g, ' + ')
      .split(' + ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' + ');
  }

  getAllShortcuts() {
    const shortcuts = {};
    this.shortcuts.forEach((info, windowId) => {
      shortcuts[windowId] = info.original;
    });
    return shortcuts;
  }

  saveShortcutToStore(windowId, shortcut) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const shortcuts = store.get('shortcuts', {});
      shortcuts[windowId] = shortcut;
      store.set('shortcuts', shortcuts);
    } catch (error) {
      console.error('Error saving shortcut to store:', error);
    }
  }

  removeShortcutFromStore(windowId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const shortcuts = store.get('shortcuts', {});
      delete shortcuts[windowId];
      store.set('shortcuts', shortcuts);
    } catch (error) {
      console.error('Error removing shortcut from store:', error);
    }
  }
}

module.exports = ShortcutManager;