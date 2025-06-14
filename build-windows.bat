@echo off
REM Dofus Organizer - Windows Build Script
REM This script builds the application for Windows platforms

echo ========================================
echo  Dofus Organizer - Windows Build
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available
    pause
    exit /b 1
)

echo Node.js and npm are available
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Clean previous builds
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
npm run clean >nul 2>&1

REM Build for Windows
echo Building for Windows...
npm run build-win
if %errorlevel% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Build completed successfully!
echo ========================================
echo.
echo Output files are in the 'dist' folder:
if exist "dist" (
    dir "dist" /b
) else (
    echo No output files found
)

echo.
echo Press any key to exit...
pause >nul
