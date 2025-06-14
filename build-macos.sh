#!/bin/bash

# Dofus Organizer - macOS Build Script
# This script builds the application for macOS platforms

set -e

echo "========================================"
echo "  Dofus Organizer - macOS Build"
echo "========================================"
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    print_status "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available"
    exit 1
fi

print_success "Node.js $(node --version) and npm $(npm --version) are available"
echo

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    echo
fi

# Clean previous builds
print_status "Cleaning previous builds..."
if [ -d "dist" ]; then
    rm -rf dist
fi
npm run clean &>/dev/null || true

# Build for macOS
print_status "Building for macOS..."
npm run build-mac
if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

echo
print_success "Build completed successfully!"
echo "========================================"
echo

print_status "Output files are in the 'dist' folder:"
if [ -d "dist" ]; then
    ls -la dist/
else
    print_warning "No output files found"
fi

echo
print_success "Build process completed!"

# Optional: Open dist folder in Finder
if command -v open &> /dev/null && [ -d "dist" ]; then
    read -p "Do you want to open the dist folder in Finder? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open dist/
    fi
fi
