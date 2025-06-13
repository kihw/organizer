const { ipcRenderer } = require('electron');

class DockRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadData();
    }

    initializeElements() {
        this.elements = {
            dockItems: document.getElementById('dock-items')
        };
    }

    setupEventListeners() {
        // IPC listeners
        ipcRenderer.on('windows-updated', (event, windows) => {
            this.windows = windows;
            this.renderDock();
        });

        ipcRenderer.on('language-changed', (event, language) => {
            this.language = language;
            this.renderDock();
        });
    }

    async loadData() {
        try {
            this.windows = await ipcRenderer.invoke('get-dofus-windows');
            this.language = await ipcRenderer.invoke('get-language');
            this.renderDock();
        } catch (error) {
            console.error('Error loading dock data:', error);
        }
    }

    renderDock() {
        const enabledWindows = this.windows.filter(w => w.enabled);
        
        let dockHTML = '';
        
        // Refresh button
        dockHTML += `
            <div class="dock-item dock-refresh" onclick="dockRenderer.refreshWindows()" 
                 title="${this.language.dock_REFRESH_tooltip || 'Refresh windows'}">
                <div class="window-icon">⟳</div>
                <div class="tooltip">${this.language.dock_REFRESH_tooltip || 'Refresh windows'}</div>
            </div>
        `;
        
        // Window items
        enabledWindows.forEach(window => {
            const shortcutText = window.shortcut || 'No shortcut';
            const tooltip = `${window.character}\n${this.language.dock_FENETRE_tooltip?.replace('{0}', shortcutText) || `Shortcut: ${shortcutText}`}`;
            
            dockHTML += `
                <div class="dock-item ${window.isActive ? 'active' : ''}" 
                     onclick="dockRenderer.activateWindow('${window.id}')"
                     title="${tooltip}">
                    <img src="../../assets/avatars/${window.avatar}.png" 
                         alt="${window.character}"
                         onerror="this.src='../../assets/avatars/default.png'">
                    <div class="tooltip">${window.character}<br>${shortcutText}</div>
                    ${window.shortcut ? `<div class="shortcut-label">${window.shortcut}</div>` : ''}
                </div>
            `;
        });
        
        // Config button
        dockHTML += `
            <div class="dock-item dock-config" onclick="dockRenderer.showConfig()" 
                 title="${this.language.dock_CONFIG_tooltip || 'Configuration'}">
                <div class="window-icon">⚙</div>
                <div class="tooltip">${this.language.dock_CONFIG_tooltip || 'Configuration'}</div>
            </div>
        `;
        
        this.elements.dockItems.innerHTML = dockHTML;
    }

    async activateWindow(windowId) {
        try {
            await ipcRenderer.invoke('activate-window', windowId);
        } catch (error) {
            console.error('Error activating window:', error);
        }
    }

    async refreshWindows() {
        try {
            await ipcRenderer.invoke('refresh-windows');
        } catch (error) {
            console.error('Error refreshing windows:', error);
        }
    }

    showConfig() {
        // Send message to main process to show config window
        ipcRenderer.send('show-config');
    }
}

// Initialize the dock renderer
const dockRenderer = new DockRenderer();