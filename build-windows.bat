@echo off
REM Dofus Organizer - Windows Build Script
REM This script builds the application for Windows platforms

setlocal enabledelayedexpansion

echo ========================================
echo  Dofus Organizer - Windows Build
echo ========================================
echo.

REM Colors for output (using echo with special characters)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Jump to main after function definitions
goto :main

REM Function definitions
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:main
REM Check if Node.js is installed
call :print_status "Checking Node.js installation..."
node --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed or not in PATH"
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "npm is not available"
    pause
    exit /b 1
)

REM Get versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

call :print_success "Node.js %NODE_VERSION% and npm %NPM_VERSION% are available"
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    call :print_error "package.json not found. Please run this script from the project root directory."
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    call :print_status "Installing dependencies..."
    npm install
    if !errorlevel! neq 0 (
        call :print_error "Failed to install dependencies"
        pause
        exit /b 1
    )
    echo.
) else (
    call :print_status "Dependencies already installed, checking for updates..."
    npm ci --only=production
    if !errorlevel! neq 0 (
        call :print_warning "Failed to update dependencies, continuing with existing ones..."
    )
    echo.
)

REM Clean previous builds
call :print_status "Cleaning previous builds..."
if exist "dist" (
    rmdir /s /q "dist"
    if !errorlevel! neq 0 (
        call :print_warning "Could not completely clean dist folder, some files may be in use"
    )
)

REM Run clean script if available
npm run clean >nul 2>&1
if !errorlevel! neq 0 (
    call :print_warning "Clean script not available or failed"
)

REM Build for Windows
call :print_status "Building for Windows..."
echo This will create installers and portable versions for Windows...
echo.

call :print_status "Starting build process..."
npm run build-win
if !errorlevel! neq 0 (
    call :print_error "Build failed"
    echo.
    echo Common solutions:
    echo - Make sure all Dofus Organizer windows are closed
    echo - Check if antivirus is blocking the build process
    echo - Try running as Administrator
    echo - Ensure you have enough disk space
    echo.
    pause
    exit /b 1
)

echo.
call :print_success "Build completed successfully!"
echo ========================================
echo.

REM Check what was actually built
call :print_status "Checking build output..."
if exist "dist" (
    echo.
    call :print_success "Build artifacts created:"
    echo.
    
    REM List all files in dist with details
    for %%f in ("dist\*.*") do (
        set "filename=%%~nxf"
        set "filesize=%%~zf"
        
        REM Convert bytes to MB for readability
        set /a "filesizeMB=!filesize!/1048576"
        
        if "!filename:~-4!"==".exe" (
            if "!filename!"=="!filename:Setup=!" (
                if "!filename!"=="!filename:portable=!" (
                    echo   📦 !filename! ^(!filesizeMB! MB^) - Installer
                ) else (
                    echo   💼 !filename! ^(!filesizeMB! MB^) - Portable
                )
            ) else (
                echo   🔧 !filename! ^(!filesizeMB! MB^) - Setup
            )
        ) else if "!filename:~-4!"==".zip" (
            echo   📁 !filename! ^(!filesizeMB! MB^) - Archive
        ) else if "!filename:~-4!"==".msi" (
            echo   📦 !filename! ^(!filesizeMB! MB^) - MSI Installer
        ) else (
            echo   📄 !filename! ^(!filesizeMB! MB^)
        )
    )
    
    echo.
    call :print_success "Available build types:"
    echo.
    
    REM Check for specific build types
    if exist "dist\*Setup*.exe" (
        echo   ✅ NSIS Installer ^(.exe^) - Recommended for most users
        echo      • Desktop shortcut creation
        echo      • Start menu integration  
        echo      • Automatic updates support
        echo      • Uninstaller included
    )
    
    if exist "dist\*portable*.exe" (
        echo   ✅ Portable version ^(.exe^) - No installation required
        echo      • Run directly from any location
        echo      • Perfect for USB drives
        echo      • No registry changes
    )
    
    if exist "dist\*.zip" (
        echo   ✅ ZIP archive - Manual extraction
        echo      • Extract and run manually
        echo      • Full control over installation location
    )
    
    if exist "dist\*.msi" (
        echo   ✅ MSI Installer - Enterprise deployment
        echo      • Group Policy deployment support
        echo      • Corporate environment friendly
    )
    
    echo.
    call :print_success "Installation recommendations:"
    echo.
    echo   🏠 Home users: Use the NSIS installer ^(*Setup*.exe^)
    echo   🏢 Corporate: Use the MSI installer ^(*.msi^)
    echo   💾 Portable: Use the portable version ^(*portable*.exe^)
    echo   🔧 Advanced: Use the ZIP archive for custom installation
    
) else (
    call :print_warning "No dist folder found - build may have failed silently"
    echo.
    echo Please check the build output above for any error messages.
)

echo.
echo ========================================
call :print_success "Build process completed!"
echo ========================================
echo.

REM Performance and system info
call :print_status "System Information:"
echo   • Windows Version: 
wmic os get Caption,Version /format:list | findstr "="
echo   • Available Memory: 
wmic computersystem get TotalPhysicalMemory /format:list | findstr "=" 
echo   • Processor: 
wmic cpu get Name /format:list | findstr "=" | head -1

echo.

REM Ask if user wants to open the dist folder
set /p choice="Do you want to open the dist folder? (y/N): "
if /i "!choice!"=="y" (
    if exist "dist" (
        call :print_status "Opening dist folder..."
        explorer "dist"
    ) else (
        call :print_error "Dist folder does not exist"
    )
)

echo.

REM Ask if user wants to test the build
set /p testchoice="Do you want to test the portable version? (y/N): "
if /i "!testchoice!"=="y" (
    for %%f in ("dist\*portable*.exe") do (
        call :print_status "Starting portable version: %%~nxf"
        start "" "%%f"
        goto :test_done
    )
    call :print_warning "No portable version found to test"
    :test_done
)

echo.
call :print_success "Thank you for using Dofus Organizer!"
echo.
echo Press any key to exit...
pause >nul

endlocal