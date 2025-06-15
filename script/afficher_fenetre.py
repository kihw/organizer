#!/usr/bin/env python3
"""
Script Python pour l'affichage de la fenêtre Dofus Organizer
Ce script remplace la logique d'affichage native d'Electron
"""

import tkinter as tk
from tkinter import ttk
import sys
import json
import subprocess
import threading
import time

class DofusOrganizerWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.setup_window()
        self.create_widgets()
        
    def setup_window(self):
        """Configuration de la fenêtre principale"""
        self.root.title("Dofus Organizer - Python Interface")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Configuration du style
        style = ttk.Style()
        style.theme_use('clam')
        
        # Centrer la fenêtre
        self.center_window()
        
    def center_window(self):
        """Centre la fenêtre sur l'écran"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        
    def create_widgets(self):
        """Création des widgets de l'interface"""
        # Frame principale
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configuration du redimensionnement
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Titre
        title_label = ttk.Label(main_frame, text="Dofus Organizer", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Status
        self.status_var = tk.StringVar(value="Interface Python initialisée")
        status_label = ttk.Label(main_frame, textvariable=self.status_var)
        status_label.grid(row=1, column=0, columnspan=2, pady=(0, 10))
        
        # Boutons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=2, column=0, columnspan=2, pady=10)
        
        ttk.Button(button_frame, text="Démarrer Organizer", 
                  command=self.start_organizer).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Configuration", 
                  command=self.open_config).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Quitter", 
                  command=self.quit_app).pack(side=tk.LEFT, padx=5)
        
        # Zone de log
        log_frame = ttk.LabelFrame(main_frame, text="Logs", padding="5")
        log_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = tk.Text(log_frame, height=15, wrap=tk.WORD)
        scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Log initial
        self.log("Interface Python démarrée")
        self.log("Prêt à interagir avec Dofus Organizer")
        
    def log(self, message):
        """Ajoute un message au log"""
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()
        
    def start_organizer(self):
        """Démarre l'organizer principal (simulation)"""
        self.log("Démarrage de Dofus Organizer...")
        self.status_var.set("Organizer en cours d'exécution")
        
        # Simulation d'un processus en arrière-plan
        def simulate_organizer():
            time.sleep(2)
            self.log("Recherche des fenêtres Dofus...")
            time.sleep(1)
            self.log("Fenêtres détectées: 0")
            self.log("Organizer prêt")
            
        thread = threading.Thread(target=simulate_organizer, daemon=True)
        thread.start()
        
    def open_config(self):
        """Ouvre la configuration (simulation)"""
        self.log("Ouverture de la configuration...")
        config_window = tk.Toplevel(self.root)
        config_window.title("Configuration")
        config_window.geometry("400x300")
        
        ttk.Label(config_window, text="Configuration Dofus Organizer", 
                 font=('Arial', 12, 'bold')).pack(pady=20)
        ttk.Label(config_window, text="Interface de configuration simplifiée").pack(pady=10)
        ttk.Button(config_window, text="Fermer", 
                  command=config_window.destroy).pack(pady=20)
        
    def quit_app(self):
        """Ferme l'application"""
        self.log("Fermeture de l'interface...")
        self.root.quit()
        
    def run(self):
        """Lance la boucle principale"""
        try:
            self.log("Interface prête - Démarrage de la boucle principale")
            self.root.mainloop()
        except KeyboardInterrupt:
            self.log("Interruption clavier détectée")
        except Exception as e:
            self.log(f"Erreur: {e}")
        finally:
            self.log("Arrêt de l'interface")

def main():
    """Fonction principale"""
    print("Démarrage de l'interface Python pour Dofus Organizer")
    
    try:
        app = DofusOrganizerWindow()
        app.run()
    except Exception as e:
        print(f"Erreur lors du démarrage: {e}")
        sys.exit(1)
        
if __name__ == "__main__":
    main()