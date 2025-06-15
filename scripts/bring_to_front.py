import sys
import time
import pygetwindow as gw
import win32gui
import win32con

def bring_window_to_front(partial_title):
    """
    Amène une fenêtre au premier plan en cherchant par titre partiel
    """
    try:
        windows = gw.getWindowsWithTitle(partial_title)
        if not windows:
            print(f"Aucune fenêtre ne contient '{partial_title}' dans son titre.")
            return False

        window = windows[0]  # On prend la première correspondance
        print(f"Fenêtre trouvée : {window.title}")

        hwnd = window._hWnd

        # Déiconifie si minimisée
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)

        # Amène au premier plan
        win32gui.SetForegroundWindow(hwnd)
        
        print(f"Fenêtre '{window.title}' amenée au premier plan avec succès.")
        return True
        
    except Exception as e:
        print(f"Erreur lors de l'activation de la fenêtre : {e}")
        return False

if __name__ == "__main__":
    start_time = time.time()

    if len(sys.argv) < 2:
        print("Usage: python bring_to_front.py <partie_nom_fenetre>")
        sys.exit(1)
    else:
        partial_title = " ".join(sys.argv[1:])
        success = bring_window_to_front(partial_title)

    end_time = time.time()
    duration = end_time - start_time
    print(f"Durée d'exécution : {duration:.4f} secondes")
    
    # Code de sortie pour indiquer le succès/échec
    sys.exit(0 if success else 1)
