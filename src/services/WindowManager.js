const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.isLinux = process.platform === 'linux';
  }

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 1000) {
        return Array.from(this.windows.values()).map(w => w.info);
      }
      this.lastWindowCheck = now;

      let dofusWindows = [];
      
      if (this.isLinux) {
        dofusWindows = await this.getLinuxWindows();
      } else {
        // Fallback for other platforms
        dofusWindows = await this.getFallbackWindows();
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

  async getLinuxWindows() {
    try {
      // Use wmctrl to get window list on Linux
      const { stdout } = await execAsync('wmctrl -l -x 2>/dev/null || echo ""');
      const windows = [];
      const currentWindowIds = new Set();

      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const windowId = parts[0];
            const className = parts[2];
            const title = parts.slice(3).join(' ');
            
            if (this.isDofusWindow(title) || this.isDofusWindow(className)) {
              currentWindowIds.add(windowId);
              
              const windowInfo = {
                id: windowId,
                title: title,
                processName: className.split('.')[0] || 'Dofus',
                character: this.extractCharacterName(title),
                initiative: this.getStoredInitiative(windowId),
                isActive: await this.isLinuxWindowActive(windowId),
                bounds: await this.getLinuxWindowBounds(windowId),
                avatar: this.getStoredAvatar(windowId),
                shortcut: this.getStoredShortcut(windowId),
                enabled: this.getStoredEnabled(windowId)
              };
              
              windows.push(windowInfo);
              this.windows.set(windowId, { info: windowInfo });
            }
          }
        }
      }

      // Remove windows that no longer exist
      for (const [windowId] of this.windows) {
        if (!currentWindowIds.has(windowId)) {
          this.windows.delete(windowId);
        }
      }

      return windows;
    } catch (error) {
      console.warn('wmctrl not available, using fallback method');
      return this.getFallbackWindows();
    }
  }

  async getFallbackWindows() {
    try {
      // Fallback using ps and xdotool if available
      const { stdout } = await execAsync('ps aux | grep -i dofus | grep -v grep || echo ""');
      const windows = [];
      
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('dofus') || line.includes('Dofus')) {
            const windowId = `fallback_${i}`;
            const title = this.extractTitleFromProcess(line);
            
            const windowInfo = {
              id: windowId,
              title: title,
              processName: 'Dofus',
              character: this.extractCharacterName(title),
              initiative: this.getStoredInitiative(windowId),
              isActive: true,
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              avatar: this.getStoredAvatar(windowId),
              shortcut: this.getStoredShortcut(windowId),
              enabled: this.getStoredEnabled(windowId)
            };
            
            windows.push(windowInfo);
            this.windows.set(windowId, { info: windowInfo });
          }
        }
      }

      return windows;
    } catch (error) {
      console.error('Error in fallback window detection:', error);
      return [];
    }
  }

  extractTitleFromProcess(processLine) {
    // Extract title from process command line
    const parts = processLine.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase().includes('dofus')) {
        return parts.slice(i).join(' ').substring(0, 50);
      }
    }
    return 'Dofus Window';
  }

  async isLinuxWindowActive(windowId) {
    try {
      const { stdout } = await execAsync(`xprop -id ${windowId} _NET_WM_STATE 2>/dev/null || echo ""`);
      return !stdout.includes('_NET_WM_STATE_HIDDEN');
    } catch (error) {
      return true; // Assume active if we can't determine
    }
  }

  async getLinuxWindowBounds(windowId) {
    try {
      const { stdout } = await execAsync(`xwininfo -id ${windowId} 2>/dev/null || echo ""`);
      const lines = stdout.split('\n');
      
      let x = 0, y = 0, width = 800, height = 600;
      
      for (const line of lines) {
        if (line.includes('Absolute upper-left X:')) {
          x = parseInt(line.split(':')[1].trim()) || 0;
        } else if (line.includes('Absolute upper-left Y:')) {
          y = parseInt(line.split(':')[1].trim()) || 0;
        } else if (line.includes('Width:')) {
          width = parseInt(line.split(':')[1].trim()) || 800;
        } else if (line.includes('Height:')) {
          height = parseInt(line.split(':')[1].trim()) || 600;
        }
      }
      
      return { x, y, width, height };
    } catch (error) {
      return { x: 0, y: 0, width: 800, height: 600 };
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
      /taskbar/i,
      /gnome/i,
      /kde/i,
      /xfce/i
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

  async activateWindow(windowId) {
    try {
      if (this.isLinux) {
        return await this.activateLinuxWindow(windowId);
      } else {
        return this.activateFallbackWindow(windowId);
      }
    } catch (error) {
      console.error('Error activating window:', error);
      return false;
    }
  }

  async activateLinuxWindow(windowId) {
    try {
      // Try multiple methods to activate window on Linux
      const commands = [
        `wmctrl -i -a ${windowId}`,
        `xdotool windowactivate ${windowId}`,
        `xprop -id ${windowId} -f _NET_ACTIVE_WINDOW 32a -set _NET_ACTIVE_WINDOW 1`
      ];

      for (const command of commands) {
        try {
          await execAsync(command + ' 2>/dev/null');
          return true;
        } catch (e) {
          // Try next command
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error activating Linux window:', error);
      return false;
    }
  }

  activateFallbackWindow(windowId) {
    // Fallback activation method
    console.log(`Attempting to activate window: ${windowId}`);
    return true;
  }

  async moveWindow(windowId, x, y) {
    try {
      if (this.isLinux) {
        await execAsync(`wmctrl -i -r ${windowId} -e 0,${x},${y},-1,-1 2>/dev/null`);
        return true;
      }
    } catch (error) {
      console.error('Error moving window:', error);
    }
    return false;
  }

  async resizeWindow(windowId, width, height) {
    try {
      if (this.isLinux) {
        await execAsync(`wmctrl -i -r ${windowId} -e 0,-1,-1,${width},${height} 2>/dev/null`);
        return true;
      }
    } catch (error) {
      console.error('Error resizing window:', error);
    }
    return false;
  }

  async organizeWindows(layout = 'grid') {
    const enabledWindows = Array.from(this.windows.values())
      .filter(w => w.info.enabled)
      .sort((a, b) => b.info.initiative - a.info.initiative);
    
    if (enabledWindows.length === 0) return false;

    try {
      // Get screen dimensions using xrandr
      const { stdout } = await execAsync('xrandr --current | grep primary || xrandr --current | head -1');
      const match = stdout.match(/(\d+)x(\d+)/);
      
      const screenWidth = match ? parseInt(match[1]) : 1920;
      const screenHeight = match ? parseInt(match[2]) : 1080;
      
      switch (layout) {
        case 'grid':
          await this.arrangeInGrid(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        case 'horizontal':
          await this.arrangeHorizontally(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        case 'vertical':
          await this.arrangeVertically(enabledWindows, 0, 0, screenWidth, screenHeight);
          break;
        default:
          await this.arrangeInGrid(enabledWindows, 0, 0, screenWidth, screenHeight);
      }
      
      return true;
    } catch (error) {
      console.error('Error organizing windows:', error);
      return false;
    }
  }

  async arrangeInGrid(windows, startX, startY, totalWidth, totalHeight) {
    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const windowWidth = Math.floor(totalWidth / cols);
    const windowHeight = Math.floor(totalHeight / rows);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = startX + col * windowWidth;
      const y = startY + row * windowHeight;
      
      await this.moveWindow(windowData.info.id, x, y);
      await this.resizeWindow(windowData.info.id, windowWidth - 10, windowHeight - 10);
    }
  }

  async arrangeHorizontally(windows, startX, startY, totalWidth, totalHeight) {
    const windowWidth = Math.floor(totalWidth / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const x = startX + i * windowWidth;
      await this.moveWindow(windowData.info.id, x, startY);
      await this.resizeWindow(windowData.info.id, windowWidth - 10, totalHeight - 10);
    }
  }

  async arrangeVertically(windows, startX, startY, totalWidth, totalHeight) {
    const windowHeight = Math.floor(totalHeight / windows.length);
    
    for (let i = 0; i < windows.length; i++) {
      const windowData = windows[i];
      const y = startY + i * windowHeight;
      await this.moveWindow(windowData.info.id, startX, y);
      await this.resizeWindow(windowData.info.id, totalWidth - 10, windowHeight - 10);
    }
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