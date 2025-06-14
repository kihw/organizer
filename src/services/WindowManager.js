const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.lastWindowCheck = 0;
    this.isLinux = process.platform === 'linux';
    this.windowIdMapping = new Map(); // Map stable IDs to current window handles
    
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

  // Generate stable window ID based on character name and class
  generateStableWindowId(character, dofusClass, processId) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${processId}`;
  }

  async getDofusWindows() {
    try {
      // Throttle window checks to avoid performance issues
      const now = Date.now();
      if (now - this.lastWindowCheck < 500) { // Reduced throttle time
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
          const windowHandle = parts[0];
          const desktop = parts[1];
          const pid = parts[2];
          const className = parts[3];
          const hostName = parts[4];
          const title = parts.slice(5).join(' ');
          
          console.log(`Checking window: ${title} (class: ${className}, pid: ${pid})`);
          
          if (this.isDofusWindow(title) || this.isDofusWindow(className)) {
            console.log(`✓ Found Dofus window: ${title}`);
            
            // Parse character info from title
            const { character, dofusClass } = this.parseWindowTitle(title);
            
            // Generate stable ID
            const stableId = this.generateStableWindowId(character, dofusClass, pid);
            
            // Map the stable ID to the current window handle
            this.windowIdMapping.set(stableId, windowHandle);
            currentWindowIds.add(stableId);
            
            const windowClass = this.getStoredClass(stableId);
            const finalClass = windowClass !== 'feca' ? windowClass : dofusClass;
            
            const windowInfo = {
              id: stableId, // Use stable ID
              handle: windowHandle, // Keep the actual handle for activation
              title: title,
              processName: className.split('.')[0] || 'Dofus',
              className: className,
              pid: pid,
              character: character,
              dofusClass: finalClass,
              customName: this.getStoredCustomName(stableId),
              initiative: this.getStoredInitiative(stableId),
              isActive: await this.isLinuxWindowActive(windowHandle),
              bounds: await this.getLinuxWindowBounds(windowHandle),
              avatar: this.getClassAvatar(finalClass),
              shortcut: this.getStoredShortcut(stableId),
              enabled: this.getStoredEnabled(stableId)
            };
            
            windows.push(windowInfo);
            this.windows.set(stableId, { info: windowInfo });
          }
        }
      }
    }

    // Remove windows that no longer exist
    for (const [windowId] of this.windows) {
      if (!currentWindowIds.has(windowId)) {
        this.windows.delete(windowId);
        this.windowIdMapping.delete(windowId);
      }
    }

    return windows;
  }

  parseWindowTitle(title) {
    if (!title) {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }

    console.log(`WindowManager: Parsing title: "${title}"`);

    // Expected format: "Nom - Classe - Version - Release"
    const parts = title.split(' - ').map(part => part.trim());
    
    if (parts.length >= 2) {
      const characterName = parts[0];
      const className = parts[1];
      
      // Normalize class name
      const normalizedClass = this.normalizeClassName(className);
      
      console.log(`WindowManager: Parsed - Character: "${characterName}", Class: "${className}" -> "${normalizedClass}"`);
      
      return {
        character: characterName || 'Dofus Player',
        dofusClass: normalizedClass
      };
    }
    
    // Fallback: try to extract from other formats
    const fallbackResult = this.extractCharacterNameFallback(title);
    console.log(`WindowManager: Fallback parsing result:`, fallbackResult);
    
    return fallbackResult;
  }

  normalizeClassName(className) {
    if (!className) return 'feca';
    
    const normalized = className.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .trim();
    
    // Class name mappings
    const classNameMappings = {
      'feca': 'feca', 'féca': 'feca',
      'osamodas': 'osamodas',
      'enutrof': 'enutrof',
      'sram': 'sram',
      'xelor': 'xelor', 'xélor': 'xelor',
      'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa',
      'iop': 'iop',
      'cra': 'cra',
      'sadida': 'sadida',
      'sacrieur': 'sacrieur',
      'pandawa': 'pandawa',
      'roublard': 'roublard', 'rogue': 'roublard',
      'zobal': 'zobal', 'masqueraider': 'zobal',
      'steamer': 'steamer', 'foggernaut': 'steamer',
      'eliotrope': 'eliotrope', 'eliotrop': 'eliotrope', 'elio': 'eliotrope',
      'huppermage': 'huppermage', 'hupper': 'huppermage',
      'ouginak': 'ouginak', 'ougi': 'ouginak',
      'forgelance': 'forgelance'
    };
    
    // Check direct mappings first
    if (classNameMappings[normalized]) {
      return classNameMappings[normalized];
    }
    
    // Check partial matches
    for (const [key, value] of Object.entries(classNameMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Default fallback
    console.warn(`WindowManager: Unknown class name: "${className}", using default "feca"`);
    return 'feca';
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

  async getWindowInfoById(windowHandle) {
    try {
      // Get window properties using xprop
      const { stdout } = await execAsync(`xprop -id ${windowHandle} WM_NAME WM_CLASS _NET_WM_NAME _NET_WM_PID 2>/dev/null || echo ""`);
      
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
      
      // Parse character info from title
      const { character, dofusClass } = this.parseWindowTitle(title);
      
      // Generate stable ID
      const stableId = this.generateStableWindowId(character, dofusClass, pid);
      
      // Map the stable ID to the current window handle
      this.windowIdMapping.set(stableId, windowHandle);
      
      const windowClass = this.getStoredClass(stableId);
      const finalClass = windowClass !== 'feca' ? windowClass : dofusClass;
      
      return {
        id: stableId, // Use stable ID
        handle: windowHandle, // Keep the actual handle for activation
        title: title,
        processName: className || 'Unknown',
        className: className,
        pid: pid,
        character: character,
        dofusClass: finalClass,
        customName: this.getStoredCustomName(stableId),
        initiative: this.getStoredInitiative(stableId),
        isActive: await this.isLinuxWindowActive(windowHandle),
        bounds: await this.getLinuxWindowBounds(windowHandle),
        avatar: this.getClassAvatar(finalClass),
        shortcut: this.getStoredShortcut(stableId),
        enabled: this.getStoredEnabled(stableId)
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
          const title = this.extractTitleFromProcess(process.command);
          
          if (this.isDofusWindow(title)) {
            // Parse character info from title
            const { character, dofusClass } = this.parseWindowTitle(title);
            
            // Generate stable ID
            const stableId = this.generateStableWindowId(character, dofusClass, process.pid);
            
            const windowClass = this.getStoredClass(stableId);
            const finalClass = windowClass !== 'feca' ? windowClass : dofusClass;
            
            const windowInfo = {
              id: stableId, // Use stable ID
              handle: `fallback_${process.pid}_${i}`, // Fallback handle
              title: title,
              processName: 'Dofus',
              className: 'dofus',
              pid: process.pid,
              character: character,
              dofusClass: finalClass,
              customName: this.getStoredCustomName(stableId),
              initiative: this.getStoredInitiative(stableId),
              isActive: true,
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              avatar: this.getClassAvatar(finalClass),
              shortcut: this.getStoredShortcut(stableId),
              enabled: this.getStoredEnabled(stableId)
            };
            
            windows.push(windowInfo);
            this.windows.set(stableId, { info: windowInfo });
            this.windowIdMapping.set(stableId, windowInfo.handle);
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
    return 'TestChar - Feca - Dofus 3 - Beta';
  }

  extractCharacterNameFallback(title) {
    if (!title) return { character: 'Dofus Player', dofusClass: 'feca' };
    
    // For Dofus 3, the title is usually just "Dofus"
    if (title.trim() === 'Dofus') {
      return { character: 'Dofus Player', dofusClass: 'feca' };
    }
    
    // Try to extract character name from window title using various patterns
    const patterns = [
      /^([^-]+)\s*-\s*([^-]+)/i,  // "Name - Class" format
      /dofus\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*dofus/i,
      /retro\s*-\s*(.+?)(?:\s*\(|$)/i,
      /(.+?)\s*-\s*retro/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        let detectedClass = 'feca';
        
        // If we have a second capture group, it might be the class
        if (match[2]) {
          detectedClass = this.normalizeClassName(match[2].trim());
        }
        
        // Clean up common suffixes
        name = name.replace(/\s*\(.*\)$/, '');
        name = name.replace(/\s*-.*$/, '');
        
        if (name.length > 0 && name.length < 50 && name !== 'Dofus') {
          return { character: name, dofusClass: detectedClass };
        }
      }
    }
    
    return { character: 'Dofus Player', dofusClass: 'feca' };
  }

  async isLinuxWindowActive(windowHandle) {
    try {
      const { stdout } = await execAsync(`xprop -id ${windowHandle} _NET_WM_STATE 2>/dev/null || echo ""`);
      return !stdout.includes('_NET_WM_STATE_HIDDEN');
    } catch (error) {
      return true; // Assume active if we can't determine
    }
  }

  async getLinuxWindowBounds(windowHandle) {
    try {
      const { stdout } = await execAsync(`xwininfo -id ${windowHandle} 2>/dev/null || echo ""`);
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

  async activateWindow(windowId) {
    try {
      console.log(`WindowManager: Activating window ${windowId}`);
      
      // Get the actual window handle from the stable ID
      const windowHandle = this.windowIdMapping.get(windowId);
      if (!windowHandle) {
        console.error(`WindowManager: No handle found for window ID ${windowId}`);
        return false;
      }
      
      if (this.isLinux) {
        return await this.activateLinuxWindow(windowHandle);
      } else {
        return this.activateFallbackWindow(windowId);
      }
    } catch (error) {
      console.error('Error activating window:', error);
      return false;
    }
  }

  async activateLinuxWindow(windowHandle) {
    try {
      // Try multiple methods to activate window on Linux
      const commands = [
        `wmctrl -i -a ${windowHandle}`,
        `xdotool windowactivate ${windowHandle}`,
        `xprop -id ${windowHandle} -f _NET_ACTIVE_WINDOW 32a -set _NET_ACTIVE_WINDOW 1`
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
      const windowHandle = this.windowIdMapping.get(windowId);
      if (!windowHandle) {
        console.error(`WindowManager: No handle found for window ID ${windowId}`);
        return false;
      }
      
      if (this.isLinux) {
        await execAsync(`wmctrl -i -r ${windowHandle} -e 0,${x},${y},-1,-1 2>/dev/null`);
        return true;
      }
    } catch (error) {
      console.error('Error moving window:', error);
    }
    return false;
  }

  async resizeWindow(windowId, width, height) {
    try {
      const windowHandle = this.windowIdMapping.get(windowId);
      if (!windowHandle) {
        console.error(`WindowManager: No handle found for window ID ${windowId}`);
        return false;
      }
      
      if (this.isLinux) {
        await execAsync(`wmctrl -i -r ${windowHandle} -e 0,-1,-1,${width},${height} 2>/dev/null`);
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