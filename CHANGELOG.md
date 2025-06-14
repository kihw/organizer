# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added
- **Cross-platform support** for Windows, Linux, and macOS
- **Advanced window detection** for Dofus 2, Dofus 3, and Dofus Retro
- **Character and class detection** from window titles (format: "Nom - Classe - Version - Release")
- **Persistent keyboard shortcuts** saved by character name and class
- **Global shortcuts** for window cycling and shortcut toggling
- **Navigation dock** with customizable position and thumbnails
- **Multi-language support** (French, English, German, Spanish, Italian)
- **Initiative-based sorting** for optimal turn order management
- **Window organization** with grid, horizontal, and vertical layouts
- **Character avatars** automatically assigned based on detected class
- **Configuration interface** with modern UI and real-time updates

### Features
- **Smart shortcut persistence**: Shortcuts are saved by character name and class, not window ID
- **Automatic character detection**: Supports the format "Character - Class - Version - Release"
- **19 Dofus classes supported**: All current classes including Forgelance
- **Robust window management**: Works across different Dofus client types
- **System tray integration**: Runs in background with quick access menu
- **Real-time window updates**: Automatic detection of new/closed windows
- **Customizable dock**: Position anywhere on screen with visual indicators

### Technical
- **Electron-based**: Modern cross-platform desktop application
- **JSON configuration**: Human-readable settings and shortcuts storage
- **PowerShell integration**: Advanced Windows window management
- **Linux compatibility**: Uses wmctrl, xdotool, and xprop for window operations
- **Memory efficient**: Optimized window scanning and caching

### Supported Platforms
- **Windows**: 10 or later (Windows 11 recommended)
- **Linux**: Most modern distributions with X11
- **macOS**: 10.14 or later (Intel and Apple Silicon)

### Supported Dofus Clients
- **Dofus 3**: Unity-based client (Beta/Production)
- **Dofus 2**: Flash/AIR-based client
- **Dofus Retro**: Classic 1.29 client
- **Steamer/Boulonix**: Alternative clients

### Known Issues
- Wayland support on Linux is limited (X11 recommended)
- Some antivirus software may flag the application (false positive)
- macOS requires accessibility permissions for window management

### Installation
- Download the appropriate installer for your platform from the releases page
- Windows: Run the installer as Administrator
- Linux: Install required dependencies (wmctrl, xdotool, xprop)
- macOS: Grant accessibility permissions when prompted

### Migration
- Automatically migrates settings from older versions
- Preserves existing shortcuts and character configurations
- Backup files are created during migration