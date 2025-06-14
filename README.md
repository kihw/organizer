# Dofus Organizer - Cross-Platform Edition

A modern cross-platform Dofus Window Organizer with keyboard shortcuts, window management, and navigation dock. This application helps Dofus players manage multiple game windows efficiently across Windows, Linux, and macOS.

## Features

### 🎮 Advanced Window Management
- **Automatic Detection**: Automatically detects and lists all Dofus game windows
- **Smart Character Recognition**: Extracts character names and classes from window titles
- **Title Format Support**: Supports the format "Nom - Classe - Version - Release"
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
- **Avatar Customization**: Choose from multiple character avatars based on class
- **Window Enable/Disable**: Control which windows participate in cycling
- **Initiative Management**: Set and adjust character initiative values
- **Class Detection**: Automatic class detection from window titles

## Supported Platforms

### Windows
- Windows 10 or later (Windows 11 recommended)
- Advanced PowerShell integration for window management
- Native Windows APIs for optimal performance
- Support for all Dofus client types

### Linux
- Most modern Linux distributions
- X11 window system support
- Uses wmctrl, xdotool, and xprop for window management
- Automatic dependency detection and installation

### macOS
- macOS 10.14 or later
- Native macOS window management APIs
- Support for both Intel and Apple Silicon

## Installation

### Windows

#### Method 1: Binary Installation (Recommended)
1. Download the latest installer from the releases page
2. Run `DofusOrganizer-Setup.exe` as Administrator
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

#### Method 2: From Source
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

### Linux

#### Automatic Installation
```bash
# Make the installer executable
chmod +x install.sh

# Run the installer
./install.sh
```

#### Manual Installation
```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get install wmctrl xdotool xprop xwininfo git build-essential

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone https://github.com/kihw/organizer.git
cd organizer
npm install
npm run build-linux
```

### macOS

#### Method 1: DMG Installation
1. Download the latest DMG from releases
2. Open the DMG file
3. Drag Dofus Organizer to Applications folder
4. Launch from Applications or Launchpad

#### Method 2: From Source
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Clone and build
git clone https://github.com/kihw/organizer.git
cd organizer
npm install
npm run build-mac
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
- **Enhanced Title Support**: Automatically detects character name and class from titles formatted as "Nom - Classe - Version - Release"

### Dofus Retro (1.29)
- Classic Dofus 1.29 client
- Retro server gameplay
- Window title pattern: "Dofus Retro" or "Retro"

## Character and Class Detection

The application now supports advanced character and class detection from window titles using the format:

**Format**: `Nom - Classe - Version - Release`

**Examples**:
- `Gandalf - Iop - Dofus 3 - Beta`
- `Legolas - Cra - Dofus 2 - Release`
- `Gimli - Enutrof - Dofus Retro - 1.29`

### Supported Classes
- **Feca** / Féca
- **Osamodas**
- **Enutrof**
- **Sram**
- **Xelor** / Xélor
- **Ecaflip**
- **Eniripsa**
- **Iop**
- **Cra**
- **Sadida**
- **Sacrieur**
- **Pandawa**
- **Roublard** / Rogue
- **Zobal** / Masqueraider
- **Steamer** / Foggernaut
- **Eliotrope**
- **Huppermage**
- **Ouginak**
- **Forgelance**

The application automatically detects both French and English class names and normalizes them for consistent display.

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
- **Avatars**: Character avatars are automatically assigned based on detected class
- **Activation**: Click the activate button to bring any window to the front

## Configuration Files

The application stores its configuration in:
- **Windows**: `%APPDATA%\dofus-organizer\`
- **Linux**: `~/.config/dofus-organizer/`
- **macOS**: `~/Library/Application Support/dofus-organizer/`

Settings include:
- Window shortcuts and assignments
- Character initiative values
- Avatar selections (based on class)
- Language preferences
- Dock position and visibility

## Troubleshooting

### Common Issues

**Windows not detected:**
- Ensure Dofus is running with visible windows
- Try clicking the Refresh button
- Check that you've selected the correct game type
- Verify window titles follow the expected format: "Nom - Classe - Version - Release"

**Character/Class not detected:**
- Ensure window titles follow the format: "Character - Class - Version - Release"
- Check that class names are spelled correctly (French or English)
- Manually set the class if automatic detection fails

**Shortcuts not working:**
- Close the configuration window to activate shortcuts
- Ensure no conflicting system shortcuts exist
- Try different key combinations
- Check system security settings

**Dock not appearing:**
- Enable dock in configuration footer
- Check that at least one window is enabled
- Verify dock position settings
- Ensure display scaling is set correctly

### Platform-Specific Issues

#### Windows
- Run the application as Administrator if window detection fails
- Check Windows Defender/Antivirus settings
- Ensure UAC settings allow the application
- Verify PowerShell execution policy allows scripts

#### Linux
- Install required dependencies: `wmctrl`, `xdotool`, `xprop`, `xwininfo`
- Ensure X11 is running (not Wayland)
- Check that the user has permission to access window information
- Verify Node.js version is 16 or higher

#### macOS
- Grant accessibility permissions in System Preferences
- Allow the application in Security & Privacy settings
- Ensure the application is not quarantined by Gatekeeper

## Development

### Project Structure
```
src/
├── main.js                    # Main Electron process
├── services/                  # Core services
│   ├── WindowManager.js       # Linux/macOS window management
│   ├── WindowManagerWindows.js # Windows-specific window management
│   ├── ShortcutManager.js     # Global shortcut handling
│   └── LanguageManager.js     # Internationalization
└── renderer/                  # UI components
    ├── config.html            # Configuration interface
    ├── config.js              # Configuration logic
    ├── dock.html              # Navigation dock
    └── dock.js                # Dock functionality
```

### Building for Different Platforms

```bash
# Development
npm run dev

# Production builds
npm run build          # Current platform
npm run build-win      # Windows
npm run build-linux    # Linux
npm run build-mac      # macOS
npm run build-all      # All platforms

# Platform-specific scripts
./build-windows.bat    # Windows build script
./build-macos.sh       # macOS build script
./install.sh           # Linux installer
```

### Dependencies
- **electron**: Cross-platform desktop framework
- **electron-store**: Settings persistence
- **i18next**: Internationalization
- **Platform-specific**: Native window management APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on your target platform(s)
5. Submit a pull request

Please ensure your changes work across all supported platforms and include appropriate tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Original AutoIt version: Dofus Organizer community
- Cross-platform conversion: Modern web technologies (Electron, Node.js)
- Window management: Platform-specific APIs and tools
- Global shortcuts: Electron globalShortcut API

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include your platform, OS version, and error logs

### Collecting Debug Information

#### Windows
1. Run the application from Command Prompt to see console output
2. Check Windows Event Viewer for application errors
3. Include your Windows version and build number
4. Attach the application log file from `%APPDATA%\dofus-organizer\logs\`

#### Linux
1. Run the application from terminal to see console output
2. Check system logs: `journalctl -u dofus-organizer`
3. Include your distribution and version
4. Verify all dependencies are installed

#### macOS
1. Run the application from Terminal.app to see console output
2. Check Console.app for application errors
3. Include your macOS version
4. Verify accessibility permissions are granted

---

**Note**: This application is not affiliated with Ankama Games or Dofus. It's a community tool designed to enhance the gaming experience for multi-account players across all platforms.