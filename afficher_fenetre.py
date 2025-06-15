import sys
import subprocess
import platform

WINDOW_TITLE = "Dofus Organizer - Configuration"

def bring_to_front(title):
    system = platform.system()
    if system == "Windows":
        ps_script = f"$hwnd=(Get-Process | Where-Object {{ $_.MainWindowTitle -like '*{title}*' }} | Select-Object -First 1).MainWindowHandle;"
        ps_script += "if($hwnd -ne 0){Add-Type -Name Win32 -Namespace Native -MemberDefinition '[DllImport(\"user32.dll\")]public static extern bool ShowWindowAsync(IntPtr hWnd,int nCmdShow);[DllImport(\"user32.dll\")]public static extern bool SetForegroundWindow(IntPtr hWnd);';[Native.Win32]::ShowWindowAsync($hwnd,9)|Out-Null;[Native.Win32]::SetForegroundWindow($hwnd)|Out-Null;}"
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=False)
    elif system == "Linux":
        subprocess.run(["wmctrl", "-a", title], check=False)
    elif system == "Darwin":
        script = f'tell application "System Events" to set frontmost of the first process whose windows contain "{title}" to true'
        subprocess.run(["osascript", "-e", script], check=False)

if __name__ == "__main__":
    title = sys.argv[1] if len(sys.argv) > 1 else WINDOW_TITLE
    bring_to_front(title)
