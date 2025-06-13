# Dofus Organizer - Linux Edition

A modern Linux-compatible version of the Dofus Window Organizer, converted from the original AutoIt application. This application helps Dofus players manage multiple game windows efficiently with keyboard shortcuts, window organization, and a convenient navigation dock.

## Features

### 🎮 Window Management
- **Automatic Detection**: Automatically detects and lists all Dofus game windows
- **Character Recognition**: Extracts character names from window titles
- **Initiative-based Sorting**: Organizes windows based on character initiative values
- **Window Activation**: Quick window switching with keyboard shortcuts or dock clicks

### ⌨️ Keyboard Shortcuts
- **Custom Shortcuts**: Assign personalized keyboard shortcuts to each window
- **Global Hotkeys**: System-wide shortcuts work even when the game isn't focused
- **Shortcut Management**: Easy shortcut assignment and removal through the GUI

### 🎯 Navigation Dock
- **Floating Dock**: Customizable floating dock with window thumbnails
- **Multiple Positions**: Position dock at any screen corner or edge
- **Visual Indicators**: Shows active windows and character avatars
- **Quick Access**: One-click window switching and refresh functionality

### 🌍 Multi-language Support
- **French (Français)**: Complete French localization
- **English**: Full English translation
- **Easy Switching**: Change language on-the-fly through the interface

### ⚙️ Configuration
- **Persistent Settings**: All settings saved automatically
- **Avatar Customization**: Choose from multiple character avatars
- **Window Enable/Disable**: Control which windows participate in cycling
- **Initiative Management**: Set and adjust character initiative values

## Installation

### Prerequisites
- Linux operating system (Ubuntu, Debian, Fedora, etc.)
- Node.js 16+ and npm
- X11 window system (for window management)

### From Source
```bash
# Clone the repository
git clone <repository-url>
cd dofus-organizer-linux

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build-linux
```

### Binary Installation
Download the latest AppImage or .deb package from the releases page:

```bash
# For AppImage
chmod +x DofusOrganizer-*.AppImage
./DofusOrganizer-*.AppImage

# For Debian/Ubuntu
sudo dpkg -i dofus-organizer-*.deb
```

## Usage

### First Launch
1. Start the application - it will appear in your system tray
2. Right-click the tray icon to access the menu
3. Click "Configure" to open the main configuration window
4. Click "Refresh" to scan for Dofus windows

### Setting Up Shortcuts
1. In the configuration window, click on the shortcut field for any window
2. Press the desired key combination (e.g., Ctrl+1, Alt+F1, etc.)
3. Click "Save" to confirm the shortcut
4. Close the configuration window to activate shortcuts

### Using the Navigation Dock
1. Enable the dock in the configuration window footer
2. Choose your preferred position (corners or edges)
3. The dock will appear with icons for each active window
4. Click any icon to switch to that window
5. Use the refresh button to update the window list

### Window Management
- **Initiative Values**: Set initiative numbers to control window sorting order
- **Enable/Disable**: Toggle windows on/off to control which participate in shortcuts
- **Avatars**: Click character avatars to cycle through available icons
- **Activation**: Click the play button to bring any window to the front

## Configuration Files

The application stores its configuration in:
- **Linux**: `~/.config/dofus-organizer-linux/`

Settings include:
- Window shortcuts and assignments
- Character initiative values
- Avatar selections
- Language preferences
- Dock position and visibility

## Troubleshooting

### Common Issues

**Windows not detected:**
- Ensure Dofus is running with visible windows
- Try clicking the Refresh button
- Check that window titles contain "Dofus" or "Ankama"

**Shortcuts not working:**
- Close the configuration window to activate shortcuts
- Ensure no conflicting system shortcuts exist
- Try different key combinations

**Dock not appearing:**
- Enable dock in configuration footer
- Check that at least one window is enabled
- Verify dock position settings

**Permission issues:**
- Ensure the application has permission to access window information
- On some systems, you may need to run with additional permissions

### System Requirements
- **Memory**: 100MB RAM minimum
- **Disk Space**: 200MB for installation
- **Display**: X11 window system required
- **Permissions**: Access to window management APIs

## Development

### Project Structure
```
src/
├── main.js              # Main Electron process
├── services/            # Core services
│   ├── WindowManager.js # Window detection and management
│   ├── ShortcutManager.js # Global shortcut handling
│   └── LanguageManager.js # Internationalization
└── renderer/            # UI components
    ├── config.html      # Configuration interface
    ├── config.js        # Configuration logic
    ├── dock.html        # Navigation dock
    └── dock.js          # Dock functionality
```

### Building
```bash
# Development
npm run dev

# Production build
npm run build

# Linux-specific build
npm run build-linux
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Linux
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Original AutoIt version: Dofus Organizer team
- Linux conversion: Modern web technologies (Electron, Node.js)
- Window management: node-window-manager library
- Global shortcuts: Electron globalShortcut API

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include system information and error logs

---

**Note**: This application is not affiliated with Ankama Games or Dofus. It's a community tool designed to enhance the gaming experience for multi-account players.