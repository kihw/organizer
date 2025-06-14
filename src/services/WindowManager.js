const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.isLinux = process.platform === 'linux';
    
    // Define available classes and their corresponding avatars
    this.dofusClasses = {
      'feca': { name: 'Feca', avatar: '1' },
      'osamodas': { name: 'Osamodas', avatar: '2' },
      'enutrof': { name: 'Enutrof', avatar: '3' },
      'sram': { name: 'Sram', avatar: '4' },
      'xelor': { name: 'Xelor', avatar: '5' },
      'ecaflip': { name: 'Ecaflip', avatar: '6' },
      'eniripsa': { name: 'Eniripsa', avatar: '7' },
      'iop': { name: 'Iop', avatar: '8' },
      'cra': { name: 'Cra', avatar: '9' },
      'sadida': { name: 'Sadida', avatar: '10' },
      'sacrieur': { name: 'Sacrieur', avatar: '11' },
      'pandawa': { name: 'Pandawa', avatar: '12' },
      'roublard': { name: 'Roublard', avatar: '13' },
      'zobal': { name: 'Zobal', avatar: '14' },
      'steamer': { name: 'Steamer', avatar: '15' },
      'eliotrope': { name: 'Eliotrope', avatar: '16' },
      'huppermage': { name: 'Huppermage', avatar: '17' },
      'ouginak': { name: 'Ouginak', avatar: '18' },
      'forgelance': { name: 'Forgelance', avatar: '20' }
    };
  }

  getDofusClasses() {
    return this.dofusClasses;
  }

  getClassAvatar(className) {
    const classKey = className.toLowerCase();
    return this.dofusClasses[classKey]?.avatar || '1';
  }

  getClassName(classKey) {
    return this.dofusClasses[classKey]?.name || 'Feca';
  }

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 1000) {
        const cachedWindows = Array.from(this.windows.values()).map(w => w.info);
        console.log(`WindowManager: Returning ${cachedWindows.length} cached windows`);
        return cachedWindows;
      }
      this.lastWindowCheck = now;

      let dofusWindows = [];
      
      if (this.isLinux) {
        dofusWindows = await this.getLinuxWindows();
      } else {
        // Fallback for other platforms
        dofusWindows = await this.getFallbackWindows();
      }

      console.log(`WindowManager: Found ${dofusWindows.length} Dofus windows`);
      console.log(`WindowManager: Windows details:`, dofusWindows.map(w => ({ id: w.id, title: w.title, className: w.className })));

      // Sort by initiative (descending), then by character name
      dofusWindows.sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }
        return a.character.localeCompare(b.character);
      });
      
      console.log(`WindowManager: Returning ${dofusWindows.length} sorted windows`);
      return dofusWindows;
    } catch (error) {
      console.error('Error getting Dofus windows:', error);
      return [];
    }
  }

  async getLinuxWindows() {
    try {
      console.log('WindowManager: Scanning for Dofus windows on Linux...');
      
      // Try multiple methods to get window information
      const methods = [
        () => this.getWindowsWithWmctrl(),
        () => this.getWindowsWithXdotool(),
        () => this.getWindowsWithXprop()
      ];

      for (const method of methods) {
        try {
          const windows = await method();
          if (windows.length > 0) {
            console.log(`WindowManager: Found ${windows.length} windows using detection method`);
            return windows;
          }
        } catch (error) {
          console.warn('Detection method failed, trying next...', error.message);
        }
      }

      console.warn('All detection methods failed, using fallback');
      return this.getFallbackWindows();
    } catch (error) {
      console.warn('Linux detection failed, using fallback method:', error.message);
      return this.getFallbackWindows();
    }
  }

  async getWindowsWithWmctrl() {
    const { stdout } = await execAsync('wmctrl -l -x -p 2>/dev/null');
    const windows = [];
    const currentWindowIds = new Set();

    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        // Format: windowId desktop pid className hostName title
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const windowId = parts[0];
          const desktop = parts[1];
          const pid = parts[2];
          const className = parts[3];
          const hostName = parts[4];
          const title = parts.slice(5).join(' ');
          
          console.log(`Checking window: ${title} (class: ${className}, pid: ${pid})`);
          
          if (this.isDofusWindow(title) || this.isDofusWindow(className)) {
            console.log(`✓ Found Dofus window: ${title}`);
            currentWindowIds.add(windowId);
            
            const windowClass = this.getStoredClass(windowId);
            const windowInfo = {
              id: windowId,
              title: title,
              processName: className.split('.')[0] || 'Dofus',
              className: className,
              pid: pid,
              character: this.extractCharacterName(title),
              dofusClass: windowClass,
              customName: this.getStoredCustomName(windowId),
              initiative: this.getStoredInitiative(windowId),
              isActive: await this.isLinuxWindowActive(windowId),
              bounds: await this.getLinuxWindowBounds(windowId),
              avatar: this.getClassAvatar(windowClass),
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
  }

  async getWindowsWithXdotool() {
    // First try to find windows by class name
    const classSearches = this.getDofusClassPatterns();
    const windows = [];
    
    for (const pattern of classSearches) {
      try {
        const { stdout } = await execAsync(`xdotool search --class "${pattern}" 2>/dev/null || echo ""`);
        if (stdout.trim()) {
          const windowIds = stdout.trim().split('\n');
          
          for (const windowId of windowIds) {
            if (windowId.trim()) {
              const windowInfo = await this.getWindowInfoById(windowId.trim());
              if (windowInfo && this.isDofusWindow(windowInfo.title)) {
                windows.push(windowInfo);
                this.windows.set(windowId.trim(), { info: windowInfo });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Class search failed for ${pattern}:`, error.message);
      }
    }

    // Also try searching by window name/title
    const titleSearches = this.getDofusTitlePatterns();
    for (const pattern of titleSearches) {
      try {
        const { stdout } = await execAsync(`xdotool search --name "${pattern}" 2>/dev/null || echo ""`);
        if (stdout.trim()) {
          const windowIds = stdout.trim().split('\n');
          
          for (const windowId of windowIds) {
            if (windowId.trim() && !this.windows.has(windowId.trim())) {
              const windowInfo = await this.getWindowInfoById(windowId.trim());
              if (windowInfo && this.isDofusWindow(windowInfo.title)) {
                windows.push(windowInfo);
                this.windows.set(windowId.trim(), { info: windowInfo });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Title search failed for ${pattern}:`, error.message);
      }
    }

    return windows;
  }

  async getWindowsWithXprop() {
    try {
      // Get all window IDs using xwininfo
      const { stdout } = await execAsync('xwininfo -root -children 2>/dev/null | grep -E "^ *0x" | awk \'{print $1}\'');
      const windows = [];
      
      if (stdout.trim()) {
        const windowIds = stdout.trim().split('\n');
        
        for (const windowId of windowIds) {
          if (windowId.trim()) {
            try {
              const windowInfo = await this.getWindowInfoById(windowId.trim());
              if (windowInfo && this.isDofusWindow(windowInfo.title)) {
                windows.push(windowInfo);
                this.windows.set(windowId.trim(), { info: windowInfo });
              }
            } catch (error) {
              // Skip windows we can't access
              continue;
            }
          }
        }
      }
      
      return windows;
    } catch (error) {
      console.warn('xprop detection failed:', error.message);
      return [];
    }
  }

  async getWindowInfoById(windowId) {
    try {
      // Get window properties using xprop
      const { stdout } = await execAsync(`xprop -id ${windowId} WM_NAME WM_CLASS _NET_WM_NAME _NET_WM_PID 2>/dev/null || echo ""`);
      
      let title = '';
      let className = '';
      let pid = '';
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('_NET_WM_NAME') || line.includes('WM_NAME')) {
          const match = line.match(/"([^"]+)"/);
          if (match && !title) {
            title = match[1];
          }
        } else if (line.includes('WM_CLASS')) {
          const match = line.match(/"([^"]+)"/);
          if (match) {
            className = match[1];
          }
        } else if (line.includes('_NET_WM_PID')) {
          const match = line.match(/= (\d+)/);
          if (match) {
            pid = match[1];
          }
        }
      }
      
      if (!title) return null;
      
      const windowClass = this.getStoredClass(windowId);
      return {
        id: windowId,
        title: title,
        processName: className || 'Unknown',
        className: className,
        pid: pid,
        character: this.extractCharacterName(title),
        dofusClass: windowClass,
        customName: this.getStoredCustomName(windowId),
        initiative: this.getStoredInitiative(windowId),
        isActive: await this.isLinuxWindowActive(windowId),
        bounds: await this.getLinuxWindowBounds(windowId),
        avatar: this.getClassAvatar(windowClass),
        shortcut: this.getStoredShortcut(windowId),
        enabled: this.getStoredEnabled(windowId)
      };
    } catch (error) {
      return null;
    }
  }

  getDofusClassPatterns() {
    return ['Dofus', 'dofus', 'ankama', 'Ankama', 'retro', 'DofusRetro'];
  }

  getDofusTitlePatterns() {
    return ['Dofus', 'Ankama', 'Retro'];
  }

  async getFallbackWindows() {
    try {
      console.log('WindowManager: Using fallback detection method...');
      
      // Try process-based detection
      const processes = await this.getDofusProcesses();
      const windows = [];
      
      if (processes.length > 0) {
        console.log(`Found ${processes.length} Dofus processes`);
        
        for (let i = 0; i < processes.length; i++) {
          const process = processes[i];
          const windowId = `fallback_${process.pid}_${i}`;
          const title = this.extractTitleFromProcess(process.command);
          
          if (this.isDofusWindow(title)) {
            const windowClass = this.getStoredClass(windowId);
            const windowInfo = {
              id: windowId,
              title: title,
              processName: 'Dofus',
              className: 'dofus',
              pid: process.pid,
              character: this.extractCharacterName(title),
              dofusClass: windowClass,
              customName: this.getStoredCustomName(windowId),
              initiative: this.getStoredInitiative(windowId),
              isActive: true,
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              avatar: this.getClassAvatar(windowClass),
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

  async getDofusProcesses() {
    try {
      const searchTerms = this.getDofusProcessNames();
      const processes = [];
      
      for (const term of searchTerms) {
        try {
          const { stdout } = await execAsync(`ps aux | grep -i "${term}" | grep -v grep | head -10`);
          if (stdout.trim()) {
            const lines = stdout.trim().split('\n');
            
            for (const line of lines) {
              const parts = line.split(/\s+/);
              if (parts.length >= 11) {
                const pid = parts[1];
                const command = parts.slice(10).join(' ');
                
                if (this.isDofusProcess(command)) {
                  processes.push({ pid, command });
                  console.log(`Found Dofus process: PID ${pid}, Command: ${command}`);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Process search failed for ${term}:`, error.message);
        }
      }
      
      return processes;
    } catch (error) {
      console.error('Error getting Dofus processes:', error);
      return [];
    }
  }

  getDofusProcessNames() {
    return ['dofus', 'Dofus', 'ankama', 'java.*dofus', 'retro'];
  }

  isDofusProcess(command) {
    if (!command) return false;
    
    const commandLower = command.toLowerCase();
    
    // Exclude obvious non-Dofus processes
    const excludes = ['grep', 'ps', 'awk', 'sed', 'organizer', 'electron'];
    if (excludes.some(exclude => commandLower.includes(exclude))) {
      return false;
    }
    
    // Check for Dofus-related terms
    const dofusTerms = ['dofus', 'ankama', 'retro', 'steamer', 'boulonix'];
    return dofusTerms.some(term => commandLower.includes(term));
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
    
    const titleLower = title.toLowerCase();
    console.log(`Checking if window is Dofus: "${title}"`);
    
    // First exclude system windows and browsers
    const excludePatterns = [
      /chrome/i, /firefox/i, /safari/i, /edge/i,
      /explorer/i, /desktop/i, /taskbar/i,
      /gnome/i, /kde/i, /xfce/i, /unity/i,
      /nautilus/i, /dolphin/i, /thunar/i,
      /terminal/i, /konsole/i, /xterm/i,
      /organizer/i, /config/i  // Exclude our own windows
    ];
    
    const isExcluded = excludePatterns.some(pattern => pattern.test(title));
    if (isExcluded) {
      console.log(`✗ Excluded: ${title}`);
      return false;
    }
    
    // Check for Dofus patterns
    const dofusPatterns = [
      /\bdofus\b/i,
      /\bankama\b/i,
      /\bretro\b/i,
      /\bsteamer\b/i,
      /\bboulonix\b/i
    ];
    
    const isDofus = dofusPatterns.some(pattern => {
      const matches = pattern.test(title);
      if (matches) {
        console.log(`✓ Pattern match: ${pattern} on "${title}"`);
      }
      return matches;
    });
    
    if (isDofus) {
      console.log(`✓ Identified as Dofus window: ${title}`);
    } else {
      console.log(`✗ Not a Dofus window: ${title}`);
    }
    
    return isDofus;
  }

  extractCharacterName(title) {
    if (!title) return 'Dofus Player';
    
    // For Dofus 3, the title is usually just "Dofus"
    // We'll use a simple approach for now
    if (title.trim() === 'Dofus') {
      return 'Dofus Player';
    }
    
    // Try to extract character name from window title for other versions
    const patterns = [
      /dofus\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*dofus/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // Clean up common suffixes
        name = name.replace(/\s*\(.*\)$/, '');
        name = name.replace(/\s*-.*$/, '');
        if (name.length > 0 && name.length < 50 && name !== 'Dofus') {
          return name;
        }
      }
    }
    
    // Default fallback
    return 'Dofus Player';
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

  // Class management methods
  setWindowClass(windowId, classKey) {
    const Store = require('electron-store');
    const store = new Store();
    const classes = store.get('classes', {});
    classes[windowId] = classKey;
    store.set('classes', classes);
    
    // Update the window info in memory
    if (this.windows.has(windowId)) {
      const windowData = this.windows.get(windowId);
      windowData.info.dofusClass = classKey;
      windowData.info.avatar = this.getClassAvatar(classKey);
      this.windows.set(windowId, windowData);
    }
  }

  getNextClass(currentClass) {
    const classKeys = Object.keys(this.dofusClasses);
    const currentIndex = classKeys.indexOf(currentClass);
    const nextIndex = (currentIndex + 1) % classKeys.length;
    return classKeys[nextIndex];
  }

  // Storage methods
  getStoredCustomName(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const customNames = store.get('customNames', {});
    return customNames[windowId] || null;
  }

  getStoredInitiative(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const initiatives = store.get('initiatives', {});
    return initiatives[windowId] || 0;
  }

  getStoredClass(windowId) {
    const Store = require('electron-store');
    const store = new Store();
    const classes = store.get('classes', {});
    return classes[windowId] || 'feca'; // Default to Feca
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