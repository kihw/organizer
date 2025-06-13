const { ipcRenderer } = require('electron');

class DockRenderer {
    constructor() {
        this.windows = [];
        this.language = {};
        this.settings = {};
        this.refreshing = false;
        this.availableAvatars = Array.from({length: 20}, (_, i) => (i + 1).toString());
        
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

        // Handle keyboard shortcuts for quick window access
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
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
        
        // Window items - sorted by initiative (desc) then by character name
        const sortedWindows = enabledWindows.sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.character.localeCompare(b.character);
        });

        sortedWindows.forEach((window, index) => {
            const displayName = window.customName || window.character;
            const shortcutText = window.shortcut || (this.language.shortcut_none || 'No shortcut');
            const tooltip = `${displayName}\n${this.language.dock_FENETRE_tooltip?.replace('{0}', shortcutText) || `Shortcut: ${shortcutText}`}`;
            const activeClass = window.isActive ? 'active' : '';
            
            // Use .jpg extension for avatars
            const avatarSrc = `../../assets/avatars/${window.avatar}.jpg`;
            const fallbackSrc = `../../assets/avatars/1.jpg`;
            
            dockHTML += `
                <div class="dock-item window-item ${activeClass}" 
                     onclick="dockRenderer.activateWindow('${window.id}')"
                     onmouseenter="dockRenderer.showTooltip(this, '${this.escapeHtml(tooltip)}')"
                     onmouseleave="dockRenderer.hideTooltip(this)"
                     data-window-id="${window.id}"
                     data-index="${index + 1}">
                    <img src="${avatarSrc}" 
                         alt="${this.escapeHtml(displayName)}"
                         onerror="this.src='${fallbackSrc}'">
                    <div class="tooltip">${this.escapeHtml(displayName)}<br>${this.escapeHtml(shortcutText)}</div>
                    ${window.shortcut ? `<div class="shortcut-label">${this.escapeHtml(window.shortcut)}</div>` : ''}
                    ${window.initiative > 0 ? `<div class="initiative-badge">${window.initiative}</div>` : ''}
                    <div class="index-badge">${index + 1}</div>
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
        
        // Send resize request to main process if available
        if (window.electronAPI && window.electronAPI.resizeDock) {
            window.electronAPI.resizeDock(newWidth, 70);
        }
    }

    getGameTypeLabel(gameType) {
        const labels = {
            'dofus2': 'Dofus 2',
            'dofus3': 'Dofus 3',
            'retro': 'Dofus Retro'
        };
        return labels[gameType] || 'Dofus';
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

    handleKeyboardShortcuts(e) {
        // Handle dock-specific keyboard shortcuts
        
        // ESC to close dock (if implemented)
        if (e.key === 'Escape') {
            // Could implement dock hiding functionality
            return;
        }
        
        // Number keys 1-9 to activate windows by position
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            const enabledWindows = this.windows.filter(w => w.enabled);
            if (enabledWindows[index]) {
                this.activateWindow(enabledWindows[index].id);
            }
            return;
        }

        // R key to refresh
        if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            this.refreshWindows();
            return;
        }

        // C key to show config
        if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            this.showConfig();
            return;
        }

        // Arrow keys for navigation
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            this.navigateWindows(e.key);
            return;
        }
    }

    navigateWindows(direction) {
        const enabledWindows = this.windows.filter(w => w.enabled);
        if (enabledWindows.length === 0) return;

        const currentActiveIndex = enabledWindows.findIndex(w => w.isActive);
        let nextIndex;

        switch (direction) {
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = currentActiveIndex > 0 ? currentActiveIndex - 1 : enabledWindows.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = currentActiveIndex < enabledWindows.length - 1 ? currentActiveIndex + 1 : 0;
                break;
            default:
                return;
        }

        if (enabledWindows[nextIndex]) {
            this.activateWindow(enabledWindows[nextIndex].id);
        }
    }

    // Add method to handle window organization
    async organizeWindows(layout = 'grid') {
        try {
            const success = await ipcRenderer.invoke('organize-windows', layout);
            if (success) {
                // Visual feedback
                const refreshElement = document.querySelector('.dock-refresh');
                if (refreshElement) {
                    refreshElement.classList.add('activating');
                    setTimeout(() => {
                        refreshElement.classList.remove('activating');
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error organizing windows:', error);
        }
    }
}

// Initialize the dock renderer
const dockRenderer = new DockRenderer();

// Export for global access if needed
window.dockRenderer = dockRenderer;

// Add additional CSS for new features
const additionalStyle = document.createElement('style');
additionalStyle.textContent = `
    .index-badge {
        position: absolute;
        top: -6px;
        left: -6px;
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }

    .dock-item:hover .index-badge {
        opacity: 1;
    }

    .dock-item.window-item {
        position: relative;
    }

    .dock-item.window-item::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: #3498db;
        transition: width 0.3s ease;
    }

    .dock-item.window-item.active::after {
        width: 80%;
    }

    .dock-item.window-item:nth-child(1) .index-badge { background: linear-gradient(135deg, #e74c3c, #c0392b); }
    .dock-item.window-item:nth-child(2) .index-badge { background: linear-gradient(135deg, #f39c12, #e67e22); }
    .dock-item.window-item:nth-child(3) .index-badge { background: linear-gradient(135deg, #2ecc71, #27ae60); }
    .dock-item.window-item:nth-child(4) .index-badge { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
    .dock-item.window-item:nth-child(5) .index-badge { background: linear-gradient(135deg, #34495e, #2c3e50); }
    
    /* Avatar image styling - fill container properly */
    .dock-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        border-radius: 8px;
    }

    @media (max-width: 600px) {
        .index-badge {
            font-size: 8px;
            padding: 1px 4px;
            min-width: 12px;
        }
        
        .initiative-badge {
            font-size: 8px;
            padding: 1px 4px;
            min-width: 12px;
        }
    }
`;
document.head.appendChild(additionalStyle);