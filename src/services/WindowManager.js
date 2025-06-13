const windowManager = require('node-window-manager');
const { screen } = require('electron');

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
  }

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 1000) {
        return Array.from(this.windows.values()).map(w => w.info);
      }
      this.lastWindowCheck = now;

      const allWindows = windowManager.getWindows();
      const dofusWindows = [];
      const currentWindowIds = new Set();

      for (const window of allWindows) {
        try {
          const title = window.getTitle();
          
          // Check if it's a Dofus window
          if (this.isDofusWindow(title)) {
            const windowId = window.id.toString();
            currentWindowIds.add(windowId);
            
            const windowInfo = {
              id: windowId,
              title: title,
              processName: window.processName || 'Dofus',
              character: this.extractCharacterName(title),
              initiative: this.getStoredInitiative(windowId),
              isActive: this.isWindowActive(window),
              bounds: this.getWindowBounds(window),
              avatar: this.getStoredAvatar(windowId),
              shortcut: this.getStoredShortcut(windowId),
              enabled: this.getStoredEnabled(windowId)
            };
            
            dofusWindows.push(windowInfo);
            this.windows.set(windowId, { window, info: windowInfo });
          }
        } catch (error) {
          // Skip windows that can't be accessed
          continue;
        }
      }

      // Remove windows that no longer exist
      for (const [windowId] of this.windows) {
        if (!currentWindowIds.has(windowId)) {
          this.windows.delete(windowId);
        }
      }

      // Sort by initiative (descending), then by character name
      dofusWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });
      
      return dofusWindows;
    } catch (error) {
      console.error('Error getting Dofus windows:', error);
      return [];
    }
  }

  isDofusWindow(title) {
    if (!title || typeof title !== 'string') return false;
    
    const dofusPatterns = [
      /dofus/i,
      /ankama/i,
      /retro/i,
      /wakfu/i
    ];
    
    // Exclude system windows and browsers
    const excludePatterns = [
      /chrome/i,
      /firefox/i,
      /explorer/i,
      /desktop/i,
      /taskbar/i
    ];
    
    const isDofus = dofusPatterns.some(pattern => pattern.test(title));
    const isExcluded = excludePatterns.some(pattern => pattern.test(title));
    
    return isDofus && !isExcluded;
  }

  extractCharacterName(title) {
    if (!title) return 'Unknown';
    
    // Try to extract character name from window title
    const patterns = [
      /dofus\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*dofus/i,
      /(.+?)(?:\s*-\s*ankama)?$/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // Clean up common suffixes
        name = name.replace(/\s*\(.*\)$/, '');
        name = name.replace(/\s*-.*$/, '');
        if (name.length > 0 && name.length < 50) {
          return name;
        }
      }
    }
    
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  }

  isWindowActive(window) {
    try {
      return window.isVisible() && !window.isMinimized();
    } catch (error) {
      return false;
    }
  }

  getWindowBounds(window) {
    try {
      return window.getBounds();
    } catch (error) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
  }

  activateWindow(windowId) {
    try {
      const windowData = this.windows.get(windowId);
      if (windowData && windowData.window) {
        const window = windowData.window;
        
        // Try multiple methods to activate the window
        if (window.isMinimized()) {
          window.restore();
        }
        
        window.bringToTop();
        window.setForeground();
        
        // Additional focus attempt
        setTimeout(() => {
          try {
            window.setForeground();
          } catch (e) {
            // Ignore errors on second attempt
          }
        }, 100);
        
        return true;
      }
    } catch (error) {
      console.error('Error activating window:', error);
    }
    return false;
  }

  moveWindow(windowId, x, y) {
    try {
      const windowData = this.windows.get(windowId);
      if (windowData && windowData.window) {
        const window = windowData.window;
        const bounds = this.getWindowBounds(window);
        window.setBounds({ x, y, width: bounds.width, height: bounds.height });
        return true;
      }
    } catch (error) {
      console.error('Error moving window:', error);
    }
    return false;
  }

  resizeWindow(windowId, width, height) {
    try {
      const windowData = this.windows.get(windowId);
      if (windowData && windowData.window) {
        const window = windowData.window;
        const bounds = this.getWindowBounds(window);
        window.setBounds({ x: bounds.x, y: bounds.y, width, height });
        return true;
      }
    } catch (error) {
      console.error('Error resizing window:', error);
    }
    return false;
  }

  organizeWindows(layout = 'grid') {
    const enabledWindows = Array.from(this.windows.values())
      .filter(w => w.info.enabled)
      .sort((a, b) => b.info.initiative - a.info.initiative);
    
    if (enabledWindows.length === 0) return false;

    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = displays[0];
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const { x: screenX, y: screenY } = primaryDisplay.workArea;

      switch (layout) {
        case 'grid':
          this.arrangeInGrid(enabledWindows, screenX, screenY, screenWidth, screenHeight);
          break;
        case 'horizontal':
          this.arrangeHorizontally(enabledWindows, screenX, screenY, screenWidth, screenHeight);
          break;
        case 'vertical':
          this.arrangeVertically(enabledWindows, screenX, screenY, screenWidth, screenHeight);
          break;
        default:
          this.arrangeInGrid(enabledWindows, screenX, screenY, screenWidth, screenHeight);
      }
      
      return true;
    } catch (error) {
      console.error('Error organizing windows:', error);
      return false;
    }
  }

  arrangeInGrid(windows, startX, startY, totalWidth, totalHeight) {
    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const windowWidth = Math.floor(totalWidth / cols);
    const windowHeight = Math.floor(totalHeight / rows);
    
    windows.forEach((windowData, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = startX + col * windowWidth;
      const y = startY + row * windowHeight;
      
      this.moveWindow(windowData.info.id, x, y);
      this.resizeWindow(windowData.info.id, windowWidth - 10, windowHeight - 10);
    });
  }

  arrangeHorizontally(windows, startX, startY, totalWidth, totalHeight) {
    const windowWidth = Math.floor(totalWidth / windows.length);
    
    windows.forEach((windowData, index) => {
      const x = startX + index * windowWidth;
      this.moveWindow(windowData.info.id, x, startY);
      this.resizeWindow(windowData.info.id, windowWidth - 10, totalHeight - 10);
    });
  }

  arrangeVertically(windows, startX, startY, totalWidth, totalHeight) {
    const windowHeight = Math.floor(totalHeight / windows.length);
    
    windows.forEach((windowData, index) => {
      const y = startY + index * windowHeight;
      this.moveWindow(windowData.info.id, startX, y);
      this.resizeWindow(windowData.info.id, totalWidth - 10, windowHeight - 10);
    });
  }

  getStoredInitiative(windowId) {
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