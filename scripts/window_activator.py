#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Activate a Dofus window by character name.
This script is intentionally minimal. Detection of windows is handled in JavaScript.
"""

import sys
import time
import pygetwindow as gw
import win32gui
import win32con
import json

def bring_window_to_front(partial_title):
    """
    Active la fenêtre contenant le titre partiel donné
    
    Args:
        partial_title (str): Partie du titre de la fenêtre à rechercher
        
    Returns:
        dict: Résultat de l'opération avec durée et statut
    """
    start_time = time.time()
    
    try:
        # Recherche des fenêtres correspondantes
        windows = gw.getWindowsWithTitle(partial_title)
        
        if not windows:
            # Recherche plus large si aucune correspondance exacte
            all_windows = gw.getAllWindows()
            windows = [w for w in all_windows if partial_title.lower() in w.title.lower()]
        
        if not windows:
            return {
                "success": False,
                "error": f"Aucune fenêtre ne contient '{partial_title}' dans son titre",
                "duration": (time.time() - start_time) * 1000,
                "window_title": None
            }
        
        # Prendre la première correspondance
        window = windows[0]
        hwnd = window._hWnd
        
        # Vérifier que la fenêtre est valide
        if not win32gui.IsWindow(hwnd):
            return {
                "success": False,
                "error": f"Handle de fenêtre invalide: {hwnd}",
                "duration": (time.time() - start_time) * 1000,
                "window_title": window.title
            }
        
        # Déiconifier si minimisée
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            time.sleep(0.01)  # Petit délai pour la restauration
        
        # Amener au premier plan
        win32gui.SetForegroundWindow(hwnd)
        
        # Optionnel: S'assurer que la fenêtre est au top
        win32gui.BringWindowToTop(hwnd)
        
        duration = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "error": None,
            "duration": duration,
            "window_title": window.title,
            "hwnd": hwnd
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "duration": (time.time() - start_time) * 1000,
            "window_title": None
        }


def main():
    """Point d'entrée principal du script"""
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python window_activator.py <character_name>"
        }))
        sys.exit(1)

    character_name = " ".join(sys.argv[1:])
    result = bring_window_to_front(character_name)
    print(json.dumps(result))

    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
