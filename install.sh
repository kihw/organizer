#!/bin/bash

# Dofus Organizer Linux - Installation Script
# This script installs Dofus Organizer and its dependencies on Linux systems

set -e

echo "==================================="
echo "  Dofus Organizer Linux Installer"
echo "==================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root!"
    exit 1
fi

# Detect distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect Linux distribution"
        exit 1
    fi
}

# Install Node.js and npm
install_nodejs() {
    print_status "Installing Node.js and npm..."
    
    case $DISTRO in
        ubuntu|debian)
            # Install NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        fedora|centos|rhel)
            # Install NodeSource repository
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo dnf install -y nodejs
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm nodejs npm
            ;;
        opensuse*)
            sudo zypper install -y nodejs18 npm18
            ;;
        *)
            print_warning "Unsupported distribution. Please install Node.js 18+ manually."
            print_status "Visit: https://nodejs.org/en/download/"
            read -p "Press Enter when Node.js is installed..."
            ;;
    esac
}

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y wmctrl xdotool xprop xwininfo git build-essential
            ;;
        fedora|centos|rhel)
            sudo dnf install -y wmctrl xdotool xprop xwininfo git gcc-c++ make
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm wmctrl xdotool xorg-xprop xorg-xwininfo git base-devel
            ;;
        opensuse*)
            sudo zypper install -y wmctrl xdotool xprop xwininfo git gcc-c++ make
            ;;
        *)
            print_warning "Please install the following packages manually:"
            echo "  - wmctrl (window control utility)"
            echo "  - xdotool (X11 automation tool)"
            echo "  - xprop (X property displayer)"
            echo "  - xwininfo (window information utility)"
            echo "  - git"
            echo "  - build-essential/gcc-c++/base-devel"
            read -p "Press Enter when dependencies are installed..."
            ;;
    esac
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_status "Node.js not found. Installing..."
        install_nodejs
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 16 ]; then
            print_warning "Node.js version is too old ($NODE_VERSION). Installing newer version..."
            install_nodejs
        else
            print_success "Node.js $(node --version) is already installed"
        fi
    fi
}

# Install or update Dofus Organizer
install_organizer() {
    print_status "Installing Dofus Organizer..."
    
    # Create application directory
    APP_DIR="$HOME/.local/share/dofus-organizer"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    
    # If this is an update, backup settings
    if [ -d "dofus-organizer-linux" ]; then
        print_status "Backing up existing configuration..."
        if [ -d "dofus-organizer-linux/config" ]; then
            cp -r "dofus-organizer-linux/config" "/tmp/dofus-organizer-backup-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
        fi
        rm -rf "dofus-organizer-linux"
    fi
    
    # Clone or copy the application files
    if [ -d "/tmp/dofus-organizer-source" ]; then
        print_status "Copying application files..."
        cp -r "/tmp/dofus-organizer-source" "dofus-organizer-linux"
    else
        print_status "Application files should be in the current directory"
        if [ ! -f "package.json" ]; then
            print_error "Installation files not found!"
            exit 1
        fi
    fi
    
    cd "dofus-organizer-linux" || cd .
    
    # Install npm dependencies
    print_status "Installing Node.js dependencies..."
    npm install --production
    
    # Create desktop entry
    create_desktop_entry
    
    # Create launcher script
    create_launcher
    
    print_success "Dofus Organizer installed successfully!"
}

# Create desktop entry
create_desktop_entry() {
    print_status "Creating desktop entry..."
    
    DESKTOP_FILE="$HOME/.local/share/applications/dofus-organizer.desktop"
    ICON_PATH="$APP_DIR/dofus-organizer-linux/assets/icons/organizer.png"
    EXEC_PATH="$APP_DIR/dofus-organizer-linux/dofus-organizer"
    
    # Create desktop entry
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Dofus Organizer
Comment=Window organizer for Dofus multi-accounting
Exec=$EXEC_PATH
Icon=$ICON_PATH
Terminal=false
StartupNotify=true
Categories=Game;Utility;
Keywords=dofus;window;organizer;gaming;
StartupWMClass=dofus-organizer
EOF
    
    chmod +x "$DESKTOP_FILE"
    
    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
    fi
}

# Create launcher script
create_launcher() {
    print_status "Creating launcher script..."
    
    LAUNCHER="$APP_DIR/dofus-organizer-linux/dofus-organizer"
    
    cat > "$LAUNCHER" << 'EOF'
#!/bin/bash

# Dofus Organizer Launcher Script

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the application directory
cd "$SCRIPT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    zenity --error --text="Node.js is required but not found.\nPlease install Node.js and try again." 2>/dev/null || \
    notify-send "Dofus Organizer" "Node.js is required but not found" 2>/dev/null || \
    echo "Node.js is required but not found"
    exit 1
fi

# Check if we're running under X11
if [ -z "$DISPLAY" ]; then
    echo "Error: X11 display not available"
    exit 1
fi

# Set up environment
export NODE_ENV=production

# Launch the application
exec node src/main.js "$@"
EOF
    
    chmod +x "$LAUNCHER"
    
    # Also create a system-wide launcher if possible
    if [ -w "/usr/local/bin" ]; then
        sudo ln -sf "$LAUNCHER" "/usr/local/bin/dofus-organizer" 2>/dev/null || true
    fi
}

# Test installation
test_installation() {
    print_status "Testing installation..."
    
    # Test Node.js
    if ! node --version &> /dev/null; then
        print_error "Node.js test failed"
        return 1
    fi
    
    # Test dependencies
    local DEPS=("wmctrl" "xdotool" "xprop" "xwininfo")
    for dep in "${DEPS[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            print_warning "$dep is not available (some features may not work)"
        fi
    done
    
    # Test application files
    if [ ! -f "$APP_DIR/dofus-organizer-linux/src/main.js" ]; then
        print_error "Application files are missing"
        return 1
    fi
    
    print_success "Installation test passed"
    return 0
}

# Main installation process
main() {
    print_status "Starting Dofus Organizer installation..."
    
    # Detect distribution
    detect_distro
    print_status "Detected distribution: $DISTRO $VERSION"
    
    # Install dependencies
    install_dependencies
    
    # Check/install Node.js
    check_nodejs
    
    # Install the organizer
    install_organizer
    
    # Test installation
    if test_installation; then
        echo
        print_success "Installation completed successfully!"
        echo
        echo "You can now:"
        echo "  1. Launch from Applications menu: 'Dofus Organizer'"
        echo "  2. Run from terminal: 'dofus-organizer'"
        echo "  3. Use the desktop shortcut"
        echo
        echo "For uninstallation, run: $APP_DIR/dofus-organizer-linux/uninstall.sh"
        echo
        
        read -p "Would you like to start Dofus Organizer now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            "$APP_DIR/dofus-organizer-linux/dofus-organizer" &
            print_success "Dofus Organizer started!"
        fi
    else
        print_error "Installation test failed"
        exit 1
    fi
}

# Run main function
main "$@"