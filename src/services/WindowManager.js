const windowManager = require('node-window-manager');

class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  async getDofusWindows() {
    try {
      const allWindows = windowManager.getWindows();
      const dofusWindows = [];

      for (const window of allWindows) {
        const title = window.getTitle();
        
        // Check if it's a Dofus window
        if (this.isDofusWindow(title)) {
          const windowInfo = {
            id: window.id,
            title: title,
            processName: window.processName || 'Dofus',
            character: this.extractCharacterName(title),
            initiative: this.getStoredInitiative(window.id) || 0,
            isActive: window.isVisible() && !window.isMinimized(),
            bounds: window.getBounds(),
            avatar: this.getStoredAvatar(window.id) || 'default',
            shortcut: this.getStoredShortcut(window.id) || null,
            enabled: this.getStoredEnabled(window.id) !== false
          };
          
          dofusWindows.push(windowInfo);
          this.windows.set(window.id, window);
        }
      }

      // Sort by initiative (descending)
      dofusWindows.sort((a, b) => b.initiative - a.initiative);
      
      return dofusWindows;
    } catch (error) {
      console.error('Error getting Dofus windows:', error);
      return [];
    }
  }

  isDofusWindow(title) {
    if (!title) return false;
    
    const dofusPatterns = [
      /dofus/i,
      /ankama/i,
      /retro/i
    ];
    
    return dofusPatterns.some(pattern => pattern.test(title));
  }

  extractCharacterName(title) {
    // Try to extract character name from window title
    // Common patterns: "Dofus - CharacterName", "CharacterName - Dofus", etc.
    const patterns = [
      /dofus\s*-\s*(.+)/i,
      /(.+)\s*-\s*dofus/i,
      /(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Unknown';
  }

  activateWindow(windowId) {
    try {
      const window = this.windows.get(windowId);
      if (window) {
        window.restore();
        window.bringToTop();
        window.setForeground();
        return true;
      }
    } catch (error) {
      console.error('Error activating window:', error);
    }
    return false;
  }

  moveWindow(windowId, x, y) {
    try {
      const window = this.windows.get(windowId);
      if (window) {
        const bounds = window.getBounds();
        window.setBounds({ x, y, width: bounds.width, height: bounds.height });
        return true;
      }
    } catch (error) {
      console.error('Error moving window:', error);
    }
    return false;
  }

  getStoredInitiative(windowId) {
    // This would be stored in the main store
    const Store = require('electron-store');
    const store = new Store();
    const initiatives = store.get('initiatives', {});
    return initiatives[windowId] || 0;
  }

  getStoredAvatar(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const avatars = store.get('avatars', {});
    return avatars[windowId] || 'default';
  }

  getStoredShortcut(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const shortcuts = store.get('shortcuts', {});
    return shortcuts[windowId] || null;
  }

  getStoredEnabled(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const enabled = store.get('enabled', {});
    return enabled[windowId] !== false;
  }
}

module.exports = WindowManager;