const { ipcRenderer } = require('electron');

class DockRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.refreshing = false;
        
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

        // Prevent context menu on dock
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle window focus/blur
        window.addEventListener('blur', () => {
            // Keep dock always on top
            setTimeout(() => {
                if (window.electronAPI) {
                    window.electronAPI.setAlwaysOnTop(true);
                }
            }, 100);
        });
    }

    async loadData() {
        try {
            this.windows = await ipcRenderer.invoke('get-dofus-windows');
            this.language = await ipcRenderer.invoke('get-language');
            this.settings = await ipcRenderer.invoke('get-settings');
            this.renderDock();
        } catch (error) {
            console.error('Error loading dock data:', error);
        }
    }

    renderDock() {
        const enabledWindows = this.windows.filter(w => w.enabled);
        
        let dockHTML = '';
        
        // Refresh button
        const refreshClass = this.refreshing ? 'refreshing' : '';
        const refreshTooltip = this.language.dock_REFRESH_tooltip || 'Refresh windows';
        
        dockHTML += `
            <div class="dock-item dock-refresh ${refreshClass}" 
                 onclick="dockRenderer.refreshWindows()" 
                 title="${refreshTooltip}">
                <div class="window-icon">⟳</div>
                <div class="tooltip">${refreshTooltip}</div>
            </div>
        `;
        
        // Window items
        enabledWindows.forEach((window, index) => {
            const shortcutText = window.shortcut || (this.language.shortcut_none || 'No shortcut');
            const tooltip = `${window.character}\n${this.language.dock_FENETRE_tooltip?.replace('{0}', shortcutText) || `Shortcut: ${shortcutText}`}`;
            const activeClass = window.isActive ? 'active' : '';
            
            dockHTML += `
                <div class="dock-item window-item ${activeClass}" 
                     onclick="dockRenderer.activateWindow('${window.id}')"
                     onmouseenter="dockRenderer.showTooltip(this, '${this.escapeHtml(tooltip)}')"
                     onmouseleave="dockRenderer.hideTooltip(this)"
                     data-window-id="${window.id}">
                    <img src="../../assets/avatars/${window.avatar}.png" 
                         alt="${this.escapeHtml(window.character)}"
                         onerror="this.src='../../assets/avatars/default.png'">
                    <div class="tooltip">${this.escapeHtml(window.character)}<br>${this.escapeHtml(shortcutText)}</div>
                    ${window.shortcut ? `<div class="shortcut-label">${this.escapeHtml(window.shortcut)}</div>` : ''}
                    <div class="initiative-badge">${window.initiative}</div>
                </div>
            `;
        });
        
        // Config button
        const configTooltip = this.language.dock_CONFIG_tooltip || 'Configuration';
        dockHTML += `
            <div class="dock-item dock-config" 
                 onclick="dockRenderer.showConfig()" 
                 title="${configTooltip}">
                <div class="window-icon">⚙</div>
                <div class="tooltip">${configTooltip}</div>
            </div>
        `;
        
        this.elements.dockItems.innerHTML = dockHTML;
        
        // Update dock size based on content
        this.updateDockSize();
    }

    updateDockSize() {
        const itemCount = this.elements.dockItems.children.length;
        const itemWidth = 60; // Including gaps
        const padding = 16;
        const newWidth = Math.min(600, itemCount * itemWidth + padding);
        
        // Send resize request to main process
        if (window.electronAPI && window.electronAPI.resizeDock) {
            window.electronAPI.resizeDock(newWidth, 70);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async activateWindow(windowId) {
        try {
            const success = await ipcRenderer.invoke('activate-window', windowId);
            
            if (success) {
                // Visual feedback
                const windowElement = document.querySelector(`[data-window-id="${windowId}"]`);
                if (windowElement) {
                    windowElement.classList.add('activating');
                    setTimeout(() => {
                        windowElement.classList.remove('activating');
                    }, 300);
                }
                
                // Update active state immediately for better UX
                this.windows.forEach(w => {
                    w.isActive = w.id === windowId;
                });
                this.renderDock();
            }
        } catch (error) {
            console.error('Error activating window:', error);
        }
    }

    async refreshWindows() {
        if (this.refreshing) return;
        
        try {
            this.refreshing = true;
            this.renderDock(); // Update UI to show refreshing state
            
            await ipcRenderer.invoke('refresh-windows');
            
            // Visual feedback
            setTimeout(() => {
                this.refreshing = false;
                this.renderDock();
            }, 1000);
        } catch (error) {
            console.error('Error refreshing windows:', error);
            this.refreshing = false;
            this.renderDock();
        }
    }

    showConfig() {
        // Send message to main process to show config window
        ipcRenderer.send('show-config');
    }

    showTooltip(element, text) {
        // Enhanced tooltip functionality
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            tooltip.innerHTML = text.replace(/\n/g, '<br>');
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
        }
    }

    hideTooltip(element) {
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
        }
    }
}

// Initialize the dock renderer
const dockRenderer = new DockRenderer();

// Handle dock-specific keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close dock (if implemented)
    if (e.key === 'Escape') {
        // Could implement dock hiding functionality
    }
    
    // Number keys 1-9 to activate windows by position
    if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const enabledWindows = dockRenderer.windows.filter(w => w.enabled);
        if (enabledWindows[index]) {
            dockRenderer.activateWindow(enabledWindows[index].id);
        }
    }
});