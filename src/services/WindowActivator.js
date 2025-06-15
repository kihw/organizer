const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

/**
 * WindowActivator - Gestionnaire d'activation utilisant le script Python
 * Remplace complètement toutes les méthodes PowerShell par du Python natif
 */
class WindowActivator {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../../scripts/window_activator.py');
    this.pythonCommand = 'python'; // ou 'python3' selon l'installation

    // Statistiques de performance
    this.stats = {
      activations: 0,
      successes: 0,
      failures: 0,
      totalTime: 0,
      avgTime: 0,
      fastActivations: 0 // <50ms
    };

    console.log('WindowActivator: Initialized with Python script activation');
    this.verifyPythonScript();
  }

  /**
   * Vérifie que le script Python existe et que Python est disponible
   */
  async verifyPythonScript() {
    try {
      // Vérifier que le script existe
      if (!fs.existsSync(this.pythonScriptPath)) {
        console.error(`WindowActivator: Script not found at ${this.pythonScriptPath}`);
        return false;
      }

      // Tester que Python fonctionne
      const { stdout, stderr } = await execAsync(`${this.pythonCommand} --version`, {
        timeout: 2000
      });

      console.log(`WindowActivator: Python available - ${stdout.trim()}`);
      return true;

    } catch (error) {
      console.warn('WindowActivator: Python verification failed:', error.message);

      // Essayer python3 si python échoue
      try {
        this.pythonCommand = 'python3';
        const { stdout } = await execAsync('python3 --version', { timeout: 2000 });
        console.log(`WindowActivator: Python3 available - ${stdout.trim()}`);
        return true;
      } catch (python3Error) {
        console.error('WindowActivator: Neither python nor python3 available');
        return false;
      }
    }
  }

  /**
   * Active une fenêtre en utilisant le nom du personnage
   * MÉTHODE PRINCIPALE - Remplace toutes les autres méthodes d'activation
   */
  async activateWindow(windowId) {
    const startTime = Date.now();

    try {
      this.stats.activations++;

      // Extraire le nom du personnage du windowId
      const characterName = this.extractCharacterName(windowId);

      if (!characterName) {
        console.error(`WindowActivator: Cannot extract character name from ${windowId}`);
        this.updateStats(startTime, false);
        return false;
      }

      console.log(`WindowActivator: Activating window for character "${characterName}"`);

      // Exécuter le script Python
      const command = `${this.pythonCommand} "${this.pythonScriptPath}" activate "${characterName}"`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 3000, // 3s max
        encoding: 'utf8'
      });

      // Parser la réponse JSON du script Python
      const result = JSON.parse(stdout.trim());

      const duration = Date.now() - startTime;

      if (result.success) {
        this.updateStats(startTime, true);
        console.log(`WindowActivator: SUCCESS for "${characterName}" in ${duration}ms (Python: ${result.duration.toFixed(2)}ms)`);
        console.log(`WindowActivator: Activated window: "${result.window_title}"`);
        return true;
      } else {
        this.updateStats(startTime, false);
        console.warn(`WindowActivator: FAILED for "${characterName}": ${result.error}`);
        return false;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats(startTime, false);
      console.error(`WindowActivator: Error activating ${windowId}:`, error.message);
      return false;
    }
  }

  /**
   * Extrait le nom du personnage depuis l'ID de fenêtre
   * Format attendu: "charactername_class_pid" ou similaire
   */
  extractCharacterName(windowId) {
    if (!windowId || typeof windowId !== 'string') {
      return null;
    }

    try {
      // Cas 1: Format "charactername_class_pid"
      const parts = windowId.split('_');
      if (parts.length >= 2) {
        return parts[0]; // Premier segment = nom du personnage
      }

      // Cas 2: Format direct (juste le nom du personnage)
      if (windowId.length > 0) {
        return windowId;
      }

      return null;
    } catch (error) {
      console.warn('WindowActivator: Error extracting character name:', error.message);
      return null;
    }
  }

  /**
   * Détecte les fenêtres Dofus en utilisant le script Python
   */
  async getDofusWindows() {
    const startTime = Date.now();

    try {
      console.log('WindowActivator: Detecting Dofus windows with Python...');

      const command = `${this.pythonCommand} "${this.pythonScriptPath}" list`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 5000, // 5s max
        encoding: 'utf8'
      });

      const result = JSON.parse(stdout.trim());

      if (result.success) {
        const duration = Date.now() - startTime;
        console.log(`WindowActivator: Detected ${result.count} Dofus windows in ${duration}ms`);

        // Convertir les fenêtres Python en format Node.js
        const processedWindows = this.convertPythonWindows(result.windows);
        return processedWindows;
      } else {
        console.error('WindowActivator: Window detection failed:', result.error);
        return [];
      }

    } catch (error) {
      console.error('WindowActivator: Error detecting windows:', error.message);
      return [];
    }
  }

  /**
   * Convertit les fenêtres détectées par Python au format Node.js
   */
  convertPythonWindows(pythonWindows) {
    const processedWindows = [];

    for (const pyWindow of pythonWindows) {
      try {
        const { character, dofusClass } = this.parseWindowTitle(pyWindow.title);
        const windowId = this.generateWindowId(character, dofusClass, pyWindow.hwnd);

        const windowInfo = {
          id: windowId,
          handle: pyWindow.hwnd.toString(),
          realHandle: pyWindow.hwnd,
          title: pyWindow.title,
          character: character,
          dofusClass: dofusClass,
          isActive: false,
          visible: pyWindow.visible,
          minimized: pyWindow.minimized,
          avatar: this.getClassAvatar(dofusClass),
          enabled: true,
          initiative: 0,
          shortcut: null
        };

        processedWindows.push(windowInfo);

      } catch (error) {
        console.warn('WindowActivator: Error processing window:', error.message);
      }
    }

    return processedWindows;
  }

  /**
   * Parse le titre de fenêtre pour extraire personnage et classe
   */
  parseWindowTitle(title) {
    if (!title) {
      return { character: 'Unknown', dofusClass: 'feca' };
    }

    // Format typique: "Character - Class - ..."
    const match = title.match(/^([^-]+)\s*-\s*([^-]+)/);
    if (match) {
      const character = match[1].trim();
      const className = match[2].trim().toLowerCase();
      const normalizedClass = this.normalizeClassName(className);

      return { character, dofusClass: normalizedClass };
    }

    // Fallback: utiliser le début du titre comme nom de personnage
    const character = title.split(/[-\(\[\{]/)[0].trim() || 'Unknown';
    return { character, dofusClass: 'feca' };
  }

  /**
   * Normalise le nom de classe Dofus
   */
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

  /**
   * Génère un ID de fenêtre stable
   */
  generateWindowId(character, dofusClass, hwnd) {
    const normalizedChar = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedClass = dofusClass.toLowerCase();
    return `${normalizedChar}_${normalizedClass}_${hwnd}`;
  }

  /**
   * Obtient l'avatar de classe
   */
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

  /**
   * Met à jour les statistiques de performance
   */
  updateStats(startTime, success) {
    const duration = Date.now() - startTime;

    this.stats.totalTime += duration;
    this.stats.avgTime = this.stats.totalTime / this.stats.activations;

    if (success) {
      this.stats.successes++;
      if (duration < 50) {
        this.stats.fastActivations++;
      }
    } else {
      this.stats.failures++;
    }
  }

  /**
   * Obtient les statistiques de performance
   */
  getStats() {
    const successRate = this.stats.activations > 0 ?
      (this.stats.successes / this.stats.activations * 100) : 100;

    const fastRate = this.stats.activations > 0 ?
      (this.stats.fastActivations / this.stats.activations * 100) : 0;

    return {
      ...this.stats,
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(1)),
      fastRate: parseFloat(fastRate.toFixed(1)),
      method: 'Python Native',
      target: '<50ms',
      pythonScript: this.pythonScriptPath,
      pythonCommand: this.pythonCommand
    };
  }

  /**
   * Teste la connexion Python
   */
  async testPythonConnection() {
    try {
      const command = `${this.pythonCommand} "${this.pythonScriptPath}" list`;
      const { stdout } = await execAsync(command, { timeout: 3000 });
      const result = JSON.parse(stdout.trim());

      return {
        success: result.success,
        windowCount: result.count || 0,
        duration: result.duration || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Nettoyage
   */
  cleanup() {
    console.log('WindowActivator: Cleanup completed');
    console.log('Final Python activation stats:', this.getStats());
  }
}

module.exports = WindowActivator;
