
class DockManager {
  constructor(context) {
    this.context = context;
  }

  toggleDock(enabled) {
    if (enabled) {
      this.context.windowFactory.showDockWindow();
    } else if (this.context.dockWindow) {
      this.context.dockWindow.close();
      this.context.dockWindow = null;
    }
  }
}

module.exports = DockManager;
