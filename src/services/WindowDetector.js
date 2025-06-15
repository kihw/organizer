const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * WindowDetector
 * Detects Dofus windows using PowerShell and pure JavaScript logic.
 * A Dofus window title starts with "{Character} - {Class}".
 */
class WindowDetector {
  constructor() {
    this.powershell = 'powershell.exe';
  }

  /**
   * Returns a list of Dofus windows.
   * Each window object contains id, title, character, dofusClass and handle info.
   */
  async getDofusWindows() {
    const psScript = [
      'Get-Process | Where-Object {',
      '  $_.MainWindowHandle -ne 0 -and',
      '  $_.MainWindowTitle -ne ""',
      '} | ForEach-Object {',
      '  [PSCustomObject]@{',
      '    Title = $_.MainWindowTitle;',
      '    Handle = $_.MainWindowHandle.ToInt64();',
      '    PID = $_.Id',
      '  }',
      '} | ConvertTo-Json -Depth 2'
    ].join(' ');

    const command = `${this.powershell} -NoProfile -Command "${psScript}"`;

    try {
      const { stdout } = await execAsync(command, {
        timeout: 10000,
        encoding: 'utf8',
        windowsHide: true
      });

      if (!stdout || !stdout.trim()) {
        return [];
      }

      const processes = JSON.parse(stdout.trim());
      const processArray = Array.isArray(processes) ? processes : [processes];

      const windows = [];

      for (const proc of processArray) {
        if (proc.Title && this.isDofusTitle(proc.Title)) {
          const { character, dofusClass } = this.parseWindowTitle(proc.Title);
          windows.push({
            id: this.generateWindowId(character, dofusClass, proc.Handle),
            handle: proc.Handle.toString(),
            realHandle: proc.Handle,
            title: proc.Title,
            character,
            dofusClass,
            isActive: false,
            visible: true,
            minimized: false,
            avatar: this.getClassAvatar(dofusClass),
            enabled: true,
            initiative: 0,
            shortcut: null
          });
        }
      }

      return windows;
    } catch (error) {
      console.error('WindowDetector: detection failed:', error.message);
      return [];
    }
  }

  /** Checks if the title matches the Dofus window pattern. */
  isDofusTitle(title) {
    return /^([^\-]+)\s*-\s*([A-Za-z]+)/.test(title);
  }

  /** Parses the window title to extract character name and class. */
  parseWindowTitle(title) {
    if (!title) {
      return { character: 'Unknown', dofusClass: 'feca' };
    }

    const match = title.match(/^([^\-]+)\s*-\s*([^\-]+)/);
    if (match) {
      const character = match[1].trim();
      const className = match[2].trim().toLowerCase();
      const normalizedClass = this.normalizeClassName(className);
      return { character, dofusClass: normalizedClass };
    }

    const character = title.split(/[\-\(\[\{]/)[0].trim() || 'Unknown';
    return { character, dofusClass: 'feca' };
  }

  /** Normalizes the class name. */
  normalizeClassName(className) {
    const classMap = {
      'feca': 'feca', 'féca': 'feca', 'osamodas': 'osamodas', 'enutrof': 'enutrof',
      'sram': 'sram', 'xelor': 'xelor', 'xélor': 'xelor', 'ecaflip': 'ecaflip',
      'eniripsa': 'eniripsa', 'iop': 'iop', 'cra': 'cra', 'sadida': 'sadida',
      'sacrieur': 'sacrieur', 'pandawa': 'pandawa', 'roublard': 'roublard',
      'zobal': 'zobal', 'steamer': 'steamer', 'eliotrope': 'eliotrope',
      'huppermage': 'huppermage', 'ouginak': 'ouginak', 'forgelance': 'forgelance'
    };
    const normalized = className.replace(/[^a-z]/g, '');
    return classMap[normalized] || 'feca';
  }

  /** Generates a stable window ID. */
  generateWindowId(character, dofusClass, handle) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${handle}`;
  }

  /** Returns an avatar index from class name. */
  getClassAvatar(className) {
    const avatarMap = {
      'feca': '1', 'osamodas': '2', 'enutrof': '3', 'sram': '4', 'xelor': '5',
      'ecaflip': '6', 'eniripsa': '7', 'iop': '8', 'cra': '9', 'sadida': '10',
      'sacrieur': '11', 'pandawa': '12', 'roublard': '13', 'zobal': '14',
      'steamer': '15', 'eliotrope': '16', 'huppermage': '17', 'ouginak': '18',
      'forgelance': '20'
    };
    return avatarMap[className] || '1';
  }
}

module.exports = WindowDetector;
