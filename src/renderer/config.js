const { ipcRenderer } = require('electron');

class ConfigRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.currentShortcutWindow = null;
        this.capturedShortcut = '';
        this.isCapturingShortcut = false;
        
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
        this.elements.languageBtn.addEventListener('click', () => this.toggleLanguage());
        this.elements.closeBtn.addEventListener('click', () => window.close());

        // Dock settings
        this.elements.dockEnabled.addEventListener('change', () => this.saveDockSettings());
        this.elements.dockPosition.addEventListener('change', () => this.saveDockSettings());

        // Shortcut modal
        this.elements.shortcutSave.addEventListener('click', () => this.saveShortcut());
        this.elements.shortcutCancel.addEventListener('click', () => this.hideShortcutModal());
        this.elements.shortcutRemove.addEventListener('click', () => this.removeShortcut());

        // Modal background click to close
        this.elements.shortcutModal.addEventListener('click', (e) => {
            if (e.target === this.elements.shortcutModal) {
                this.hideShortcutModal();
            }
        });

        // Keyboard capture for shortcuts
        document.addEventListener('keydown', (e) => this.handleShortcutCapture(e));
        document.addEventListener('keyup', (e) => this.handleShortcutRelease(e));

        // IPC listeners
        ipcRenderer.on('windows-updated', (event, windows) => {
            this.windows = windows;
            this.renderWindows();
        });

        ipcRenderer.on('language-changed', (event, language) => {
            this.language = language;
            this.updateLanguage();
        });

        // Window focus/blur events
        window.addEventListener('focus', () => {
            this.refreshWindows();
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
        
        // Update tooltips
        this.elements.refreshBtn.title = this.language.displayGUI_refreshsort || 'Refresh windows';
        this.elements.languageBtn.title = this.language.main_language || 'Change language';
        this.elements.closeBtn.title = 'Close configuration';
        
        // Update dock position options
        const positionOptions = {
            'NW': this.language.displayGUI_dock_NW || 'Top Left',
            'NE': this.language.displayGUI_dock_NE || 'Top Right',
            'SW': this.language.displayGUI_dock_SW || 'Bottom Left',
            'SE': this.language.displayGUI_dock_SE || 'Bottom Right',
            'N': this.language.displayGUI_dock_N || 'Top (Horizontal)',
            'S': this.language.displayGUI_dock_S || 'Bottom (Horizontal)'
        };
        
        Array.from(this.elements.dockPosition.options).forEach(option => {
            if (positionOptions[option.value]) {
                option.textContent = positionOptions[option.value];
            }
        });
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
                    <div class="window-avatar" onclick="configRenderer.changeAvatar('${window.id}')" 
                         title="${this.language.displayGUI_avatar || 'Avatar'}">
                        <img src="../../assets/avatars/${window.avatar}.png" alt="Avatar" 
                             onerror="this.src='../../assets/avatars/default.png'">
                    </div>
                    <div class="window-info">
                        <div class="window-title">${this.escapeHtml(window.title)}</div>
                        <div class="window-character">${this.escapeHtml(window.character)}</div>
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
                               value="${window.initiative}" min="0" max="9999"
                               onchange="configRenderer.updateInitiative('${window.id}', this.value)"
                               title="Character initiative for sorting">
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">${this.language.displayGUI_raccourci || 'Shortcut'}</div>
                        <div class="shortcut-display" onclick="configRenderer.setShortcut('${window.id}')"
                             title="Click to set keyboard shortcut">
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async refreshWindows() {
        try {
            this.elements.refreshBtn.disabled = true;
            this.elements.refreshBtn.innerHTML = '<img src="../../assets/icons/refresh.png" alt="Refresh" style="animation: spin 1s linear infinite;">';
            
            await ipcRenderer.invoke('refresh-windows');
            
            setTimeout(() => {
                this.elements.refreshBtn.disabled = false;
                this.elements.refreshBtn.innerHTML = '<img src="../../assets/icons/refresh.png" alt="Refresh">';
            }, 1000);
        } catch (error) {
            console.error('Error refreshing windows:', error);
            this.elements.refreshBtn.disabled = false;
            this.elements.refreshBtn.innerHTML = '<img src="../../assets/icons/refresh.png" alt="Refresh">';
        }
    }

    async activateWindow(windowId) {
        try {
            const success = await ipcRenderer.invoke('activate-window', windowId);
            if (success) {
                // Visual feedback
                const windowElement = document.querySelector(`[data-window-id="${windowId}"]`);
                if (windowElement) {
                    windowElement.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        windowElement.style.transform = '';
                    }, 200);
                }
            }
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
        const value = Math.max(0, Math.min(9999, parseInt(initiative) || 0));
        await this.saveSettings({ [`initiatives.${windowId}`]: value });
        
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.initiative = value;
        }
        
        // Re-sort windows by initiative
        setTimeout(() => this.refreshWindows(), 500);
    }

    setShortcut(windowId) {
        this.currentShortcutWindow = windowId;
        this.capturedShortcut = '';
        this.isCapturingShortcut = false;
        
        const window = this.windows.find(w => w.id === windowId);
        this.elements.shortcutDisplay.textContent = window?.shortcut || this.language.shortcut_none || 'No shortcut';
        this.elements.shortcutModal.style.display = 'flex';
        
        // Focus the modal for better keyboard capture
        this.elements.shortcutModal.focus();
    }

    handleShortcutCapture(e) {
        if (this.elements.shortcutModal.style.display !== 'flex') return;
        
        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier-only presses
        if (['Control', 'Alt', 'Shift', 'Meta', 'Super'].includes(e.key)) {
            return;
        }

        this.isCapturingShortcut = true;
        
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Cmd');

        let key = e.key;
        
        // Handle special keys
        const specialKeys = {
            ' ': 'Space',
            'Enter': 'Return',
            'Escape': 'Escape',
            'Backspace': 'Backspace',
            'Tab': 'Tab',
            'Delete': 'Delete',
            'Insert': 'Insert',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PageUp',
            'PageDown': 'PageDown',
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right'
        };
        
        if (specialKeys[key]) {
            key = specialKeys[key];
        } else if (key.startsWith('F') && key.length <= 3) {
            // Function keys F1-F12
            key = key.toUpperCase();
        } else if (key.length === 1) {
            // Regular character keys
            key = key.toUpperCase();
        }

        // Require at least one modifier for regular keys (except function keys)
        if (modifiers.length === 0 && !key.startsWith('F')) {
            this.elements.shortcutDisplay.textContent = 'Use at least one modifier (Ctrl, Alt, Shift)';
            this.elements.shortcutDisplay.style.color = '#e74c3c';
            return;
        }

        this.capturedShortcut = [...modifiers, key].join('+');
        this.elements.shortcutDisplay.textContent = this.capturedShortcut;
        this.elements.shortcutDisplay.style.color = '#27ae60';
    }

    handleShortcutRelease(e) {
        // Reset color when keys are released
        if (this.isCapturingShortcut && this.elements.shortcutModal.style.display === 'flex') {
            setTimeout(() => {
                this.elements.shortcutDisplay.style.color = '';
            }, 100);
        }
    }

    async saveShortcut() {
        if (this.currentShortcutWindow && this.capturedShortcut) {
            try {
                const success = await ipcRenderer.invoke('set-shortcut', this.currentShortcutWindow, this.capturedShortcut);
                
                if (success) {
                    const window = this.windows.find(w => w.id === this.currentShortcutWindow);
                    if (window) {
                        window.shortcut = this.capturedShortcut;
                    }
                    this.renderWindows();
                } else {
                    alert('Failed to set shortcut. It may already be in use.');
                }
            } catch (error) {
                console.error('Error saving shortcut:', error);
                alert('Error saving shortcut: ' + error.message);
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
        this.isCapturingShortcut = false;
        this.elements.shortcutDisplay.style.color = '';
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

    toggleLanguage() {
        // Simple language toggle between FR and EN
        const currentLang = this.settings.language || 'FR';
        const newLang = currentLang === 'FR' ? 'EN' : 'FR';
        
        this.saveSettings({ language: newLang });
        // The main process will handle the language change
    }
}

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize the renderer
const configRenderer = new ConfigRenderer();