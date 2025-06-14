@echo off
REM Dofus Organizer - Windows Build Script
REM This script builds the application for Windows platforms

setlocal enabledelayedexpansion

echo ========================================
echo  Dofus Organizer - Windows Build
echo ========================================
echo.

REM Check if Node.js is installed
echo [94m[INFO][0m Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m[ERROR][0m Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m[ERROR][0m npm is not available
    pause
    exit /b 1
)

REM Get versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo [92m[SUCCESS][0m Node.js %NODE_VERSION% and npm %NPM_VERSION% are available
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo [91m[ERROR][0m package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [94m[INFO][0m Installing dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo [91m[ERROR][0m Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    echo [94m[INFO][0m Dependencies already installed, checking for updates...
    npm ci --only=production
    if !errorlevel! neq 0 (
        echo [93m[WARNING][0m Failed to update dependencies, continuing with existing ones...
    )
    echo.
)

REM Clean previous builds
echo [94m[INFO][0m Cleaning previous builds...
if exist "dist" (
    rmdir /s /q "dist"
    if !errorlevel! neq 0 (
        echo [93m[WARNING][0m Could not completely clean dist folder, some files may be in use
    )
)

REM Run clean script if available
npm run clean >nul 2>&1
if !errorlevel! neq 0 (
    echo [93m[WARNING][0m Clean script not available or failed
)

REM Build for Windows
echo [94m[INFO][0m Building for Windows...
echo This will create installers and portable versions for Windows...
echo.

echo [94m[INFO][0m Starting build process...
npm run build-win
if !errorlevel! neq 0 (
    echo [91m[ERROR][0m Build failed
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
echo [92m[SUCCESS][0m Build completed successfully!
echo ========================================
echo.

REM Check what was actually built
echo [94m[INFO][0m Checking build output...
if exist "dist" (
    echo.
    echo [92m[SUCCESS][0m Build artifacts created:
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
    echo [92m[SUCCESS][0m Available build types:
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
    echo [92m[SUCCESS][0m Installation recommendations:
    echo.
    echo   🏠 Home users: Use the NSIS installer ^(*Setup*.exe^)
    echo   🏢 Corporate: Use the MSI installer ^(*.msi^)
    echo   💾 Portable: Use the portable version ^(*portable*.exe^)
    echo   🔧 Advanced: Use the ZIP archive for custom installation
    
) else (
    echo [93m[WARNING][0m No dist folder found - build may have failed silently
    echo.
    echo Please check the build output above for any error messages.
)

echo.
echo ========================================
echo [92m[SUCCESS][0m Build process completed!
echo ========================================
echo.

REM Performance and system info
echo [94m[INFO][0m System Information:
echo   • Windows Version: 
wmic os get Caption,Version /format:list 2>nul | findstr "=" 2>nul
echo   • Available Memory: 
wmic computersystem get TotalPhysicalMemory /format:list 2>nul | findstr "=" 2>nul
echo   • Processor: 
wmic cpu get Name /format:list 2>nul | findstr "=" 2>nul

echo.

REM Ask if user wants to open the dist folder
set /p choice="Do you want to open the dist folder? (y/N): "
if /i "!choice!"=="y" (
    if exist "dist" (
        echo [94m[INFO][0m Opening dist folder...
        explorer "dist"
    ) else (
        echo [91m[ERROR][0m Dist folder does not exist
    )
)

echo.

REM Ask if user wants to test the build
set /p testchoice="Do you want to test the portable version? (y/N): "
if /i "!testchoice!"=="y" (
    for %%f in ("dist\*portable*.exe") do (
        echo [94m[INFO][0m Starting portable version: %%~nxf
        start "" "%%f"
        goto :test_done
    )
    echo [93m[WARNING][0m No portable version found to test
    :test_done
)

echo.
echo [92m[SUCCESS][0m Thank you for using Dofus Organizer!
echo.
echo Press any key to exit...
pause >nul

endlocal