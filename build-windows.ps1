#Requires -Version 5.1

<#
.SYNOPSIS
    Dofus Organizer - Windows Build Script
.DESCRIPTION
    This PowerShell script builds the Dofus Organizer application for Windows platforms.
    It creates installers, portable versions, and archives with proper error handling.
.PARAMETER Clean
    Force clean build by removing node_modules and dist folders
.PARAMETER SkipInstall
    Skip npm install step (useful for CI/CD)
.PARAMETER Verbose
    Enable verbose output
.EXAMPLE
    .\build-windows.ps1
.EXAMPLE
    .\build-windows.ps1 -Clean -Verbose
#>

[CmdletBinding()]
param(
    [switch]$Clean,
    [switch]$SkipInstall,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Color functions for better output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    $colors = @{
        "INFO"    = "Cyan"
        "SUCCESS" = "Green"
        "WARNING" = "Yellow"
        "ERROR"   = "Red"
        "HEADER"  = "Magenta"
    }
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
    Write-Host "[$Type] " -NoNewline -ForegroundColor $colors[$Type]
    Write-Host $Message
}

function Write-Header {
    param([string]$Title)
    
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host "=" * 60 -ForegroundColor Magenta
    Write-Host ""
}

function Test-Command {
    param([string]$Command)
    
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Get-FileSize {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        $size = (Get-Item $FilePath).Length
        if ($size -gt 1GB) {
            return "{0:N2} GB" -f ($size / 1GB)
        }
        elseif ($size -gt 1MB) {
            return "{0:N2} MB" -f ($size / 1MB)
        }
        elseif ($size -gt 1KB) {
            return "{0:N2} KB" -f ($size / 1KB)
        }
        else {
            return "$size bytes"
        }
    }
    return "Unknown"
}

function Show-SystemInfo {
    Write-ColorOutput "System Information:" "INFO"
    
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
        $memory = Get-CimInstance -ClassName Win32_ComputerSystem
        
        Write-Host "  • OS: $($os.Caption) ($($os.Version))" -ForegroundColor Gray
        Write-Host "  • CPU: $($cpu.Name.Trim())" -ForegroundColor Gray
        Write-Host "  • RAM: $([math]::Round($memory.TotalPhysicalMemory / 1GB, 2)) GB" -ForegroundColor Gray
        Write-Host "  • PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor Gray
    }
    catch {
        Write-ColorOutput "Could not retrieve system information" "WARNING"
    }
}

function Test-Prerequisites {
    Write-ColorOutput "Checking prerequisites..." "INFO"
    
    # Check Node.js
    if (-not (Test-Command "node")) {
        Write-ColorOutput "Node.js is not installed or not in PATH" "ERROR"
        Write-ColorOutput "Please install Node.js from https://nodejs.org/" "ERROR"
        exit 1
    }
    
    # Check npm
    if (-not (Test-Command "npm")) {
        Write-ColorOutput "npm is not available" "ERROR"
        exit 1
    }
    
    # Get versions
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-ColorOutput "Node.js $nodeVersion and npm $npmVersion are available" "SUCCESS"
    }
    catch {
        Write-ColorOutput "Failed to get Node.js/npm versions" "ERROR"
        exit 1
    }
    
    # Check if we're in the correct directory
    if (-not (Test-Path "package.json")) {
        Write-ColorOutput "package.json not found. Please run this script from the project root directory." "ERROR"
        exit 1
    }
    
    # Check package.json content
    try {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        Write-ColorOutput "Project: $($packageJson.name) v$($packageJson.version)" "INFO"
    }
    catch {
        Write-ColorOutput "Invalid package.json file" "ERROR"
        exit 1
    }
}

function Install-Dependencies {
    if ($SkipInstall) {
        Write-ColorOutput "Skipping dependency installation (SkipInstall flag)" "INFO"
        return
    }
    
    if ($Clean -or -not (Test-Path "node_modules")) {
        Write-ColorOutput "Installing dependencies..." "INFO"
        
        try {
            $installArgs = @("install")
            if (-not $Verbose) {
                $installArgs += "--silent"
            }
            
            & npm @installArgs
            
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed with exit code $LASTEXITCODE"
            }
            
            Write-ColorOutput "Dependencies installed successfully" "SUCCESS"
        }
        catch {
            Write-ColorOutput "Failed to install dependencies: $($_.Exception.Message)" "ERROR"
            exit 1
        }
    }
    else {
        Write-ColorOutput "Dependencies already installed, checking for updates..." "INFO"
        
        try {
            & npm ci --only=production --silent
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "Dependencies updated successfully" "SUCCESS"
            }
            else {
                Write-ColorOutput "Failed to update dependencies, continuing with existing ones..." "WARNING"
            }
        }
        catch {
            Write-ColorOutput "Failed to update dependencies, continuing with existing ones..." "WARNING"
        }
    }
}

function Clear-BuildArtifacts {
    Write-ColorOutput "Cleaning previous builds..." "INFO"
    
    $foldersToClean = @("dist")
    
    if ($Clean) {
        $foldersToClean += "node_modules"
        Write-ColorOutput "Performing clean build (removing node_modules)" "INFO"
    }
    
    foreach ($folder in $foldersToClean) {
        if (Test-Path $folder) {
            try {
                Remove-Item $folder -Recurse -Force
                Write-ColorOutput "Removed $folder directory" "SUCCESS"
            }
            catch {
                Write-ColorOutput "Could not completely clean $folder folder: $($_.Exception.Message)" "WARNING"
            }
        }
    }
    
    # Run npm clean script if available
    try {
        & npm run clean 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "npm clean script executed successfully" "SUCCESS"
        }
    }
    catch {
        # Ignore errors from clean script
    }
}

