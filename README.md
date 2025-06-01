 Objectif général du projet

Organizer est un outil destiné à gérer automatiquement les fenêtres du jeu Dofus, souvent utilisées en multicompte. Il permet de :

    positionner, redimensionner, et organiser les fenêtres du jeu,

    sauvegarder/restaurer des configurations (positions, comptes),

    changer dynamiquement la disposition,

    gérer des groupes de comptes ou profils de jeu.

Le programme interagit avec les fenêtres du système (via WinAPI sur Windows) pour les manipuler, probablement à partir de noms de fenêtres ou titres personnalisés.
🧱 Architecture du projet AutoIt
1. Organizer.au3 (fichier principal)

    Définit l’UI principale (fenêtres, menus, boutons),

    Charge les modules et fonctions secondaires via #Include,

    Gère la boucle principale du programme (UI + interaction utilisateur),

    Utilise une icône spécifique (Organizer.ico),

    Dépend des outils Windows (AutoIt3Wrapper, 7z, etc.).

2. Modules inclus (répartition fonctionnelle)
Module	Description synthétique
Menus.au3	Gestion complète des menus, éléments d’interface graphique (UI).
Semaphores.au3	Gestion de verrouillages ou drapeaux logiques (utilisé pour synchroniser des opérations).
Modelisation.au3	Définit les structures ou objets utilisés pour modéliser les fenêtres.
Compilation.au3	Instructions d’archivage/compilation pour le binaire.
Evolution.au3	Mise à jour de l'interface ou logique interne au cours du temps (versioning).
Divers.au3	Fonctions utilitaires (logique générique, gestion de fichiers, etc.).
Communication.au3	Gère les échanges de données entre modules ou processus.
3. Language.ini

    Fichier de langue (clés = chaînes à traduire),

    Système d’internationalisation basique utilisé dans les menus et messages UI.

🔁 Comportement typique du logiciel

    L’utilisateur lance Organizer.

    Une fenêtre principale s’ouvre avec des menus (probablement : Fichier, Options, Disposition, etc.).

    Il peut sélectionner un groupe de comptes Dofus.

    Le logiciel détecte les fenêtres Dofus ouvertes, les associe à des comptes.

    Il permet de :

        Réorganiser les fenêtres sur l’écran,

        Appliquer des positions prédéfinies (grille, pile, mosaïque),

        Sauvegarder cette configuration pour une prochaine session.

🔁 Dépendances Windows (à remplacer)
Dépendance AutoIt / Windows	But	Équivalent Linux / Python
WinAPI	Manipulation de fenêtres	pygetwindow, Xlib, wmctrl, PyQt
AutoIt GUI	UI native Windows	PyQt5 ou PyQt6
GDIPlus	Graphismes / interface	Géré par Qt
Fichiers .ini	Configurations	configparser en Python
🔄 Plan de réécriture en Python (compatible Linux)
Langages et bibliothèques recommandés :

    Langage : Python 3.10+

    Interface graphique : PyQt6 (riche, multiplateforme, bien adaptée aux interfaces complexes)

    Gestion de fenêtres système :

        pygetwindow (multiplateforme mais limité)

        ou wmctrl/Xlib sous Linux pour un contrôle plus fin

Modules Python à développer :
Module	Fonction équivalente AutoIt
main.py	Lance l’interface principale (Organizer.au3)
ui_menus.py	Menus dynamiques (Menus.au3)
window_manager.py	Positionnement des fenêtres
models.py	Objets métiers (Modelisation.au3)
config.py	Chargement/sauvegarde des fichiers .ini
utils.py	Fonctions diverses (Divers.au3)
lang.py	Gestion multilingue (Language.ini)
📌 Fonctionnalités principales à réimplémenter

Détection des fenêtres ouvertes du jeu Dofus

Association nom de compte ↔ fenêtre

Choix d’une disposition (grille, pile…)

Positionnement des fenêtres (via Xlib ou wmctrl)

Sauvegarde/restauration des configurations

UI intuitive avec menus, boutons et raccourcis

Support multilingue via fichier .ini
# organizer
# organizer
