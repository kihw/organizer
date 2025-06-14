const { ipcRenderer } = require('electron');

console.log('Config.js: Loading...');

class ConfigRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.dofusClasses = {};
        this.currentShortcutWindowId = null;
        this.currentClassWindowId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadData();
        
        console.log('Config.js: Initialized');
    }

    initializeElements() {
        this.elements = {
            windowsList: document.getElementById('windows-list'),
            noWindows: document.getElementById('no-windows'),
            refreshBtn: document.getElementById('refresh-btn'),
            closeBtn: document.getElementById('close-btn'),
            gameTypeBtn: document.getElementById('game-type-btn'),
            languageBtn: document.getElementById('language-btn'),
            organizeBtn: document.getElementById('organize-btn'),
            dockEnabled: document.getElementById('dock-enabled'),
            dockPosition: document.getElementById('dock-position'),
            windowCount: document.getElementById('window-count')
        };
        
        console.log('Config.js: Elements found:', Object.keys(this.elements).filter(k => this.elements[k]));
    }

    setupEventListeners() {
        // IPC listeners
        ipcRenderer.on('windows-updated', (event, windows) => {
            console.log('Config.js: Received windows-updated:', windows);
            this.windows = windows;
            this.renderWindows();
            this.updateWindowCount();
        });

        ipcRenderer.on('language-changed', (event, language) => {
            console.log('Config.js: Received language-changed');
            this.language = language;
            this.updateLanguage();
        });

        // Button listeners
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                console.log('Config.js: Refresh button clicked');
                this.refreshWindows();
            });
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                console.log('Config.js: Close button clicked');
                window.close();
            });
        }

        if (this.elements.gameTypeBtn) {
            this.elements.gameTypeBtn.addEventListener('click', () => {
                this.showGameTypeModal();
            });
        }

        if (this.elements.languageBtn) {
            this.elements.languageBtn.addEventListener('click', () => {
                this.showLanguageModal();
            });
        }

        if (this.elements.organizeBtn) {
            this.elements.organizeBtn.addEventListener('click', () => {
                this.showOrganizeModal();
            });
        }

        // Dock settings
        if (this.elements.dockEnabled) {
            this.elements.dockEnabled.addEventListener('change', () => {
                this.updateDockSettings();
            });
        }

        if (this.elements.dockPosition) {
            this.elements.dockPosition.addEventListener('change', () => {
                this.updateDockSettings();
            });
        }

        // Modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Game type modal
        const gameTypeSave = document.getElementById('game-type-save');
        const gameTypeCancel = document.getElementById('game-type-cancel');
        
        if (gameTypeSave) {
            gameTypeSave.addEventListener('click', () => {
                this.saveGameType();
            });
        }
        
        if (gameTypeCancel) {
            gameTypeCancel.addEventListener('click', () => {
                this.hideGameTypeModal();
            });
        }

        // Language modal
        const languageSave = document.getElementById('language-save');
        const languageCancel = document.getElementById('language-cancel');
        
        if (languageSave) {
            languageSave.addEventListener('click', () => {
                this.saveLanguage();
            });
        }
        
        if (languageCancel) {
            languageCancel.addEventListener('click', () => {
                this.hideLanguageModal();
            });
        }

        // Shortcut modal
        const shortcutSave = document.getElementById('shortcut-save');
        const shortcutCancel = document.getElementById('shortcut-cancel');
        const shortcutRemove = document.getElementById('shortcut-remove');
        
        if (shortcutSave) {
            shortcutSave.addEventListener('click', () => {
                this.saveShortcut();
            });
        }
        
        if (shortcutCancel) {
            shortcutCancel.addEventListener('click', () => {
                this.closeShortcutModal();
            });
        }
        
        if (shortcutRemove) {
            shortcutRemove.addEventListener('click', () => {
                this.removeShortcut();
            });
        }

        // Class modal
        const classCancel = document.getElementById('class-cancel');
        if (classCancel) {
            classCancel.addEventListener('click', () => {
                this.closeClassModal();
            });
        }
    }

    async loadData() {
        try {
            console.log('Config.js: Loading initial data...');
            
            this.windows = await ipcRenderer.invoke('get-dofus-windows');
            console.log('Config.js: Loaded windows:', this.windows);
            
            this.language = await ipcRenderer.invoke('get-language');
            console.log('Config.js: Loaded language with keys:', Object.keys(this.language));
            
            this.settings = await ipcRenderer.invoke('get-settings');
            console.log('Config.js: Loaded settings with keys:', Object.keys(this.settings));

            // Get Dofus classes
            this.dofusClasses = await ipcRenderer.invoke('get-dofus-classes');
            console.log('Config.js: Loaded Dofus classes:', Object.keys(this.dofusClasses));
            
            this.renderWindows();
            this.updateLanguage();
            this.loadDockSettings();
            this.updateWindowCount();
            
        } catch (error) {
            console.error('Config.js: Error loading data:', error);
        }
    }

    renderWindows() {
        console.log(`Config.js: Rendering ${this.windows.length} windows`);
        
        if (!this.elements.windowsList || !this.elements.noWindows) {
            console.error('Config.js: Missing DOM elements for rendering');
            return;
        }

        if (this.windows.length === 0) {
            this.elements.noWindows.style.display = 'block';
            this.elements.windowsList.style.display = 'none';
            this.elements.windowsList.innerHTML = '';
            return;
        }

        this.elements.noWindows.style.display = 'none';
        this.elements.windowsList.style.display = 'grid';

        let windowsHTML = '';
        
        this.windows.forEach((window, index) => {
            const displayName = window.customName || window.character || 'Unknown';
            const shortcutText = window.shortcut || 'No shortcut';
            const avatarSrc = `../../assets/avatars/${window.avatar}.jpg`;
            const className = this.dofusClasses[window.dofusClass]?.name || 'Feca';
            const enabledClass = window.enabled ? 'enabled' : 'disabled';
            
            windowsHTML += `
                <div class="window-item ${enabledClass}" data-window-id="${window.id}" data-class="${window.dofusClass}">
                    <div class="window-header">
                        <div class="window-avatar" onclick="configRenderer.showClassModal('${window.id}')" title="Click to change class">
                            <img src="${avatarSrc}" alt="Avatar" onerror="this.src='../../assets/avatars/1.jpg'" title="${className}">
                        </div>
                        <div class="window-info">
                            <div class="window-title">${this.escapeHtml(window.title)}</div>
                            <div class="window-character">${this.escapeHtml(displayName)} - ${className}</div>
                        </div>
                        <div class="window-controls">
                            <button class="btn btn-primary" onclick="configRenderer.activateWindow('${window.id}')" title="Activate window">
                                Activate
                            </button>
                        </div>
                    </div>
                    
                    <div class="window-details">
                        <div class="detail-item">
                            <div class="detail-label">Initiative</div>
                            <div class="detail-value">
                                <input type="number" 
                                       class="initiative-input" 
                                       value="${window.initiative || 0}"
                                       min="0"
                                       max="9999"
                                       onchange="configRenderer.updateInitiative('${window.id}', this.value)"
                                       title="Set character initiative for sorting">
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Class</div>
                            <div class="detail-value">
                                <div class="class-display" onclick="configRenderer.showClassModal('${window.id}')" title="Click to change class">
                                    ${className}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Shortcut</div>
                            <div class="detail-value">
                                <div class="shortcut-display" onclick="configRenderer.setShortcut('${window.id}')" title="Click to set keyboard shortcut">
                                    ${this.escapeHtml(shortcutText)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Enabled</div>
                            <div class="detail-value">
                                <div class="toggle-switch ${window.enabled ? 'active' : ''}" 
                                     onclick="configRenderer.toggleWindow('${window.id}')"
                                     title="Enable/disable this window"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.elements.windowsList.innerHTML = windowsHTML;
        console.log('Config.js: Windows rendered successfully');
    }

    updateWindowCount() {
        if (this.elements.windowCount) {
            const enabledCount = this.windows.filter(w => w.enabled).length;
            const totalCount = this.windows.length;
            
            if (totalCount === 0) {
                this.elements.windowCount.textContent = 'No windows detected';
            } else if (enabledCount === totalCount) {
                this.elements.windowCount.textContent = `${totalCount} window${totalCount > 1 ? 's' : ''} detected`;
            } else {
                this.elements.windowCount.textContent = `${enabledCount}/${totalCount} windows enabled`;
            }
        }
    }

    updateLanguage() {
        // Basic language update - extend as needed
        if (this.language.displayGUI_nowindow) {
            const noWindowsText = document.getElementById('no-windows-text');
            if (noWindowsText) {
                noWindowsText.textContent = this.language.displayGUI_nowindow;
            }
        }

        // Update labels
        const labels = {
            'dock-label': this.language.displayGUI_dock || 'Enable navigation dock',
            'title': 'Dofus Organizer - Configuration'
        };

        Object.keys(labels).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = labels[id];
            }
        });
    }

    loadDockSettings() {
        if (this.elements.dockEnabled && this.settings.dock) {
            this.elements.dockEnabled.checked = this.settings.dock.enabled || false;
        }
        
        if (this.elements.dockPosition && this.settings.dock) {
            this.elements.dockPosition.value = this.settings.dock.position || 'SE';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async refreshWindows() {
        try {
            console.log('Config.js: Refreshing windows...');
            this.elements.refreshBtn.disabled = true;
            this.elements.refreshBtn.textContent = 'Refreshing...';
            
            await ipcRenderer.invoke('refresh-windows');
            
            setTimeout(() => {
                this.elements.refreshBtn.disabled = false;
                this.elements.refreshBtn.textContent = 'Refresh';
            }, 1000);
        } catch (error) {
            console.error('Config.js: Error refreshing windows:', error);
            this.elements.refreshBtn.disabled = false;
            this.elements.refreshBtn.textContent = 'Refresh';
        }
    }

    async activateWindow(windowId) {
        try {
            console.log(`Config.js: Activating window ${windowId}`);
            await ipcRenderer.invoke('activate-window', windowId);
        } catch (error) {
            console.error('Config.js: Error activating window:', error);
        }
    }

    async updateInitiative(windowId, initiative) {
        try {
            console.log(`Config.js: Updating initiative for ${windowId}: ${initiative}`);
            const settings = { [`initiatives.${windowId}`]: parseInt(initiative) || 0 };
            await ipcRenderer.invoke('save-settings', settings);
        } catch (error) {
            console.error('Config.js: Error updating initiative:', error);
        }
    }

    async toggleWindow(windowId) {
        try {
            console.log(`Config.js: Toggling window ${windowId}`);
            const window = this.windows.find(w => w.id === windowId);
            if (window) {
                const settings = { [`enabled.${windowId}`]: !window.enabled };
                await ipcRenderer.invoke('save-settings', settings);
                window.enabled = !window.enabled;
                this.renderWindows();
                this.updateWindowCount();
            }
        } catch (error) {
            console.error('Config.js: Error toggling window:', error);
        }
    }

    // Game Type Modal
    showGameTypeModal() {
        const modal = document.getElementById('game-type-modal');
        if (modal) {
            // Set current game type
            const currentGameType = this.settings.globalGameType || 'dofus3';
            const radioButton = modal.querySelector(`input[name="gameType"][value="${currentGameType}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
            
            modal.style.display = 'flex';
        }
    }

    hideGameTypeModal() {
        const modal = document.getElementById('game-type-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async saveGameType() {
        const modal = document.getElementById('game-type-modal');
        const selectedRadio = modal.querySelector('input[name="gameType"]:checked');
        
        if (selectedRadio) {
            try {
                await ipcRenderer.invoke('set-game-type', selectedRadio.value);
                this.hideGameTypeModal();
                
                // Refresh windows after changing game type
                setTimeout(() => {
                    this.refreshWindows();
                }, 500);
            } catch (error) {
                console.error('Config.js: Error saving game type:', error);
            }
        }
    }

    // Language Modal
    showLanguageModal() {
        const modal = document.getElementById('language-modal');
        if (modal) {
            // Set current language
            const currentLanguage = this.settings.language || 'FR';
            const radioButton = modal.querySelector(`input[name="language"][value="${currentLanguage}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
            
            modal.style.display = 'flex';
        }
    }

    hideLanguageModal() {
        const modal = document.getElementById('language-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async saveLanguage() {
        const modal = document.getElementById('language-modal');
        const selectedRadio = modal.querySelector('input[name="language"]:checked');
        
        if (selectedRadio) {
            try {
                const settings = { language: selectedRadio.value };
                await ipcRenderer.invoke('save-settings', settings);
                this.hideLanguageModal();
            } catch (error) {
                console.error('Config.js: Error saving language:', error);
            }
        }
    }

    // Organize Modal
    showOrganizeModal() {
        const modal = document.getElementById('organize-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    async organizeWindows(layout) {
        try {
            console.log(`Config.js: Organizing windows with layout: ${layout}`);
            await ipcRenderer.invoke('organize-windows', layout);
            
            // Close the modal
            const modal = document.getElementById('organize-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('Config.js: Error organizing windows:', error);
        }
    }

    // Shortcut Modal
    setShortcut(windowId) {
        console.log(`Config.js: Setting shortcut for ${windowId}`);
        this.showShortcutModal(windowId);
    }

    showShortcutModal(windowId) {
        const modal = document.getElementById('shortcut-modal');
        const display = document.getElementById('shortcut-display');
        const window = this.windows.find(w => w.id === windowId);
        
        if (modal && display) {
            this.currentShortcutWindowId = windowId;
            display.textContent = window?.shortcut || 'No shortcut';
            modal.style.display = 'flex';
            
            this.setupShortcutCapture();
        }
    }

    setupShortcutCapture() {
        const display = document.getElementById('shortcut-display');
        let currentShortcut = '';
        
        const keyHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const keys = [];
            if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            
            if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                keys.push(e.key.toUpperCase());
            }
            
            if (keys.length > 1) {
                currentShortcut = keys.join('+');
                display.textContent = currentShortcut;
                display.classList.add('recording');
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        this.currentKeyHandler = keyHandler;
        this.currentShortcut = currentShortcut;
    }

    async saveShortcut() {
        if (this.currentShortcutWindowId && this.currentShortcut) {
            try {
                await ipcRenderer.invoke('set-shortcut', this.currentShortcutWindowId, this.currentShortcut);
                
                // Update local data
                const window = this.windows.find(w => w.id === this.currentShortcutWindowId);
                if (window) {
                    window.shortcut = this.currentShortcut;
                    this.renderWindows();
                }
            } catch (error) {
                console.error('Config.js: Error saving shortcut:', error);
            }
        }
        
        this.closeShortcutModal();
    }

    async removeShortcut() {
        if (this.currentShortcutWindowId) {
            try {
                await ipcRenderer.invoke('remove-shortcut', this.currentShortcutWindowId);
                
                // Update local data
                const window = this.windows.find(w => w.id === this.currentShortcutWindowId);
                if (window) {
                    window.shortcut = null;
                    this.renderWindows();
                }
            } catch (error) {
                console.error('Config.js: Error removing shortcut:', error);
            }
        }
        
        this.closeShortcutModal();
    }

    closeShortcutModal() {
        const modal = document.getElementById('shortcut-modal');
        const display = document.getElementById('shortcut-display');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (display) {
            display.classList.remove('recording');
        }
        
        // Clean up event listener
        if (this.currentKeyHandler) {
            document.removeEventListener('keydown', this.currentKeyHandler);
            this.currentKeyHandler = null;
        }
        
        this.currentShortcutWindowId = null;
        this.currentShortcut = '';
    }

    // Class Modal
    showClassModal(windowId) {
        const modal = document.getElementById('class-modal');
        const classGrid = document.getElementById('class-grid');
        
        if (modal && classGrid) {
            this.currentClassWindowId = windowId;
            
            // Populate class grid
            let classHTML = '';
            Object.keys(this.dofusClasses).forEach(classKey => {
                const classInfo = this.dofusClasses[classKey];
                const avatarSrc = `../../assets/avatars/${classInfo.avatar}.jpg`;
                const window = this.windows.find(w => w.id === windowId);
                const isSelected = window && window.dofusClass === classKey;
                
                classHTML += `
                    <div class="class-option ${isSelected ? 'selected' : ''}" 
                         onclick="configRenderer.selectClass('${classKey}')"
                         data-class="${classKey}">
                        <img src="${avatarSrc}" alt="${classInfo.name}" class="class-avatar" 
                             onerror="this.src='../../assets/avatars/1.jpg'">
                        <div class="class-name">${classInfo.name}</div>
                    </div>
                `;
            });
            
            classGrid.innerHTML = classHTML;
            modal.style.display = 'flex';
        }
    }

    selectClass(classKey) {
        // Update visual selection
        const classOptions = document.querySelectorAll('.class-option');
        classOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-class="${classKey}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Save the class change
        this.saveClassChange(classKey);
    }

    async saveClassChange(classKey) {
        if (this.currentClassWindowId) {
            try {
                const settings = { [`classes.${this.currentClassWindowId}`]: classKey };
                await ipcRenderer.invoke('save-settings', settings);
                
                // Update local data
                const window = this.windows.find(w => w.id === this.currentClassWindowId);
                if (window) {
                    window.dofusClass = classKey;
                    window.avatar = this.dofusClasses[classKey].avatar;
                    this.renderWindows();
                }
                
                // Close modal after a short delay
                setTimeout(() => {
                    this.closeClassModal();
                }, 300);
            } catch (error) {
                console.error('Config.js: Error saving class change:', error);
            }
        }
    }

    closeClassModal() {
        const modal = document.getElementById('class-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.currentClassWindowId = null;
    }

    async updateDockSettings() {
        try {
            const dockSettings = {
                'dock.enabled': this.elements.dockEnabled?.checked || false,
                'dock.position': this.elements.dockPosition?.value || 'SE'
            };
            
            await ipcRenderer.invoke('save-settings', dockSettings);
            console.log('Config.js: Updated dock settings:', dockSettings);
        } catch (error) {
            console.error('Config.js: Error updating dock settings:', error);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Config.js: DOM ready, initializing...');
        window.configRenderer = new ConfigRenderer();
    });
} else {
    console.log('Config.js: DOM already ready, initializing...');
    window.configRenderer = new ConfigRenderer();
}

// Debug: Make IPC available globally
window.ipc = ipcRenderer;
console.log('Config.js: File loaded completely');