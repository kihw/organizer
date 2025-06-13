const { ipcRenderer } = require('electron');

console.log('Config.js: Loading...');

class ConfigRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.dofusClasses = {};
        
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
            dockEnabled: document.getElementById('dock-enabled'),
            dockPosition: document.getElementById('dock-position')
        };
        
        console.log('Config.js: Elements found:', Object.keys(this.elements).filter(k => this.elements[k]));
    }

    setupEventListeners() {
        // IPC listeners
        ipcRenderer.on('windows-updated', (event, windows) => {
            console.log('Config.js: Received windows-updated:', windows);
            this.windows = windows;
            this.renderWindows();
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
            
            windowsHTML += `
                <div class="window-item" data-window-id="${window.id}">
                    <div class="window-header">
                        <div class="window-avatar" onclick="configRenderer.cycleClass('${window.id}')">
                            <img src="${avatarSrc}" alt="Avatar" onerror="this.src='../../assets/avatars/1.jpg'" title="${className}">
                        </div>
                        <div class="window-info">
                            <div class="window-title">${this.escapeHtml(window.title)}</div>
                            <div class="window-character">${this.escapeHtml(displayName)} - ${className}</div>
                        </div>
                        <div class="window-controls">
                            <button class="btn btn-primary" onclick="configRenderer.activateWindow('${window.id}')">
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
                                       onchange="configRenderer.updateInitiative('${window.id}', this.value)">
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Class</div>
                            <div class="detail-value">
                                <div class="class-display" onclick="configRenderer.cycleClass('${window.id}')">
                                    ${className}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Shortcut</div>
                            <div class="detail-value">
                                <div class="shortcut-display" onclick="configRenderer.setShortcut('${window.id}')">
                                    ${this.escapeHtml(shortcutText)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Enabled</div>
                            <div class="detail-value">
                                <div class="toggle-switch ${window.enabled ? 'active' : ''}" 
                                     onclick="configRenderer.toggleWindow('${window.id}')"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.elements.windowsList.innerHTML = windowsHTML;
        console.log('Config.js: Windows rendered successfully');
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
            await ipcRenderer.invoke('refresh-windows');
        } catch (error) {
            console.error('Config.js: Error refreshing windows:', error);
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
            }
        } catch (error) {
            console.error('Config.js: Error toggling window:', error);
        }
    }

    async cycleClass(windowId) {
        try {
            console.log(`Config.js: Cycling class for ${windowId}`);
            const window = this.windows.find(w => w.id === windowId);
            if (window) {
                const classKeys = Object.keys(this.dofusClasses);
                const currentIndex = classKeys.indexOf(window.dofusClass);
                const nextIndex = (currentIndex + 1) % classKeys.length;
                const nextClass = classKeys[nextIndex];
                
                const settings = { [`classes.${windowId}`]: nextClass };
                await ipcRenderer.invoke('save-settings', settings);
                
                // Update local data
                window.dofusClass = nextClass;
                window.avatar = this.dofusClasses[nextClass].avatar;
                
                // Re-render to show changes
                this.renderWindows();
            }
        } catch (error) {
            console.error('Config.js: Error cycling class:', error);
        }
    }

    setShortcut(windowId) {
        console.log(`Config.js: Setting shortcut for ${windowId}`);
        this.showShortcutModal(windowId);
    }

    showShortcutModal(windowId) {
        const modal = document.getElementById('shortcut-modal');
        const display = document.getElementById('shortcut-display');
        const window = this.windows.find(w => w.id === windowId);
        
        if (modal && display) {
            display.textContent = window?.shortcut || 'No shortcut';
            modal.style.display = 'flex';
            
            // Store current window ID for modal actions
            modal.dataset.windowId = windowId;
            
            this.setupShortcutCapture();
        }
    }

    setupShortcutCapture() {
        const modal = document.getElementById('shortcut-modal');
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
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // Save button
        const saveBtn = document.getElementById('shortcut-save');
        const saveHandler = async () => {
            const windowId = modal.dataset.windowId;
            if (currentShortcut && windowId) {
                await this.saveShortcut(windowId, currentShortcut);
            }
            this.closeShortcutModal();
        };
        
        // Cancel button
        const cancelBtn = document.getElementById('shortcut-cancel');
        const cancelHandler = () => {
            this.closeShortcutModal();
        };
        
        // Remove button
        const removeBtn = document.getElementById('shortcut-remove');
        const removeHandler = async () => {
            const windowId = modal.dataset.windowId;
            if (windowId) {
                await this.removeShortcut(windowId);
            }
            this.closeShortcutModal();
        };
        
        // Store handlers for cleanup
        modal.keyHandler = keyHandler;
        modal.saveHandler = saveHandler;
        modal.cancelHandler = cancelHandler;
        modal.removeHandler = removeHandler;
        
        saveBtn.addEventListener('click', saveHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        removeBtn.addEventListener('click', removeHandler);
    }

    closeShortcutModal() {
        const modal = document.getElementById('shortcut-modal');
        if (modal) {
            modal.style.display = 'none';
            
            // Clean up event listeners
            if (modal.keyHandler) {
                document.removeEventListener('keydown', modal.keyHandler);
            }
            
            const saveBtn = document.getElementById('shortcut-save');
            const cancelBtn = document.getElementById('shortcut-cancel');
            const removeBtn = document.getElementById('shortcut-remove');
            
            if (saveBtn && modal.saveHandler) {
                saveBtn.removeEventListener('click', modal.saveHandler);
            }
            if (cancelBtn && modal.cancelHandler) {
                cancelBtn.removeEventListener('click', modal.cancelHandler);
            }
            if (removeBtn && modal.removeHandler) {
                removeBtn.removeEventListener('click', modal.removeHandler);
            }
        }
    }

    async saveShortcut(windowId, shortcut) {
        try {
            console.log(`Config.js: Saving shortcut for ${windowId}: ${shortcut}`);
            await ipcRenderer.invoke('set-shortcut', windowId, shortcut);
            
            // Update local data
            const window = this.windows.find(w => w.id === windowId);
            if (window) {
                window.shortcut = shortcut;
                this.renderWindows();
            }
        } catch (error) {
            console.error('Config.js: Error saving shortcut:', error);
        }
    }

    async removeShortcut(windowId) {
        try {
            console.log(`Config.js: Removing shortcut for ${windowId}`);
            await ipcRenderer.invoke('remove-shortcut', windowId);
            
            // Update local data
            const window = this.windows.find(w => w.id === windowId);
            if (window) {
                window.shortcut = null;
                this.renderWindows();
            }
        } catch (error) {
            console.error('Config.js: Error removing shortcut:', error);
        }
    }

    showGameTypeModal() {
        const modal = document.getElementById('game-type-modal');
        const select = document.getElementById('game-type-select');
        
        if (modal && select) {
            select.value = this.settings.globalGameType || 'dofus3';
            modal.style.display = 'flex';
            
            this.setupGameTypeModal();
        }
    }

    setupGameTypeModal() {
        const modal = document.getElementById('game-type-modal');
        const saveBtn = document.getElementById('game-type-save');
        const cancelBtn = document.getElementById('game-type-cancel');
        const select = document.getElementById('game-type-select');
        
        const saveHandler = async () => {
            if (select) {
                await ipcRenderer.invoke('set-game-type', select.value);
                modal.style.display = 'none';
            }
        };
        
        const cancelHandler = () => {
            modal.style.display = 'none';
        };
        
        saveBtn.addEventListener('click', saveHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        
        // Store handlers for cleanup
        modal.gameTypeSaveHandler = saveHandler;
        modal.gameTypeCancelHandler = cancelHandler;
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