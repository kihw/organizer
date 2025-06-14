# Dofus Organizer - Windows Edition

A modern Windows-compatible version of the Dofus Window Organizer, converted from the original AutoIt application. This application helps Dofus players manage multiple game windows efficiently with keyboard shortcuts, window organization, and a convenient navigation dock.

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
- **German (Deutsch)**: German language support
- **Spanish (Español)**: Spanish language support
- **Italian (Italiano)**: Italian language support
- **Easy Switching**: Change language on-the-fly through the interface

### ⚙️ Configuration
- **Persistent Settings**: All settings saved automatically
- **Avatar Customization**: Choose from multiple character avatars
- **Window Enable/Disable**: Control which windows participate in cycling
- **Initiative Management**: Set and adjust character initiative values

## Installation

### Prerequisites
- Windows 10 or later (Windows 11 recommended)
- Node.js 16+ and npm
- Visual C++ Redistributable (usually included with Windows)

### Method 1: Binary Installation (Recommended)
Download the latest installer from the releases page:

1. Download `DofusOrganizer-Setup.exe`
2. Run the installer as Administrator
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Method 2: From Source
```batch
# Clone the repository
git clone https://github.com/kihw/organizer.git
cd organizer

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build-win
```

## Supported Game Types

### Dofus 2 (Flash/AIR Client)
- Classic Dofus 2.x client
- Flash Player or AIR-based windows
- Window title pattern: "Dofus" or "Ankama"

### Dofus 3 (Unity Client)
- New Unity-based client (Beta/Production)
- Recommended for best performance
- Window title pattern: "Dofus" or "Dofus 3"

### Dofus Retro (1.29)
- Classic Dofus 1.29 client
- Retro server gameplay
- Window title pattern: "Dofus Retro" or "Retro"

## Usage

### First Launch
1. Start the application - it will appear in your system tray
2. Right-click the tray icon to access the menu
3. Select your game type (Dofus 2, Dofus 3, or Retro)
4. Click "Configure" to open the main configuration window
5. Click "Refresh" to scan for Dofus windows

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
- **Windows**: `%APPDATA%\dofus-organizer\`

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
- Check that you've selected the correct game type
- Run the application as Administrator if needed

**Shortcuts not working:**
- Close the configuration window to activate shortcuts
- Ensure no conflicting system shortcuts exist
- Try different key combinations
- Check Windows security settings

**Dock not appearing:**
- Enable dock in configuration footer
- Check that at least one window is enabled
- Verify dock position settings
- Ensure Windows display scaling is set correctly

**Permission issues:**
- Run the application as Administrator
- Check Windows Defender/Antivirus settings
- Ensure UAC settings allow the application

### System Requirements
- **OS**: Windows 10 1903 or later, Windows 11
- **Memory**: 200MB RAM minimum
- **Disk Space**: 500MB for installation
- **Display**: 1024x768 minimum resolution
- **Permissions**: Administrator rights for window management

## Windows-Specific Features

### Window Management APIs
- Uses native Windows APIs for window detection
- PowerShell integration for advanced window operations
- Support for Windows 10/11 display scaling
- Multi-monitor support

### Security Integration
- Windows Defender SmartScreen compatible
- Signed executable (code signing)
- UAC-aware for proper permissions
- Windows Registry integration for settings

### Performance Optimizations
- Efficient window polling using Windows events
- Minimal CPU usage when idle
- Memory-optimized for long-running operation
- Fast startup and shutdown

## Development

### Project Structure
```
src/
├── main.js              # Main Electron process
├── services/            # Core services
│   ├── WindowManager.js # Windows-specific window management
│   ├── ShortcutManager.js # Global shortcut handling
│   └── LanguageManager.js # Internationalization
└── renderer/            # UI components
    ├── config.html      # Configuration interface
    ├── config.js        # Configuration logic
    ├── dock.html        # Navigation dock
    └── dock.js          # Dock functionality
```

### Building for Windows
```batch
# Development
npm run dev

# Production build
npm run build

# Windows installer
npm run build-win

# Create portable version
npm run build-portable
```

### Dependencies
- **electron**: Cross-platform desktop framework
- **electron-store**: Settings persistence
- **i18next**: Internationalization
- **node-window-manager**: Native window management (optional)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Original AutoIt version: Dofus Organizer community
- Windows conversion: Modern web technologies (Electron, Node.js)
- Window management: Windows APIs + PowerShell integration
- Global shortcuts: Electron globalShortcut API

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include Windows version and error logs

### Collecting Debug Information
1. Run the application from Command Prompt to see console output
2. Check Windows Event Viewer for application errors
3. Include your Windows version and build number
4. Attach the application log file from `%APPDATA%\dofus-organizer\logs\`

---

**Note**: This application is not affiliated with Ankama Games or Dofus. It's a community tool designed to enhance the gaming experience for multi-account players on Windows.
