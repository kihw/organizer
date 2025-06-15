#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Python pour l'activation ultra-rapide des fenêtres Dofus
Objectif: <50ms d'activation
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

def list_dofus_windows():
    """
    Liste toutes les fenêtres Dofus détectées
    
    Returns:
        dict: Liste des fenêtres avec leurs informations
    """
    start_time = time.time()
    
    try:
        all_windows = gw.getAllWindows()
        
        # Mots-clés pour identifier les fenêtres Dofus
        dofus_keywords = [
            'feca', 'osamodas', 'enutrof', 'sram', 'xelor', 'ecaflip',
            'eniripsa', 'iop', 'cra', 'sadida', 'sacrieur', 'pandawa',
            'roublard', 'zobal', 'steamer', 'eliotrope', 'huppermage',
            'ouginak', 'forgelance', 'dofus'
        ]
        
        dofus_windows = []
        
        for window in all_windows:
            if window.title and len(window.title.strip()) > 0:
                title_lower = window.title.lower()
                
                # Exclure notre propre organizer
                if 'organizer' in title_lower:
                    continue
                
                # Vérifier si c'est une fenêtre Dofus
                is_dofus = any(keyword in title_lower for keyword in dofus_keywords)
                
                if is_dofus:
                    try:
                        hwnd = window._hWnd
                        if win32gui.IsWindow(hwnd):
                            dofus_windows.append({
                                "title": window.title,
                                "hwnd": hwnd,
                                "visible": window.visible,
                                "minimized": win32gui.IsIconic(hwnd)
                            })
                    except:
                        continue
        
        duration = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "windows": dofus_windows,
            "count": len(dofus_windows),
            "duration": duration
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "windows": [],
            "count": 0,
            "duration": (time.time() - start_time) * 1000
        }

def main():
    """Point d'entrée principal du script"""
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python window_activator.py <action> [parameters]",
            "help": {
                "activate": "python window_activator.py activate <window_title>",
                "list": "python window_activator.py list"
            }
        }))
        sys.exit(1)
    
    action = sys.argv[1].lower()
    
    if action == "activate":
        if len(sys.argv) < 3:
            print(json.dumps({
                "success": False,
                "error": "Usage: python window_activator.py activate <window_title>"
            }))
            sys.exit(1)
        
        partial_title = " ".join(sys.argv[2:])
        result = bring_window_to_front(partial_title)
        print(json.dumps(result))
        
        # Code de sortie basé sur le succès
        sys.exit(0 if result["success"] else 1)
        
    elif action == "list":
        result = list_dofus_windows()
        print(json.dumps(result, indent=2))
        sys.exit(0)
        
    else:
        print(json.dumps({
            "success": False,
            "error": f"Action inconnue: {action}. Actions disponibles: activate, list"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