function Start-Build {
    Write-ColorOutput "Starting Windows build process..." "INFO"
    Write-ColorOutput "This will create installers and portable versions for Windows..." "INFO"
    
    try {
        $buildArgs = @("run", "build-win")
        if ($Verbose) {
            $buildArgs += "--verbose"
        }
        
        & npm @buildArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
        
        Write-ColorOutput "Build completed successfully!" "SUCCESS"
    }
    catch {
        Write-ColorOutput "Build failed: $($_.Exception.Message)" "ERROR"
        Write-ColorOutput "" "ERROR"
        Write-ColorOutput "Common solutions:" "ERROR"
        Write-ColorOutput "• Make sure all Dofus Organizer windows are closed" "ERROR"
        Write-ColorOutput "• Check if antivirus is blocking the build process" "ERROR"
        Write-ColorOutput "• Try running as Administrator" "ERROR"
        Write-ColorOutput "• Ensure you have enough disk space (at least 1GB free)" "ERROR"
        Write-ColorOutput "• Try running with -Clean parameter for a fresh build" "ERROR"
        exit 1
    }
}

function Show-BuildResults {
    Write-ColorOutput "Analyzing build output..." "INFO"
    
    if (-not (Test-Path "dist")) {
        Write-ColorOutput "No dist folder found - build may have failed silently" "WARNING"
        return
    }
    
    $buildFiles = Get-ChildItem "dist" -File
    
    if ($buildFiles.Count -eq 0) {
        Write-ColorOutput "Dist folder is empty - build may have failed" "WARNING"
        return
    }
    
    Write-ColorOutput "Build artifacts created:" "SUCCESS"
    Write-Host ""
    
    # Categorize and display files
    $installers = @()
    $portables = @()
    $archives = @()
    $others = @()
    
    foreach ($file in $buildFiles) {
        $fileInfo = @{
            Name = $file.Name
            Size = Get-FileSize $file.FullName
            Path = $file.FullName
        }
        
        switch -Regex ($file.Name) {
            ".*Setup.*\.exe$" { $installers += $fileInfo }
            ".*portable.*\.exe$" { $portables += $fileInfo }
            ".*\.zip$" { $archives += $fileInfo }
            ".*\.msi$" { $installers += $fileInfo }
            default { $others += $fileInfo }
        }
    }
    
    # Display categorized files
    if ($installers.Count -gt 0) {
        Write-Host "  📦 Installers:" -ForegroundColor Green
        foreach ($file in $installers) {
            Write-Host "     • $($file.Name) ($($file.Size))" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    if ($portables.Count -gt 0) {
        Write-Host "  💼 Portable Versions:" -ForegroundColor Green
        foreach ($file in $portables) {
            Write-Host "     • $($file.Name) ($($file.Size))" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    if ($archives.Count -gt 0) {
        Write-Host "  📁 Archives:" -ForegroundColor Green
        foreach ($file in $archives) {
            Write-Host "     • $($file.Name) ($($file.Size))" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    if ($others.Count -gt 0) {
        Write-Host "  📄 Other Files:" -ForegroundColor Green
        foreach ($file in $others) {
            Write-Host "     • $($file.Name) ($($file.Size))" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    # Show recommendations
    Write-ColorOutput "Installation recommendations:" "SUCCESS"
    Write-Host ""
    Write-Host "  🏠 Home users: Use the NSIS installer (*Setup*.exe)" -ForegroundColor Cyan
    Write-Host "  🏢 Corporate: Use the MSI installer (*.msi)" -ForegroundColor Cyan
    Write-Host "  💾 Portable: Use the portable version (*portable*.exe)" -ForegroundColor Cyan
    Write-Host "  🔧 Advanced: Use the ZIP archive for custom installation" -ForegroundColor Cyan
}

function Show-PostBuildOptions {
    Write-Host ""
    
    # Ask if user wants to open the dist folder
    $openDist = Read-Host "Do you want to open the dist folder? (y/N)"
    if ($openDist -eq "y" -or $openDist -eq "Y") {
        if (Test-Path "dist") {
            Write-ColorOutput "Opening dist folder..." "INFO"
            Invoke-Item "dist"
        }
        else {
            Write-ColorOutput "Dist folder does not exist" "ERROR"
        }
    }
    
    # Ask if user wants to test the portable version
    $testPortable = Read-Host "Do you want to test the portable version? (y/N)"
    if ($testPortable -eq "y" -or $testPortable -eq "Y") {
        $portableFile = Get-ChildItem "dist" -Filter "*portable*.exe" | Select-Object -First 1
        if ($portableFile) {
            Write-ColorOutput "Starting portable version: $($portableFile.Name)" "INFO"
            Start-Process $portableFile.FullName
        }
        else {
            Write-ColorOutput "No portable version found to test" "WARNING"
        }
    }
}

# Main execution
try {
    Write-Header "Dofus Organizer - Windows Build"
    
    Show-SystemInfo
    Write-Host ""
    
    Test-Prerequisites
    Write-Host ""
    
    Clear-BuildArtifacts
    Write-Host ""
    
    Install-Dependencies
    Write-Host ""
    
    Start-Build
    Write-Host ""
    
    Show-BuildResults
    Write-Host ""
    
    Write-Header "Build Process Completed Successfully!"
    
    Show-PostBuildOptions
    
    Write-Host ""
    Write-ColorOutput "Thank you for using Dofus Organizer!" "SUCCESS"
    Write-Host ""
}
catch {
    Write-ColorOutput "Unexpected error: $($_.Exception.Message)" "ERROR"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
}
finally {
    # Cleanup if needed
    $ProgressPreference = "Continue"
}