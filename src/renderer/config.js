const { ipcRenderer } = require('electron');

class ConfigRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.currentShortcutWindow = null;
        this.capturedShortcut = '';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadData();
    }

    initializeElements() {
        this.elements = {
            title: document.getElementById('title'),
            refreshBtn: document.getElementById('refresh-btn'),
            languageBtn: document.getElementById('language-btn'),
            closeBtn: document.getElementById('close-btn'),
            noWindows: document.getElementById('no-windows'),
            noWindowsText: document.getElementById('no-windows-text'),
            windowsList: document.getElementById('windows-list'),
            dockEnabled: document.getElementById('dock-enabled'),
            dockPosition: document.getElementById('dock-position'),
            dockLabel: document.getElementById('dock-label'),
            shortcutModal: document.getElementById('shortcut-modal'),
            shortcutTitle: document.getElementById('shortcut-title'),
            shortcutInstruction: document.getElementById('shortcut-instruction'),
            shortcutDisplay: document.getElementById('shortcut-display'),
            shortcutSave: document.getElementById('shortcut-save'),
            shortcutCancel: document.getElementById('shortcut-cancel'),
            shortcutRemove: document.getElementById('shortcut-remove')
        };
    }

    setupEventListeners() {
        // Header controls
        this.elements.refreshBtn.addEventListener('click', () => this.refreshWindows());
        this.elements.languageBtn.addEventListener('click', () => this.showLanguageMenu());
        this.elements.closeBtn.addEventListener('click', () => window.close());

        // Dock settings
        this.elements.dockEnabled.addEventListener('change', () => this.saveDockSettings());
        this.elements.dockPosition.addEventListener('change', () => this.saveDockSettings());

        // Shortcut modal
        this.elements.shortcutSave.addEventListener('click', () => this.saveShortcut());
        this.elements.shortcutCancel.addEventListener('click', () => this.hideShortcutModal());
        this.elements.shortcutRemove.addEventListener('click', () => this.removeShortcut());

        // Keyboard capture for shortcuts
        document.addEventListener('keydown', (e) => this.handleShortcutCapture(e));

        // IPC listeners
        ipcRenderer.on('windows-updated', (event, windows) => {
            this.windows = windows;
            this.renderWindows();
        });

        ipcRenderer.on('language-changed', (event, language) => {
            this.language = language;
            this.updateLanguage();
        });
    }

    async loadData() {
        try {
            this.windows = await ipcRenderer.invoke('get-dofus-windows');
            this.language = await ipcRenderer.invoke('get-language');
            this.settings = await ipcRenderer.invoke('get-settings');
            
            this.updateLanguage();
            this.renderWindows();
            this.loadDockSettings();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updateLanguage() {
        // Update UI text based on current language
        this.elements.title.textContent = 'Dofus Organizer';
        this.elements.noWindowsText.textContent = this.language.displayGUI_nowindow || 'No Dofus windows detected';
        this.elements.dockLabel.textContent = this.language.displayGUI_dock || 'Enable navigation dock';
        this.elements.shortcutTitle.textContent = this.language.displayGUI_raccourci || 'Set Shortcut';
        this.elements.shortcutInstruction.textContent = 'Press the key combination you want to use:';
    }

    renderWindows() {
        if (this.windows.length === 0) {
            this.elements.noWindows.style.display = 'block';
            this.elements.windowsList.style.display = 'none';
            return;
        }

        this.elements.noWindows.style.display = 'none';
        this.elements.windowsList.style.display = 'block';

        this.elements.windowsList.innerHTML = this.windows.map(window => `
            <div class="window-item" data-window-id="${window.id}">
                <div class="window-header">
                    <div class="window-avatar" onclick="configRenderer.changeAvatar('${window.id}')">
                        <img src="../../assets/avatars/${window.avatar}.png" alt="Avatar" 
                             onerror="this.src='../../assets/avatars/default.png'">
                    </div>
                    <div class="window-info">
                        <div class="window-title">${window.title}</div>
                        <div class="window-character">${window.character}</div>
                    </div>
                    <div class="window-controls">
                        <button class="btn btn-primary" onclick="configRenderer.activateWindow('${window.id}')" 
                                title="${this.language.displayGUI_menu_activate || 'Activate'}">
                            ▶
                        </button>
                        <div class="toggle-switch ${window.enabled ? 'active' : ''}" 
                             onclick="configRenderer.toggleWindow('${window.id}')"
                             title="${window.enabled ? 'Disable' : 'Enable'} window">
                        </div>
                    </div>
                </div>
                <div class="window-details">
                    <div class="detail-item">
                        <div class="detail-label">${this.language.displayGUI_initiative || 'Initiative'}</div>
                        <input type="number" class="detail-value initiative-input" 
                               value="${window.initiative}" 
                               onchange="configRenderer.updateInitiative('${window.id}', this.value)">
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">${this.language.displayGUI_raccourci || 'Shortcut'}</div>
                        <div class="shortcut-display" onclick="configRenderer.setShortcut('${window.id}')">
                            ${window.shortcut || this.language.shortcut_none || 'No shortcut'}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value" style="color: ${window.isActive ? '#27ae60' : '#e74c3c'}">
                            ${window.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async refreshWindows() {
        try {
            await ipcRenderer.invoke('refresh-windows');
        } catch (error) {
            console.error('Error refreshing windows:', error);
        }
    }

    async activateWindow(windowId) {
        try {
            await ipcRenderer.invoke('activate-window', windowId);
        } catch (error) {
            console.error('Error activating window:', error);
        }
    }

    async toggleWindow(windowId) {
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.enabled = !window.enabled;
            await this.saveSettings({ [`enabled.${windowId}`]: window.enabled });
            this.renderWindows();
        }
    }

    async updateInitiative(windowId, initiative) {
        const value = parseInt(initiative) || 0;
        await this.saveSettings({ [`initiatives.${windowId}`]: value });
        
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.initiative = value;
        }
    }

    setShortcut(windowId) {
        this.currentShortcutWindow = windowId;
        this.capturedShortcut = '';
        
        const window = this.windows.find(w => w.id === windowId);
        this.elements.shortcutDisplay.textContent = window?.shortcut || 'No shortcut';
        this.elements.shortcutModal.style.display = 'flex';
    }

    handleShortcutCapture(e) {
        if (this.elements.shortcutModal.style.display !== 'flex') return;
        
        e.preventDefault();
        e.stopPropagation();

        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Cmd');

        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;

        this.capturedShortcut = [...modifiers, key].join('+');
        this.elements.shortcutDisplay.textContent = this.capturedShortcut;
    }

    async saveShortcut() {
        if (this.currentShortcutWindow && this.capturedShortcut) {
            try {
                await ipcRenderer.invoke('set-shortcut', this.currentShortcutWindow, this.capturedShortcut);
                
                const window = this.windows.find(w => w.id === this.currentShortcutWindow);
                if (window) {
                    window.shortcut = this.capturedShortcut;
                }
                
                this.renderWindows();
            } catch (error) {
                console.error('Error saving shortcut:', error);
            }
        }
        this.hideShortcutModal();
    }

    async removeShortcut() {
        if (this.currentShortcutWindow) {
            try {
                await ipcRenderer.invoke('remove-shortcut', this.currentShortcutWindow);
                
                const window = this.windows.find(w => w.id === this.currentShortcutWindow);
                if (window) {
                    window.shortcut = null;
                }
                
                this.renderWindows();
            } catch (error) {
                console.error('Error removing shortcut:', error);
            }
        }
        this.hideShortcutModal();
    }

    hideShortcutModal() {
        this.elements.shortcutModal.style.display = 'none';
        this.currentShortcutWindow = null;
        this.capturedShortcut = '';
    }

    loadDockSettings() {
        const dock = this.settings.dock || { enabled: false, position: 'SE' };
        this.elements.dockEnabled.checked = dock.enabled;
        this.elements.dockPosition.value = dock.position;
    }

    async saveDockSettings() {
        const dockSettings = {
            enabled: this.elements.dockEnabled.checked,
            position: this.elements.dockPosition.value
        };
        
        await this.saveSettings({ dock: dockSettings });
    }

    async saveSettings(settings) {
        try {
            await ipcRenderer.invoke('save-settings', settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    changeAvatar(windowId) {
        // Cycle through available avatars
        const avatars = ['default', 'warrior', 'mage', 'archer', 'rogue'];
        const window = this.windows.find(w => w.id === windowId);
        
        if (window) {
            const currentIndex = avatars.indexOf(window.avatar);
            const nextIndex = (currentIndex + 1) % avatars.length;
            window.avatar = avatars[nextIndex];
            
            this.saveSettings({ [`avatars.${windowId}`]: window.avatar });
            this.renderWindows();
        }
    }

    showLanguageMenu() {
        // Simple language toggle for now
        const currentLang = this.settings.language || 'FR';
        const newLang = currentLang === 'FR' ? 'EN' : 'FR';
        
        this.saveSettings({ language: newLang });
        // The main process will handle the language change
    }
}

// Initialize the renderer
const configRenderer = new ConfigRenderer();