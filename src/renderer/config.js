const { ipcRenderer } = require('electron');

console.log('Config.js: Loading...');

class ConfigRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        
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
            closeBtn: document.getElementById('close-btn')
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
            
            this.renderWindows();
            this.updateLanguage();
            
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
            const avatarSrc = `../../assets/avatars/${window.avatar || '1'}.jpg`;
            
            windowsHTML += `
                <div class="window-item" data-window-id="${window.id}">
                    <div class="window-header">
                        <div class="window-avatar" onclick="configRenderer.cycleAvatar('${window.id}')">
                            <img src="${avatarSrc}" alt="Avatar" onerror="this.src='../../assets/avatars/1.jpg'">
                        </div>
                        <div class="window-info">
                            <div class="window-title">${this.escapeHtml(window.title)}</div>
                            <div class="window-character">${this.escapeHtml(displayName)}</div>
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

    setShortcut(windowId) {
        console.log(`Config.js: Setting shortcut for ${windowId}`);
        // TODO: Implement shortcut modal
        alert('Shortcut setting not implemented yet');
    }

    cycleAvatar(windowId) {
        console.log(`Config.js: Cycling avatar for ${windowId}`);
        // TODO: Implement avatar cycling
        alert('Avatar cycling not implemented yet');
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