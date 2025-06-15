import subprocess
import platform
import sys


def focus_window(title: str) -> bool:
    """Bring the window with the given title to the foreground."""
    system = platform.system()
    try:
        if system == "Windows":
            cmd = [
                "powershell",
                "-Command",
                f"(New-Object -ComObject WScript.Shell).AppActivate('{title}')"
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif system == "Linux":
            subprocess.run(["wmctrl", "-a", title], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif system == "Darwin":
            subprocess.run(["osascript", "-e", f'tell application \"{title}\" to activate'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            raise RuntimeError(f"Unsupported OS: {system}")
        return True
    except Exception as exc:
        print(f"Error focusing window '{title}': {exc}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        focus_window(sys.argv[1])
