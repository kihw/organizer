const fs = require('fs');
const path = require('path');

class LanguageManager {
  constructor() {
    this.currentLanguage = 'FR';
    this.languages = {};
    this.loadLanguages();
  }

  loadLanguages() {
    try {
      const languageFile = path.join(__dirname, '../../locales/languages.json');
      if (fs.existsSync(languageFile)) {
        this.languages = JSON.parse(fs.readFileSync(languageFile, 'utf8'));
      } else {
        // Fallback to embedded languages
        this.languages = this.getEmbeddedLanguages();
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      this.languages = this.getEmbeddedLanguages();
    }
  }

  getEmbeddedLanguages() {
    return {
      FR: {
        main_about: "A propos...",
        main_refreshsort: "Rafraîchir/trier",
        main_sorting: "Tri",
        main_configure: "Configurer",
        main_quit: "Quitter",
        main_remove: "Retirer",
        main_none: "Aucun",
        main_unknown: "Inconnu",
        main_language: "Langue",
        main_profil: "Profil",
        main_noprofil: "Pas de profil",
        main_profil_X: "Profil n°{0}",
        
        displayTray_element_0: "Aucun élément détecté (ni fenêtre, ni raccourci)",
        displayTray_element_1: "Un élément détecté",
        displayTray_element_N: "{0} éléments détectés",
        
        displayGUI_nowindow: "Aucune fenêtre Dofus visible, cliquez sur [Rafraîchir]",
        displayGUI_avatar: "Avatar",
        displayGUI_personnage: "Personnage",
        displayGUI_initiative: "Initiative",
        displayGUI_raccourci: "Raccourci",
        displayGUI_refreshsort: "Rafraîchir la liste et trier les fenêtres",
        
        shortcut_none: "Aucun raccourci",
        shortcut_unknown: "Raccourci inconnu"
      },
      EN: {
        main_about: "About...",
        main_refreshsort: "Refresh/Order",
        main_sorting: "Order",
        main_configure: "Configure",
        main_quit: "Quit",
        main_remove: "Remove",
        main_none: "None",
        main_unknown: "Unknown",
        main_language: "Language",
        main_profil: "Profile",
        main_noprofil: "No profile",
        main_profil_X: "Profile #{0}",
        
        displayTray_element_0: "No element detected (no window, no shortcut)",
        displayTray_element_1: "One element detected",
        displayTray_element_N: "{0} elements detected",
        
        displayGUI_nowindow: "No Dofus window available, click on [Refresh]",
        displayGUI_avatar: "Avatar Icon",
        displayGUI_personnage: "Character",
        displayGUI_initiative: "Initiative",
        displayGUI_raccourci: "Shortcut",
        displayGUI_refreshsort: "Refresh the list and order the windows",
        
        shortcut_none: "No shortcut",
        shortcut_unknown: "Unknown shortcut"
      }
    };
  }

  setLanguage(langCode) {
    if (this.languages[langCode]) {
      this.currentLanguage = langCode;
    }
  }

  getCurrentLanguage() {
    return this.languages[this.currentLanguage] || this.languages['FR'];
  }

  getLanguageMenu(callback) {
    const availableLanguages = [
      { code: 'FR', name: 'Français' },
      { code: 'EN', name: 'English' }
    ];

    return availableLanguages.map(lang => ({
      label: lang.name,
      type: 'radio',
      checked: this.currentLanguage === lang.code,
      click: () => callback(lang.code)
    }));
  }

  translate(key, ...args) {
    const lang = this.getCurrentLanguage();
    let text = lang[key] || key;
    
    // Replace placeholders {0}, {1}, etc.
    args.forEach((arg, index) => {
      text = text.replace(`{${index}}`, arg);
    });
    
    return text;
  }
}

module.exports = LanguageManager;