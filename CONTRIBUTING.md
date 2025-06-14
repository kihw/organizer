# Contributing to Dofus Organizer

Thank you for your interest in contributing to Dofus Organizer! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 16 or later
- npm 7 or later
- Git

### Platform-specific requirements

#### Windows
- PowerShell 5.1 or later
- Windows 10 or later

#### Linux
- X11 window system
- Required packages: `wmctrl`, `xdotool`, `xprop`, `xwininfo`

#### macOS
- macOS 10.14 or later
- Xcode Command Line Tools

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/organizer.git
   cd organizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for your platform**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── main.js                    # Main Electron process
├── services/                  # Core services
│   ├── WindowManager.js       # Linux/macOS window management
│   ├── WindowManagerWindows.js # Windows-specific window management
│   ├── ShortcutManager.js     # Global shortcut handling
│   ├── ShortcutConfigManager.js # Shortcut persistence
│   └── LanguageManager.js     # Internationalization
└── renderer/                  # UI components
    ├── config.html            # Configuration interface
    ├── config.js              # Configuration logic
    ├── config.css             # Configuration styles
    ├── dock.html              # Navigation dock
    ├── dock.js                # Dock functionality
    └── dock.css               # Dock styles

assets/                        # Static assets
├── icons/                     # Application icons
└── avatars/                   # Character class avatars

locales/                       # Internationalization
└── languages.json            # Translation strings
```

## Contributing Guidelines

### Code Style

- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ conventions
- Add comments for complex logic
- Use meaningful variable and function names

### Commit Messages

Use conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(shortcuts): add character-based shortcut persistence
fix(windows): resolve window detection on Linux
docs(readme): update installation instructions
```

### Testing

- Test your changes on your target platform(s)
- Ensure existing functionality still works
- Add tests for new features when applicable

### Documentation

- Update README.md if adding new features
- Update CHANGELOG.md for all changes
- Add inline comments for complex code
- Update JSDoc comments for functions

## Submitting Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding guidelines
   - Test thoroughly
   - Update documentation

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - List testing performed

### Pull Request Guidelines

- Keep PRs focused and atomic
- Include tests when applicable
- Update documentation
- Ensure CI passes
- Respond to review feedback promptly

## Reporting Issues

When reporting issues, please include:

### Bug Reports
- **Environment**: OS, version, Node.js version
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Logs**: Console output or error messages
- **Dofus client**: Version and type (Dofus 2/3/Retro)

### Template
```markdown
**Environment:**
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Node.js: [e.g., 18.17.0]
- App version: [e.g., 0.1.0]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
A clear description of what you expected to happen.

**Actual behavior:**
A clear description of what actually happened.

**Screenshots:**
If applicable, add screenshots to help explain your problem.

**Additional context:**
Add any other context about the problem here.
```

## Feature Requests

For feature requests, please include:

- **Use case**: Why is this feature needed?
- **Description**: Detailed description of the feature
- **Mockups**: UI mockups if applicable
- **Alternatives**: Alternative solutions considered
- **Priority**: How important is this feature?

## Development Tips

### Debugging

- Use `npm run dev` for development with DevTools
- Check console logs in both main and renderer processes
- Use `console.log` liberally during development
- Test with multiple Dofus windows open

### Platform-specific Development

#### Windows
- Test PowerShell script functionality
- Verify window activation works correctly
- Test with different Dofus client types

#### Linux
- Test with different window managers
- Verify all required tools are available
- Test X11 window operations

#### macOS
- Test accessibility permissions
- Verify window management APIs work
- Test on both Intel and Apple Silicon

### Common Issues

1. **Window detection fails**
   - Check window title formats
   - Verify platform-specific tools are available
   - Test with different Dofus clients

2. **Shortcuts don't work**
   - Check global shortcut registration
   - Verify shortcut format conversion
   - Test shortcut conflicts

3. **Build fails**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: [Community server link if available]

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- README.md contributors section
- GitHub contributors page

Thank you for contributing to Dofus Organizer!