#NoTrayIcon

#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=Organizer\Organizer.ico
#AutoIt3Wrapper_Outfile=..\..\bin\Modules\Organizer.exe
#AutoIt3Wrapper_Res_Comment=Le petit module pour gérer ses fenêtres Dofus !
#AutoIt3Wrapper_Res_Description=Le petit module pour gérer ses fenêtres Dofus !
#AutoIt3Wrapper_Res_Fileversion=1.4.0.0
#AutoIt3Wrapper_Res_LegalCopyright=ZDS
#AutoIt3Wrapper_Res_Language=1036
#AutoIt3Wrapper_Res_Field=PROJECT|nAiO
#AutoIt3Wrapper_Res_Field=name|Organizer
#AutoIt3Wrapper_Res_Field=type|Module
#AutoIt3Wrapper_Res_Field=auto|True
#AutoIt3Wrapper_Res_Field=version|1.4
#AutoIt3Wrapper_Res_Field=description|Gestionnaire de fenêtres
#AutoIt3Wrapper_Res_Field=url|http://www.naio.fr
#AutoIt3Wrapper_Run_Before="mkdir ..\..\bin\Modules"
#AutoIt3Wrapper_Run_Before="7z.exe a -tzip "%scriptdir%\Sources.zip" "%scriptdir%\Organizer.au3""
#AutoIt3Wrapper_Run_Before="7z.exe a -tzip "%scriptdir%\Sources.zip" "%scriptdir%\Organizer""
#AutoIt3Wrapper_Run_After="del "%scriptdir%\Sources.zip""
#AutoIt3Wrapper_Run_After=""%autoitdir%\AutoIt3.exe" "..\..\tools\archive_zip.au3" "%scriptfile%" "Modules""
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****

; ### Region Librairies AutoIt

#Include <Array.au3>
#Include <GDIPlus.au3>
#Include <WinAPI.au3>

; ### Region Librairies du nAiO

#Include ".\Organizer\Include\Communication.au3"
#Include ".\Organizer\Include\Compilation.au3"
#Include ".\Organizer\Include\Divers.au3"
#Include ".\Organizer\Include\Evolution.au3"
#Include ".\Organizer\Include\Menus.au3"
#Include ".\Organizer\Include\Modelisation.au3"
#Include ".\Organizer\Include\Semaphores.au3"

; ### Region Exécution du programme

Exit onLaunch()

; ### Region Point d'entrée du programme

Func onLaunch()
	If onSources() Then
		; Initialisation
		Local $WorkingDir = @WorkingDir
		FileChangeDir(@ScriptDir)
		; Extraction
		FileInstall(".\Sources.zip", ".\Organizer-Sources.zip", 1)
		; Finalisation
		FileChangeDir($WorkingDir)
	ElseIf onHelp() Then
		MsgBox(0, "Aide du fichier """&@ScriptName&"""", "Liste des commandes utilisables :"     _
			& @CRLF & "-"&"  "&"/?, /h ou /help :"  & @TAB & "Afficher ce message d'aide"        _
			& @CRLF & "-"&"  "&"/src ou /sources :" & @TAB & "Extraire les sources du programme" _
			& @CRLF & "-"&"  "&"/debug :"           & @TAB & "Lancer le programme en mode débug" _
		)
	Else
		onStart()
		OnAutoItExitRegister("onExit")
		If singleton() Then
			ORGANIZER_display(onAuto())
			If ORGANIZER_restart() Then
				Local $arg_profil = ""
				If ORGANIZER_profil_restart() <> "" Then
					$arg_profil = "-profil "&ORGANIZER_profil_restart()
				ElseIf ORGANIZER_profil() <> $ORGANIZER_profil_DEFAULT Then
					$arg_profil = "-profil "&ORGANIZER_profil()
				EndIf
				ShellExecute(@ScriptFullPath, (onDebug()?"-debug":"")&" "&(onAuto()?"-auto":"")&" "&$arg_profil, @WorkingDir)
			EndIf
		EndIf
	EndIf
	Return 0
EndFunc

Func onSources()
	For $i = 1 To $CmdLine[0]
		If StringRegExp($CmdLine[$i], "^(?i)(-|/)(src|source|sources)$") Then Return True
	Next
	Return False
EndFunc

Func onHelp()
	For $i = 1 To $CmdLine[0]
		If StringRegExp($CmdLine[$i], "^(?i)(-|/)(\?|help|h)$") Then Return True
	Next
	Return False
EndFunc

Func onDebug()
	If IsDeclared("onDebug") Then
		Global $onDebug
		Return $onDebug
	EndIf
	Global $onDebug = False
	For $i = 1 To $CmdLine[0]
		If StringRegExp($CmdLine[$i], "^(?i)(-|/)(debug)$") Then $onDebug = True
	Next
	Return $onDebug
EndFunc

Func onAuto()
	For $i = 1 To $CmdLine[0]
		If StringRegExp($CmdLine[$i], "^(?i)(-|/)(auto)$") Then Return True
	Next
	Return False
EndFunc

Func onFirstLaunch()
	Local $resultat = False
	If Not FileExists(ORGANIZER_config_file()) Then
		$resultat = True
	EndIf
	Return $resultat
EndFunc

Func onStart()
	Global Const $USER32_DLL = DllOpen("user32.dll"), $MAILSLOT_COMMAND = MailSlot_Create("Command-"&@AutoItPID)
	If Not FileExists(ORGANIZER_folder())      Then DirCreate(ORGANIZER_folder())
	If Not FileExists(ORGANIZER_config_file()) Then FileClose(FileOpen(ORGANIZER_config_file(), 10))
	compilation_extract_files()
	upgrade_to_current_version()
	Opt("WinWaitDelay", 50)
	ORGANIZER_translation(Default)
EndFunc

Func onExit()
	If IsDeclared("USER32_DLL") Then DllClose($USER32_DLL)
	If IsDeclared("MAILSLOT_COMMAND") Then MailSlot_Close($MAILSLOT_COMMAND)
EndFunc

Func ORGANIZER_display($onAuto=False)
	Local $resultat = ($onAuto?"ACTIVATE_AUTO":"CONFIG")
	Do
		Switch $resultat
			Case "QUIT"
				; Rien
			Case "CONFIG"
				$resultat = ORGANIZER_displayGUI()
			Case "ACTIVATE_AUTO"
				$resultat = ORGANIZER_displayTray(True)
			Case "ACTIVATE"
				$resultat = ORGANIZER_displayTray(False)
			Case Else
				$resultat = "QUIT"
		EndSwitch
	Until $resultat = "QUIT"
EndFunc

; ### Region Utilisation des raccourcis

Func ORGANIZER_displayTray($flag)
	; Initialisation
	Global $ORGANIZER_fenetres = ORGANIZER_getWinList() _
		, $ORGANIZER_dock_position       = checkPosition(IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Dock", ""))  _
		, $ORGANIZER_dock_thumbnails     = (IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Thumbnails",  "N") = "Y") _
		, $ORGANIZER_cursorcycle_enabled = (IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "CycleCursor", "Y") = "Y")
	Global $ORGANIZER_commandes[3] = [2 _
		, IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Previous", "") _
		, IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Next",     "") _
	]
	; Activation des raccourcis
	Local $nShortcuts = startShortcuts()
	; Création des éléments graphiques
	Global $TRAY = _TrayIconCreate(field("name")&" v"&field("version"), @ScriptFullPath), $TRAY_context = _TrayCreateContextMenu($TRAY)
	Global $TRAY_about      = _GUICtrlCreateODMenuItem(translate("main_about"),       $TRAY_context)
	Global $TRAY_separator1 = _GUICtrlCreateODMenuItem("",                            $TRAY_context)
	Global $TRAY_refresh    = _GUICtrlCreateODMenuItem(translate("main_refreshsort"), $TRAY_context)
	Global $TRAY_config     = _GUICtrlCreateODMenuItem(translate("main_configure"),   $TRAY_context)
	Global $TRAY_separator2 = _GUICtrlCreateODMenuItem("",                            $TRAY_context)
	Global $TRAY_quit       = _GUICtrlCreateODMenuItem(translate("main_quit"),        $TRAY_context)
	_GUICtrlODMenuItemSetIcon($TRAY_about,   @ScriptFullPath)
	_GUICtrlODMenuItemSetIcon($TRAY_refresh, ORGANIZER_images_folder()&"\Actualiser.ico")
	_GUICtrlODMenuItemSetIcon($TRAY_config,  ORGANIZER_images_folder()&"\Configurer.ico")
	_GUICtrlODMenuItemSetIcon($TRAY_quit,    ORGANIZER_images_folder()&"\Sortir.ico")
	; Affichage
	_TrayIconSetClick($TRAY, 2+16) ; Releasing primary = 2 ; Releasing secondary = 16
	_TrayIconSetState($TRAY, 1)
	If Not $flag Then ORGANIZER_displayTray_traytip(False, $nShortcuts, $ORGANIZER_fenetres)
	; Fenêtres dock
	Global $DOCK_GUI = 0, $DOCK_REFRESH = 0, $DOCK_QUIT_OR_CONFIG = 0, $DOCK_ICONES[1] = [0]
	If $ORGANIZER_dock_position <> "" Then
		$DOCK_GUI = GUICreate(field("name")&" v"&field("version"), checkOrientation($ORGANIZER_dock_position)?28:54, checkOrientation($ORGANIZER_dock_position)?54:28, 0, 0, 0x80800000, 0x00000088) ; $WS_POPUP = 0x80000000 ; $WS_BORDER = 0x00800000 ; $WS_EX_TOOLWINDOW = 0x00000080 ; $WS_EX_TOPMOST = 0x00000008
		GUISetIcon(@ScriptFullPath, Default, $DOCK_GUI)
		$DOCK_REFRESH        = GUICtrlCreateButton("", 2, checkOrientation($ORGANIZER_dock_position)?28:2, 24, 24, 0x40) ; $BS_ICON = 0x40
		$DOCK_QUIT_OR_CONFIG = GUICtrlCreateButton("", checkOrientation($ORGANIZER_dock_position)?2:28, 2, 24, 24, 0x40) ; $BS_ICON = 0x40
		_GUICtrlSetImage($DOCK_REFRESH, ORGANIZER_images_folder()&"\Actualiser.ico", 16)
		_GUICtrlSetImage($DOCK_QUIT_OR_CONFIG,  ORGANIZER_images_folder()&"\Quitter.ico", 16)
		GUICtrlSetTip($DOCK_REFRESH, translate("dock_REFRESH_tooltip"), translate("main_refreshsort"), 0)
		GUICtrlSetResizing($DOCK_REFRESH,        802) ; $GUI_DOCKALL = 2+32+256+512
		GUICtrlSetResizing($DOCK_QUIT_OR_CONFIG, 802) ; $GUI_DOCKALL = 2+32+256+512
		ORGANIZER_refreshDock()
	EndIf
	Local $quit = False, $warn = False, $config = False, $quantum = -1, $focus = 0, $previous_position = ""
	Do
;~ 		Sleep(20)
		Local $msg = ORGANIZER_msg(0)
		If $msg = 0 Then $msg = GUIGetMsg()
		Switch $msg
			Case 0
				Local $message = MailSlot_Read($MAILSLOT_COMMAND)
				Switch $message
					Case "@quit"
						$quit = True
				EndSwitch
			Case $TRAY_about
				ORGANIZER_displayTray_traytip(True, $nShortcuts, $ORGANIZER_fenetres)
			Case $TRAY_refresh, $DOCK_REFRESH
				stopShortcuts()
				; Mise à jour
				$ORGANIZER_fenetres = ORGANIZER_getWinList()
				For $i = 1 To $ORGANIZER_fenetres[0]
					_TrayTip($TRAY, field("name")&" v"&field("version")&" - "&translate("main_sorting"), translate("displayTray_sorting", $i, $ORGANIZER_fenetres[0]), 10, 2)
					Local $handle = fenetre_handle($ORGANIZER_fenetres[$i])
					Local $icone = NAIO_images_folder()&"\Avatars\"&fenetre_icon($ORGANIZER_fenetres[$i])&".ico"
					WinSetState($handle, "", @SW_HIDE)
					WinSetState($handle, "", @SW_SHOW)
					If FileExists($icone) Then
						WinSetIcon($handle, $icone)
					Else
						WinResetIcon($handle)
					EndIf
				Next
				$warn = False
				_TrayIconSetToolTip($TRAY, field("name")&" v"&field("version"))
				_TrayIconSetIcon($TRAY, @ScriptFullPath)
				GUICtrlSetTip($DOCK_REFRESH, translate("dock_REFRESH_tooltip"), translate("main_refreshsort"), 0)
				_GUICtrlSetImage($DOCK_REFRESH, ORGANIZER_images_folder()&"\Actualiser.ico", 16)
				If $ORGANIZER_dock_position <> "" Then ORGANIZER_refreshDock()
				$focus = 0
				_TrayTip($TRAY, "", "")
				$nShortcuts = startShortcuts()
				ORGANIZER_displayTray_traytip(False, $nShortcuts, $ORGANIZER_fenetres)
			Case $TRAY_config
				$config = True
			Case $DOCK_QUIT_OR_CONFIG
				GUISwitch($DOCK_GUI)
				Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
				Local $item_config = _GUICtrlCreateODMenuItem(translate("main_configure"), $context)
				_GUICtrlODMenuItemSetIcon($item_config, ORGANIZER_images_folder()&"\Configurer.ico")
				Local $item_quit = _GUICtrlCreateODMenuItem(translate("main_quit"), $context)
				_GUICtrlODMenuItemSetIcon($item_quit, ORGANIZER_images_folder()&"\Sortir.ico")
				Local $item_separator1 = _GUICtrlCreateODMenuItem("", $context)
				Local $menu_dock = _GUICtrlCreateODMenu(translate("displayTray_dock"), $context)
				Local $directions = StringSplit("NW|W|SW|NE|E|SE","|"), $items_dock[$directions[0]+1] = [$directions[0]]
;~ 				Local $directions = StringSplit("NW|W|SW|NE|E|SE|N|S","|"), $items_dock[$directions[0]+1] = [$directions[0]]
				For $i = 1 To $directions[0]
					$items_dock[$i] = _GUICtrlCreateODMenuItem(translate("displayGUI_dock_"&$directions[$i]), $menu_dock)
				Next
				Local $item_separator2 = _GUICtrlCreateODMenuItem("", $menu_dock) _
					, $item_dock = _GUICtrlCreateODMenuItem(translate("displayTray_dockKO"), $menu_dock)
				_GUICtrlODMenuItemSetIcon($item_dock, ORGANIZER_images_folder()&"\Quitter.ico")
				For $i = 1 To $items_dock[0]
					_GUICtrlSetState($items_dock[$i], $ORGANIZER_dock_position=$directions[$i] ? 0x01 : 0x04) ; $GUI_CHECKED = 0x01 ; $GUI_UNCHECKED = 0x04
				Next
				; Affichage
				sousmenu($DOCK_GUI, $DOCK_QUIT_OR_CONFIG, $context)
				Local $timer = TimerInit()
				Do
;~ 					Sleep(20)
					Local $submsg = GUIGetMsg()
				Until $submsg > 0 Or TimerDiff($timer) > 250
				; Traitement
				If $submsg = 0 Then
					; Rien
				ElseIf $submsg = $item_quit Then
					$quit = True
				ElseIf $submsg = $item_config Then
					$config = True
				ElseIf $submsg = $item_dock Then
					$ORGANIZER_dock_position = ""
					For $i = 1 To $DOCK_ICONES[0]
						If $DOCK_ICONES[$i] <> 0 Then GUICtrlDelete($DOCK_ICONES[$i])
					Next
					GUICtrlDelete($DOCK_QUIT_OR_CONFIG)
					GUICtrlDelete($DOCK_REFRESH)
					GUIDelete($DOCK_GUI)
				Else
					For $i = 1 To $items_dock[0]
						If $submsg = $items_dock[$i] Then
							$ORGANIZER_dock_position = $directions[$i]
							GUISetState(@SW_HIDE, $DOCK_GUI)
							ExitLoop
						EndIf
					Next
				EndIf
				; Destruction
				For $i = 1 To $items_dock[0]
					_GUICtrlODMenuItemDelete($items_dock[$i])
				Next
				_GUICtrlODMenuItemDelete($item_dock)
				_GUICtrlODMenuItemDelete($item_separator1)
				_GUICtrlODMenuItemDelete($item_separator2)
				_GUICtrlODMenuItemDelete($menu_dock)
				_GUICtrlODMenuItemDelete($item_config)
				_GUICtrlODMenuItemDelete($item_quit)
				GUICtrlDelete($context)
				GUICtrlDelete($dummy)
			Case $TRAY_quit
				$quit = True
			Case Else
				For $i = 1 To $DOCK_ICONES[0]
					If $msg = $DOCK_ICONES[$i] Then
						Local $timer = TimerInit(), $handle = fenetre_handle($ORGANIZER_fenetres[$i]), $cursor = 0, $info = GUIGetCursorInfo($DOCK_GUI)
						If Not @error Then $cursor = $info
						ORGANIZER_WinActivate($handle, "ANIMATED")
						ORGANIZER_MoveDockToHandle($handle, $cursor)
						_GUICtrlSetState($DOCK_ICONES[$i], 0x300) ; $GUI_FOCUS = 0x100 ; $GUI_DEFBUTTON = 0x200
						$focus = $i
						ExitLoop
					EndIf
				Next
		EndSwitch
		; Traitement répété (toutes les 100ms)
		Local $q = 10*@SEC + Floor(@MSEC/100)
		If $quantum <> $q Then
			$quantum = $q
			; Mise à jour du focus
			If $ORGANIZER_dock_position <> "" Then
				Local $found = 0, $active = WinGetHandle("[ACTIVE]")
				If $active = $DOCK_GUI Then
					$found = -1
				Else
					For $i = 1 To $ORGANIZER_fenetres[0]
						If fenetre_handle($ORGANIZER_fenetres[$i]) = $active Then
							$found = $i
							ExitLoop
						EndIf
					Next
				EndIf
				If $focus <> $found Then
					$focus = $found
					If $focus = 0 Then
						GUISetState(@SW_HIDE, $DOCK_GUI)
					Else
						GUISetState(@SW_SHOWNOACTIVATE, $DOCK_GUI)
						If $focus > 0 Then
							ORGANIZER_WinActivate($active)
							_GUICtrlSetState($DOCK_ICONES[$focus], 0x300) ; $GUI_FOCUS = 0x100 ; $GUI_DEFBUTTON = 0x200
						EndIf
					EndIf
				EndIf
				If $focus > 0 Then
					ORGANIZER_MoveDockToHandle(fenetre_handle($ORGANIZER_fenetres[$focus]))
				ElseIf $focus = 0 Then
					ORGANIZER_MoveDockToHandle()
				EndIf
			EndIf
			; Mise à jour de l'avertissement
			If $warn Then
				If $ORGANIZER_dock_position <> "" Then
					_GUICtrlSetImage($DOCK_REFRESH, (Mod($quantum/3,2) ? ORGANIZER_images_folder()&"\Actualiser.ico" : ORGANIZER_images_folder()&"\Rien.ico"), 16)
					_TrayIconSetIcon($TRAY, (Mod($quantum/3,2) ? @ScriptFullPath : ORGANIZER_images_folder()&"\Rien.ico"))
				EndIf
			Else
				Local $list = ORGANIZER_getWinList(False)
				$warn = $list[0] <> $ORGANIZER_fenetres[0]
				If $warn Then
					GUICtrlSetTip($DOCK_REFRESH, translate("dock_REFRESH_tooltip_warning"), translate("main_refreshsort"), 2)
					_TrayIconSetToolTip($TRAY, translate("tray_refresh_warning", field("name")&" v"&field("version")))
				EndIf
			EndIf
		EndIf
	Until $quit Or $config
	If $ORGANIZER_dock_position <> "" Then
		For $i = 1 To $DOCK_ICONES[0]
			If $DOCK_ICONES[$i] <> 0 Then GUICtrlDelete($DOCK_ICONES[$i])
		Next
		GUICtrlDelete($DOCK_QUIT_OR_CONFIG)
		GUICtrlDelete($DOCK_REFRESH)
		GUIDelete($DOCK_GUI)
	EndIf
	; Destruction des éléments graphiques
	_TrayDeleteItem($TRAY_about)
	_TrayDeleteItem($TRAY_separator1)
	_TrayDeleteItem($TRAY_refresh)
	_TrayDeleteItem($TRAY_config)
	_TrayDeleteItem($TRAY_separator2)
	_TrayDeleteItem($TRAY_quit)
	_TrayDeleteItem($TRAY_context)
	_TrayIconDelete($TRAY)
	; Désactivation des raccourcis
	stopShortcuts()
	Return ($quit?"QUIT":"CONFIG")
EndFunc

Func ORGANIZER_displayTray_traytip($about, $nShortcuts, $windows, $timeout=5)
	Local $count = $nShortcuts+$windows[0]
	Local $text1 = translate($count=0 ? "displayTray_element_0" : $count=1 ? "displayTray_element_1" : "displayTray_element_N", $count)
	Local $text2 = @CRLF & @CRLF & translate("displayTray_info")
	If $nShortcuts+$windows[0] <> 0 Then
		$text1 = $text1 & " (" _
			& translate($windows[0]=0 ? "displayTray_window_0"   : $windows[0]=1 ? "displayTray_window_1"   : "displayTray_window_N",   $windows[0]) & ", " _
			& translate($nShortcuts=0 ? "displayTray_shortcut_0" : $nShortcuts=1 ? "displayTray_shortcut_1" : "displayTray_shortcut_N", $nShortcuts) & ")"
		If $windows[0] > 0 Then
			$text1 = $text1 & " :"
			For $i = 1 To $windows[0]
				$text1 = $text1 & ($i<>1 ? ", " : @CRLF) & """"&fenetre_alias($windows[$i])&""""
			Next
		EndIf
	EndIf
	Local $size = StringLen($text1)+StringLen($text2), $text = $text1&$text2, $etc = " ..."
	If $size > 255 Then $text = StringLeft($text1, 255-StringLen($etc)-StringLen($text2))&$etc&$text2
	_TrayTip($TRAY, field("name")&" v"&field("version")&($about?" - "&translate("main_about"):""), $text, $timeout, 4)
EndFunc

Func startShortcuts()
	Return modifyShortcuts(True)
EndFunc

Func stopShortcuts()
	Return modifyShortcuts(False)
EndFunc

Func modifyShortcuts($flag)
	Local $resultat = 0
	Local $shortcut = $ORGANIZER_commandes[1], $test = shortcut_toString($shortcut)
	If Not @error Then
		If $flag Then
			HotKeySet($shortcut, "ORGANIZER_detectShortcut_previous")
		Else
			HotKeySet($shortcut)
		EndIf
		$resultat = $resultat+1
	EndIf
	Local $shortcut = $ORGANIZER_commandes[2], $test = shortcut_toString($shortcut)
	If Not @error Then
		If $flag Then
			HotKeySet($shortcut, "ORGANIZER_detectShortcut_next")
		Else
			HotKeySet($shortcut)
		EndIf
		$resultat = $resultat+1
	EndIf
	For $i = 1 To $ORGANIZER_fenetres[0]
		Local $shortcut = fenetre_shortcut($ORGANIZER_fenetres[$i]), $test = shortcut_toString($shortcut)
		If Not @error Then
			If $flag Then
				HotKeySet($shortcut, "ORGANIZER_detectShortcut")
			Else
				HotKeySet($shortcut)
			EndIf
			$resultat = $resultat+1
		EndIf
	Next
	Return $resultat
EndFunc

; ### Region Configuration du programme

Func ORGANIZER_displayGUI()
	; Initialisation
	Global $ORGANIZER_fenetres[1] = [0] _
		, $ORGANIZER_dock_position       = checkPosition(IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Dock", ""))  _
		, $ORGANIZER_dock_thumbnails     = (IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Thumbnails",  "N") = "Y") _
		, $ORGANIZER_cursorcycle_enabled = (IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "CycleCursor", "Y") = "Y")
	Global $ORGANIZER_commandes[3] = [2 _
		, IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Previous", "") _
		, IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Next",     "") _
	]
	; Interface
	Global $ORGANIZER_GUI_size[2] = [340, 225]
	Global $ORGANIZER_GUI_position[2] = [ _
		Number(IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "PositionX", (@DesktopWidth  - $ORGANIZER_GUI_size[0])/2)), _
		Number(IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "PositionY", (@DesktopHeight - $ORGANIZER_GUI_size[1])/2))  _
	]
	Global $ORGANIZER_GUI = GUICreate(field("name")&" v"&field("version"), $ORGANIZER_GUI_size[0], $ORGANIZER_GUI_size[1], $ORGANIZER_GUI_position[0], $ORGANIZER_GUI_position[1], 0x80800000, 0x00000010) ; $WS_POPUP = 0x80000000 ; $WS_BORDER = 0x00800000 ; $WS_EX_ACCEPTFILES = 0x00000010
	GUISetIcon(@ScriptFullPath, Default, $ORGANIZER_GUI)
	; Eléments principaux
	Global $ORGANIZER_permuter = GUICtrlCreateButton("", 10, 10, 25, 25)
	Global $ORGANIZER_titre = GUICtrlCreateLabel(field("name")&" v"&field("version"), 45, 10, $ORGANIZER_GUI_size[0]-90, 25)
	Global $ORGANIZER_quitter = GUICtrlCreateButton("", $ORGANIZER_GUI_size[0]-35, 10, 25, 25)
	; Habillage
	GUICtrlSetStyle($ORGANIZER_permuter, 0x40) ; $BS_ICON = 0x40
	_GUICtrlSetImage($ORGANIZER_permuter, ORGANIZER_images_folder()&"\Configurer.ico", 16)
	GUICtrlSetStyle($ORGANIZER_titre,   0x0101) ; $SS_NOTIFY = 0x0100 ; $SS_CENTER = 0x0001
	GUICtrlSetStyle($ORGANIZER_quitter, 0x40) ; $BS_ICON = 0x40
	_GUICtrlSetImage($ORGANIZER_quitter, ORGANIZER_images_folder()&"\Quitter.ico", 16)
	GUICtrlSetBkColor($ORGANIZER_titre, -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetFont($ORGANIZER_titre,    15, 700)
	; Eléments spécifiques
	Global $elements[$ORGANIZER_fenetres[0]+1] = [$ORGANIZER_fenetres[0]]
	Global $ORGANIZER_icons = $elements, $ORGANIZER_labels = $elements, $ORGANIZER_inputs = $elements, $ORGANIZER_buttons = $elements, $ORGANIZER_checkboxes = $elements
	Global $ORGANIZER_nothing = GUICtrlCreateLabel(translate("displayGUI_nowindow"), 10, 48, $ORGANIZER_GUI_size[0]-20, 20, 0x0001) ; $SS_CENTER = 0x0001
	Global $ORGANIZER_icons_header      = GUICtrlCreateLabel("",                                  10-5, 50,  20+10, 18, 0x0001) ; $SS_CENTER = 0x0001
	Global $ORGANIZER_labels_header     = GUICtrlCreateLabel(translate("displayGUI_personnage"),  40-5, 50, 105+10, 18, 0x0001) ; $SS_CENTER = 0x0001
	Global $ORGANIZER_inputs_header     = GUICtrlCreateLabel(translate("displayGUI_initiative"), 155-5, 50,  55+10, 18, 0x0001) ; $SS_CENTER = 0x0001
	Global $ORGANIZER_buttons_header    = GUICtrlCreateLabel(translate("displayGUI_raccourci"),  220-5, 50,  80+10, 18, 0x0001) ; $SS_CENTER = 0x0001
	Global $ORGANIZER_checkboxes_header = GUICtrlCreateLabel("",                                 310-5, 50,  20+10, 18, 0x0001) ; $SS_CENTER = 0x0001
	; Habillage
	GUICtrlSetFont($ORGANIZER_icons_header,      9, Default, 0x04) ; $GUI_FONTUNDER = 0x04
	GUICtrlSetFont($ORGANIZER_labels_header,     9, Default, 0x04) ; $GUI_FONTUNDER = 0x04
	GUICtrlSetFont($ORGANIZER_inputs_header,     9, Default, 0x04) ; $GUI_FONTUNDER = 0x04
	GUICtrlSetFont($ORGANIZER_buttons_header,    9, Default, 0x04) ; $GUI_FONTUNDER = 0x04
	GUICtrlSetFont($ORGANIZER_checkboxes_header, 9, Default, 0x04) ; $GUI_FONTUNDER = 0x04
	GUICtrlSetBkColor($ORGANIZER_icons_header,              -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetBkColor($ORGANIZER_labels_header,             -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetBkColor($ORGANIZER_inputs_header,             -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetBkColor($ORGANIZER_buttons_header,            -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetBkColor($ORGANIZER_checkboxes_header,         -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
	GUICtrlSetState($ORGANIZER_nothing,                   0x10) ; $GUI_SHOW = 0x10
	GUICtrlSetState($ORGANIZER_icons_header,              0x20) ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_labels_header,             0x20) ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_inputs_header,             0x20) ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_buttons_header,            0x20) ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_checkboxes_header,         0x20) ; $GUI_HIDE = 0x20
	; Eléments communs
	Global $ORGANIZER_buttonPrevious = GUICtrlCreateButton("",                                      10, $ORGANIZER_GUI_size[1]-150, $ORGANIZER_GUI_size[0]/2-15, 25)
	Global $ORGANIZER_buttonNext     = GUICtrlCreateButton("",              $ORGANIZER_GUI_size[0]/2+5, $ORGANIZER_GUI_size[1]-150, $ORGANIZER_GUI_size[0]/2-15, 25)
	Global $ORGANIZER_buttonRefresh  = GUICtrlCreateButton(" "&translate("displayGUI_inprogress"),  10, $ORGANIZER_GUI_size[1]-120,   $ORGANIZER_GUI_size[0]-20, 25)
	Global $ORGANIZER_separator      = GUICtrlCreateLabel("",                                       10,  $ORGANIZER_GUI_size[1]-85,   $ORGANIZER_GUI_size[0]-20,  1)
	Global $ORGANIZER_labelDock      = GUICtrlCreateLabel(translate("displayGUI_dock")&" :",        10,  $ORGANIZER_GUI_size[1]-73,                         110, 20)
	Global $ORGANIZER_fieldDock      = GUICtrlCreateInput("",                                      125,  $ORGANIZER_GUI_size[1]-75,  $ORGANIZER_GUI_size[0]-165, 20)
	Global $ORGANIZER_buttonDock     = GUICtrlCreateButton("...",            $ORGANIZER_GUI_size[0]-30,  $ORGANIZER_GUI_size[1]-75,                          20, 20)
	Global $ORGANIZER_editInfos      = GUICtrlCreateEdit("",                                        10,  $ORGANIZER_GUI_size[1]-45,   $ORGANIZER_GUI_size[0]-20, 35)
	GUICtrlSetStyle($ORGANIZER_editInfos,   0x0801) ; $ES_READONLY = 0x0800 ; $ES_CENTER = 0x0001
	GUICtrlSetStyle($ORGANIZER_fieldDock,   0x0801) ; $ES_READONLY = 0x0800 ; $ES_CENTER = 0x0001
	GUICtrlSetBkColor($ORGANIZER_editInfos, 0xFFFFFF)
	GUICtrlSetBkColor($ORGANIZER_fieldDock, 0xFFFFFF)
	GUICtrlSetFont($ORGANIZER_editInfos,    7, 400, 2)
	GUICtrlSetData($ORGANIZER_editInfos,    translate("displayGUI_infos"))
	; Habillage
	GUICtrlSetData($ORGANIZER_buttonPrevious,   " "&shortcut_toString($ORGANIZER_commandes[1], 2))
	GUICtrlSetData($ORGANIZER_buttonNext,       " "&shortcut_toString($ORGANIZER_commandes[2], 2))
	GUICtrlSetData($ORGANIZER_fieldDock,        " "&translate("displayGUI_dockKO"))
	If $ORGANIZER_dock_position <> "" Then GUICtrlSetData($ORGANIZER_fieldDock, " "&translate("displayGUI_dockOK", StringLower(translate("displayGUI_dock_"&$ORGANIZER_dock_position))))
	_GUICtrlSetImage($ORGANIZER_buttonPrevious, ORGANIZER_images_folder()&"\Gauche.ico",     16)
	_GUICtrlSetImage($ORGANIZER_buttonNext,     ORGANIZER_images_folder()&"\Droite.ico",     16)
	_GUICtrlSetImage($ORGANIZER_buttonRefresh,  ORGANIZER_images_folder()&"\Actualiser.ico", 16)
	If $ORGANIZER_commandes[1] <> "" Then GUICtrlSetFont($ORGANIZER_buttonPrevious, Default, 700)
	If $ORGANIZER_commandes[2] <> "" Then GUICtrlSetFont($ORGANIZER_buttonNext,     Default, 700)
	GUICtrlSetBkColor($ORGANIZER_separator, 0x000000)
	If FileExists(NAIO_images_folder()&"\Langues\"&ORGANIZER_language()&".ico") Then _GUICtrlSetImage($ORGANIZER_permuter, NAIO_images_folder()&"\Langues\"&ORGANIZER_language()&".ico", 16)
	; Positionnement
	GUICtrlSetResizing($ORGANIZER_permuter,          0x0102 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_titre,             0x0006 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_quitter,           0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_nothing,           0x0006 + 0x0060) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKBOTTOM = 0x0040
	GUICtrlSetResizing($ORGANIZER_icons_header,      0x0102 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_labels_header,     0x0006 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_inputs_header,     0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_buttons_header,    0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_checkboxes_header, 0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKTOP    = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_buttonPrevious,    0x000A + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKHCENTER = 0x0008 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_buttonNext,        0x000C + 0x0240) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKHCENTER = 0x0008 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_separator,         0x0006 + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_buttonRefresh,     0x0006 + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_labelDock,         0x0102 + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_fieldDock,         0x0006 + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_buttonDock,        0x0104 + 0x0240) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH   = 0x0100 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	GUICtrlSetResizing($ORGANIZER_editInfos,         0x0006 + 0x0240) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT   = 0x0004 ; $GUI_DOCKBOTTOM = 0x0040 ; $GUI_DOCKHEIGHT = 0x0200
	; Affichage
	GUISetState(@SW_SHOW, $ORGANIZER_GUI)
	; Première mise à jour
	GUISetState(@SW_DISABLE, $ORGANIZER_GUI)
	ORGANIZER_refresh(False)
	GUICtrlSetData($ORGANIZER_buttonRefresh, " "&translate("displayGUI_refreshsort"))
	GUISetState(@SW_ENABLE, $ORGANIZER_GUI)
	WinActivate($ORGANIZER_GUI)
	; Traitement
	Local $quit = False, $warn = False, $activate = False, $focus = 0
	registerMsg_ORGANIZER()
	Do
		; Focus
		If $focus <> WinGetHandle("[ACTIVE]") Then
			$focus = WinGetHandle("[ACTIVE]")
			ToolTip("")
		EndIf
;~ 		Sleep(20)
		Local $msg = ORGANIZER_msg(0)
		If $msg = 0 Then
			$msg = GUIGetMsg()
		EndIf
		If $msg = 0 Then
			Local $message = MailSlot_Read($MAILSLOT_COMMAND)
			Switch $message
				Case "@quit"
					$quit = True
			EndSwitch
		EndIf
		Switch $msg
			Case 0
				For $i = 1 To $ORGANIZER_fenetres[0]
					Local $valeur = Number(GUICtrlRead($ORGANIZER_inputs[$i]))
					If fenetre_order($ORGANIZER_fenetres[$i]) <> $valeur Then fenetre_order($ORGANIZER_fenetres[$i], $valeur)
				Next
			Case -3, $ORGANIZER_quitter ; $GUI_EVENT_CLOSE = -3
				GUISwitch($ORGANIZER_GUI)
				Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
				Local $item_activate = _GUICtrlCreateODMenuItem(translate("displayGUI_menu_activate"), $context)
				Local $item_quit     = _GUICtrlCreateODMenuItem(translate("displayGUI_menu_quit"),     $context)
				_GUICtrlODMenuItemSetIcon($item_activate, ORGANIZER_images_folder()&"\Activer.ico")
				_GUICtrlODMenuItemSetIcon($item_quit,     ORGANIZER_images_folder()&"\Sortir.ico")
				; Affichage
				sousmenu($ORGANIZER_GUI, $ORGANIZER_quitter, $context)
				Local $timer = TimerInit()
				Do
;~ 					Sleep(20)
					Local $submsg = GUIGetMsg()
				Until $submsg > 0 Or TimerDiff($timer) > 250
				; Traitement
				If $submsg = 0 Then
					; Rien
				ElseIf $submsg = $item_activate Then
					$activate = True
				ElseIf $submsg = $item_quit Then
					$quit = True
				EndIf
				; Destruction
				_GUICtrlODMenuItemDelete($item_activate)
				_GUICtrlODMenuItemDelete($item_quit)
				GUICtrlDelete($context)
				GUICtrlDelete($dummy)
			Case -10 ; $GUI_EVENT_SECONDARYDOWN = -9 ; $GUI_EVENT_SECONDARYUP = -10
				Local $info = GUIGetCursorInfo($ORGANIZER_GUI)
				If Not @error And _GUICtrlGetState($info[4], 0x40) Then ; $GUI_ENABLE = 0x40
					Switch $info[4]
						Case 0
							; Rien
						Case $ORGANIZER_buttonPrevious, $ORGANIZER_buttonNext
							Local $index = ($info[4]=$ORGANIZER_buttonPrevious?1:2)
							GUISwitch($ORGANIZER_GUI)
							Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
							Local $item_remove = _GUICtrlCreateODMenuItem(translate("displayGUI_shortcut_remove"), $context)
							_GUICtrlODMenuItemSetIcon($item_remove, ORGANIZER_images_folder()&"\Sortir.ico")
							; Affichage
							sousmenu($ORGANIZER_GUI, $info[4], $context)
							Local $timer = TimerInit()
							Do
;~ 								Sleep(20)
								Local $submsg = GUIGetMsg()
							Until $submsg > 0 Or TimerDiff($timer) > 250
							; Traitement
							If $submsg = 0 Then
								; Rien
							ElseIf $submsg = $item_remove Then
								Local $shortcut = ""
								$ORGANIZER_commandes[$index] = $shortcut
								GUICtrlSetData($info[4], " "&shortcut_toString($shortcut, 2))
								GUICtrlSetFont($info[4], Default, 400)
							EndIf
							; Destruction
							_GUICtrlODMenuItemDelete($item_remove)
							GUICtrlDelete($context)
							GUICtrlDelete($dummy)
						Case Else
							For $i = 1 To $ORGANIZER_fenetres[0]
								If $info[4] = $ORGANIZER_buttons[$i] Then
									GUISwitch($ORGANIZER_GUI)
									Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
									Local $item_remove = _GUICtrlCreateODMenuItem(translate("displayGUI_shortcut_remove"), $context)
									_GUICtrlODMenuItemSetIcon($item_remove, ORGANIZER_images_folder()&"\Sortir.ico")
									; Affichage
									sousmenu($ORGANIZER_GUI, $info[4], $context)
									Local $timer = TimerInit()
									Do
;~ 										Sleep(20)
										Local $submsg = GUIGetMsg()
									Until $submsg > 0 Or TimerDiff($timer) > 250
									; Traitement
									If $submsg = 0 Then
										; Rien
									ElseIf $submsg = $item_remove Then
										Local $shortcut = ""
										fenetre_shortcut($ORGANIZER_fenetres[$i], $shortcut)
										GUICtrlSetData($info[4], shortcut_toString($shortcut, 1))
										GUICtrlSetFont($info[4], Default, 400)
									EndIf
									; Destruction
									_GUICtrlODMenuItemDelete($item_remove)
									GUICtrlDelete($context)
									GUICtrlDelete($dummy)
								EndIf
							Next
					EndSwitch
				EndIf
			Case $ORGANIZER_titre
				ToolTip("")
				_SendMessage($ORGANIZER_GUI, 0x0112, 0xF012, 0) ; $WM_SYSCOMMAND = 0x0112
				WinActivate($ORGANIZER_GUI)
				Local $position = WinGetPos($ORGANIZER_GUI)
				If Not @error Then
					$ORGANIZER_GUI_position[0] = $position[0]
					$ORGANIZER_GUI_position[1] = $position[1]
				EndIf
			Case $ORGANIZER_permuter
				GUISwitch($ORGANIZER_GUI)
				Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
				; Langues
				Local $languages_menu = _GUICtrlCreateODMenu(translate("main_language")&" :", $context)
				Local $languages = ORGANIZER_languages(), $languages_items[$languages[0][0]+1] = [$languages[0][0]]
				For $i = 1 To $languages_items[0]
					$languages_items[$i] = _GUICtrlCreateODMenuItem($languages[$i][1], $languages_menu)
					_GUICtrlODMenuItemSetIcon($languages_items[$i], NAIO_images_folder()&"\Langues\"&$languages[$i][0]&".ico")
					_GUICtrlSetState($languages_items[$i], $languages[$i][2] ? 0x40 : 0x80) ; $GUI_ENABLE = 0x40 ; $GUI_DISABLE = 0x80
					If $languages[$i][0] = ORGANIZER_language() Then _GUICtrlSetState($languages_items[$i], 0x200) ; $GUI_DEFBUTTON = 0x200
				Next
				; Profils
				Local $profils_menu = _GUICtrlCreateODMenu(translate("main_profil")&" :", $context)
				Local $profils = ORGANIZER_profils(), $profils_items[$profils[0][0]+1] = [$profils[0][0]], $profils_separator = 0
				For $i = 1 To $profils_items[0]
					If $i = 2 Then $profils_separator = _GUICtrlCreateODMenuItem("", $profils_menu) ; Séparateur
					$profils_items[$i] = _GUICtrlCreateODMenuItem(translate("main_profil_X", $profils[$i][0]), $profils_menu)
					If $profils[$i][1] Then
						_GUICtrlODMenuItemSetText($profils_items[$i], translate("main_noprofil"))
					ElseIf $profils[$i][2] <> "" Then
						_GUICtrlODMenuItemSetText($profils_items[$i], $profils[$i][2])
					EndIf
					Local $icone = NAIO_images_folder()&"\Profils\"&$profils[$i][3]&".ico"
					If $profils[$i][3] <> "" And FileExists($icone) Then _GUICtrlODMenuItemSetIcon($profils_items[$i], $icone)
					If $profils[$i][0] = ORGANIZER_profil() Then _GUICtrlSetState($profils_items[$i], 0x200) ; $GUI_DEFBUTTON = 0x200
				Next
				; Affichage
				sousmenu($ORGANIZER_GUI, $ORGANIZER_permuter, $context)
				Local $timer = TimerInit()
				Do
;~ 					Sleep(20)
					Local $submsg = GUIGetMsg()
				Until $submsg > 0 Or TimerDiff($timer) > 250
				; Traitement
				If $submsg = 0 Then
					; Rien
				Else
					For $i = 1 To $languages_items[0]
						If $submsg = $languages_items[$i] Then
							If $languages[$i][0] <> ORGANIZER_language() Then
								GUISetState(@SW_LOCK, $ORGANIZER_GUI)
								Local $reponse = MsgBox(4+48, field("name")&" v"&field("version"), translate("message_languages", $languages[$i][1])) ; $MB_YESNO = 4 ; $MB_ICONWARNING = 48
								If $reponse = 6 Then ; $IDYES = 6
									IniWrite(ORGANIZER_config_file(), ORGANIZER_profil(), "Language", $languages[$i][0])
									ORGANIZER_restart(True)
									$quit = True
								EndIf
								GUISetState(@SW_UNLOCK, $ORGANIZER_GUI)
							EndIf
							ExitLoop
						EndIf
					Next
					For $i = 1 To $profils_items[0]
						If $submsg = $profils_items[$i] Then
							If $profils[$i][0] <> ORGANIZER_profil() Then
								GUISetState(@SW_LOCK, $ORGANIZER_GUI)
								Local $name = translate("main_profil_X", $profils[$i][0])
								If $profils[$i][1] Then
									$name = translate("main_noprofil")
								ElseIf $profils[$i][2] <> "" Then
									$name = $profils[$i][2]
								EndIf
								Local $reponse = MsgBox(4+48, field("name")&" v"&field("version"), translate("message_profils", $name)) ; $MB_YESNO = 4 ; $MB_ICONWARNING = 48
								If $reponse = 6 Then ; $IDYES = 6
									ORGANIZER_profil_restart($profils[$i][0])
									ORGANIZER_restart(True)
									$quit = True
								EndIf
								GUISetState(@SW_UNLOCK, $ORGANIZER_GUI)
							EndIf
							ExitLoop
						EndIf
					Next
				EndIf
				; Destruction
				For $i = 1 To $profils_items[0]
					_GUICtrlODMenuItemDelete($profils_items[$i])
				Next
				For $i = 1 To $languages_items[0]
					_GUICtrlODMenuItemDelete($languages_items[$i])
				Next
				If $profils_separator <> 0 Then _GUICtrlODMenuItemDelete($profils_separator)
				_GUICtrlODMenuItemDelete($profils_menu)
				_GUICtrlODMenuItemDelete($languages_menu)
				GUICtrlDelete($context)
				GUICtrlDelete($dummy)
			Case $ORGANIZER_buttonPrevious, $ORGANIZER_buttonNext
				Local $index = ($msg=$ORGANIZER_buttonPrevious?1:2)
				unregisterMsg_ORGANIZER()
				Local $shortcut = ORGANIZER_catchShortcut($ORGANIZER_commandes[$index])
				If Not @error Then
					$ORGANIZER_commandes[$index] = $shortcut
					GUICtrlSetData($msg, " "&shortcut_toString($shortcut, 2))
					GUICtrlSetFont($msg, Default, $shortcut<>""?700:0)
				EndIf
				registerMsg_ORGANIZER()
			Case $ORGANIZER_buttonRefresh
				unregisterMsg_ORGANIZER()
				Local $text = GUICtrlRead($ORGANIZER_buttonRefresh)
				GUISetState(@SW_DISABLE, $ORGANIZER_GUI)
				GUICtrlSetData($ORGANIZER_buttonRefresh, " "&translate("displayGUI_inprogress"))
				ORGANIZER_refresh()
				GUICtrlSetData($ORGANIZER_buttonRefresh, $text)
				GUISetState(@SW_ENABLE, $ORGANIZER_GUI)
				WinActivate($ORGANIZER_GUI)
				registerMsg_ORGANIZER()
			Case $ORGANIZER_buttonDock
				GUISwitch($ORGANIZER_GUI)
				Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy)
				Local $item_KO = _GUICtrlCreateODMenuItem(translate("displayGUI_dockKO"), $context)
				_GUICtrlODMenuItemSetIcon($item_KO, ORGANIZER_images_folder()&"\Sortir.ico")
				Local $item_OK = _GUICtrlCreateODMenu(translate("displayGUI_dockOK", "..."), $context)
				_GUICtrlODMenuItemSetIcon($item_OK, ORGANIZER_images_folder()&"\Activer.ico")
				Local $directions = StringSplit("NW|W|SW|NE|E|SE","|"), $items_OK[$directions[0]+1] = [$directions[0]]
;~ 				Local $directions = StringSplit("NW|W|SW|NE|E|SE|N|S","|"), $items_OK[$directions[0]+1] = [$directions[0]]
				For $i = 1 To $directions[0]
					$items_OK[$i] = _GUICtrlCreateODMenuItem(translate("displayGUI_dock_"&$directions[$i]), $item_OK)
				Next
				Local $item_OK_separator = _GUICtrlCreateODMenuItem("", $item_OK) _
					, $item_OK_thumbnails_KO = _GUICtrlCreateODMenuItem(translate("displayGUI_dock_thumbnails_KO"), $item_OK) _
					, $item_OK_thumbnails_OK = _GUICtrlCreateODMenuItem(translate("displayGUI_dock_thumbnails_OK"), $item_OK)
				For $i = 1 To $items_OK[0]
					_GUICtrlSetState($items_OK[$i], $ORGANIZER_dock_position=$directions[$i] ? 0x01 : 0x04) ; $GUI_CHECKED = 0x01 ; $GUI_UNCHECKED = 0x04
				Next
				_GUICtrlSetState($item_OK_thumbnails_KO, $ORGANIZER_dock_thumbnails ? 0x04 : 0x01) ; $GUI_UNCHECKED = 0x04 ; $GUI_CHECKED = 0x01
				_GUICtrlSetState($item_OK_thumbnails_OK, $ORGANIZER_dock_thumbnails ? 0x01 : 0x04) ; $GUI_CHECKED = 0x01 ; $GUI_UNCHECKED = 0x04
				; [ A implémenter, $GUI_DISABLE en attendant ]
				_GUICtrlSetState($item_OK_thumbnails_OK, 0x80) ; $GUI_DISABLE = 0x80
				; Affichage
				sousmenu($ORGANIZER_GUI, $ORGANIZER_buttonDock, $context)
				Local $timer = TimerInit()
				Do
;~ 					Sleep(20)
					Local $submsg = GUIGetMsg()
				Until $submsg > 0 Or TimerDiff($timer) > 250
				; Traitement
				If $submsg = 0 Then
					; Rien
				ElseIf $submsg = $item_KO Then
					$ORGANIZER_dock_position = ""
					GUICtrlSetData($ORGANIZER_fieldDock, " "&translate("displayGUI_dockKO"))
				ElseIf $submsg = $item_OK_thumbnails_KO Then
					$ORGANIZER_dock_thumbnails = False
				ElseIf $submsg = $item_OK_thumbnails_OK Then
					$ORGANIZER_dock_thumbnails = True
				Else
					For $i = 1 To $items_OK[0]
						If $submsg = $items_OK[$i] Then
							$ORGANIZER_dock_position = $directions[$i]
							GUICtrlSetData($ORGANIZER_fieldDock, " "&translate("displayGUI_dockOK", StringLower(translate("displayGUI_dock_"&$ORGANIZER_dock_position))))
							ExitLoop
						EndIf
					Next
				EndIf
				; Destruction
				For $i = 1 To $items_OK[0]
					_GUICtrlODMenuItemDelete($items_OK[$i])
				Next
				_GUICtrlODMenuItemDelete($item_OK_separator)
				_GUICtrlODMenuItemDelete($item_OK_thumbnails_KO)
				_GUICtrlODMenuItemDelete($item_OK_thumbnails_OK)
				_GUICtrlODMenuItemDelete($item_OK)
				_GUICtrlODMenuItemDelete($item_KO)
				GUICtrlDelete($context)
				GUICtrlDelete($dummy)
			Case Else
				; Boutons des fenêtres
				For $i = 1 To $ORGANIZER_fenetres[0]
					Local $window = $ORGANIZER_fenetres[$i]
					Switch $msg
						Case $ORGANIZER_icons[$i]
							unregisterMsg_ORGANIZER()
							Local $avatars = NAIO_avatars()
							If $avatars[0][0] > 0 Then
								; Implémentation
								Local $avatars_menuitems[$avatars[0][0]+1] = [$avatars[0][0]], $avatars_menus[1] = [0], $avatars_actualMenu[2] = [0,""]
								; Création des menus
								Local $dummy = GUICtrlCreateDummy(), $context = GUICtrlCreateContextMenu($dummy), $separator = 0, $erase_item = 0
								; Traitement des comptes
								For $j = 1 To $avatars[0][0]
									Local $valeurs = StringSplit($avatars[$j][0], "\")
									If Not @error And $valeurs[0] = 2 Then
										If $avatars_actualMenu[0] = 0 Or $avatars_actualMenu[1] <> $valeurs[1] Then
											Local $text = StringRegExpReplace($valeurs[1], "^\d+\s+-\s+", "")
											Local $menu = _GUICtrlCreateODMenu($text, $context)
											$avatars_menus[0] = $avatars_menus[0]+1
											ReDim $avatars_menus[$avatars_menus[0]+1]
											$avatars_menus[$avatars_menus[0]] = $menu
											$avatars_actualMenu[0] = $menu
											$avatars_actualMenu[1] = $valeurs[1]
										EndIf
										$avatars_menuitems[$j] = _GUICtrlCreateODMenuItem($valeurs[2], $avatars_actualMenu[0])
										_GUICtrlODMenuItemSetIcon($avatars_menuitems[$j], $avatars[$j][1])
									Else
										$avatars_menuitems[$j] = _GUICtrlCreateODMenuItem("[Icone]", $context)
										_GUICtrlODMenuItemSetIcon($avatars_menuitems[$j], $avatars[$j][1])
									EndIf
								Next
								If $avatars_menuitems[0]+$avatars_menus[0] > 0 Then
									$separator  = _GUICtrlCreateODMenuItem("", $context)
									$erase_item = _GUICtrlCreateODMenuItem(translate("main_remove"), $context)
								EndIf
								; Affichage
								sousmenu($ORGANIZER_GUI, $msg, $context)
								Local $timer = TimerInit(), $handle = fenetre_handle($window)
								Do
;~ 									Sleep(20)
									Local $submsg = GUIGetMsg()
								Until $submsg > 0 Or TimerDiff($timer) > 250
								; Traitement
								If $submsg = 0 Then
									; Rien
								ElseIf $submsg = $erase_item Then
									fenetre_icon($window, "")
									GUICtrlSetImage($msg, ORGANIZER_images_folder()&"\Defaut.ico")
									WinSetState($handle, "", @SW_HIDE)
									WinSetState($handle, "", @SW_SHOW)
									WinResetIcon($handle)
								Else
									For $j = 1 To $avatars_menuitems[0]
										If $submsg = $avatars_menuitems[$j] Then
											WinSetState($handle, "", @SW_HIDE)
											WinSetState($handle, "", @SW_SHOW)
											fenetre_icon($window, $avatars[$j][0])
											If FileExists($avatars[$j][1]) Then
												GUICtrlSetImage($msg, $avatars[$j][1])
												WinSetIcon($handle, $avatars[$j][1])
											Else
												GUICtrlSetImage($msg, ORGANIZER_images_folder()&"\Defaut.ico")
												WinResetIcon($handle)
											EndIf
											ExitLoop
										EndIf
									Next
								EndIf
								; Destruction
								For $j = 1 To $avatars_menuitems[0]
									If $avatars_menuitems[$j] <> 0 Then _GUICtrlODMenuItemDelete($avatars_menuitems[$j])
								Next
								For $j = 1 To $avatars_menus[0]
									If $avatars_menus[$j] <> 0 Then _GUICtrlODMenuItemDelete($avatars_menus[$j])
								Next
								If $avatars_menuitems[0]+$avatars_menus[0] > 0 Then
									_GUICtrlODMenuItemDelete($separator)
									_GUICtrlODMenuItemDelete($erase_item)
								EndIf
								GUICtrlDelete($context)
								GUICtrlDelete($dummy)
							EndIf
							registerMsg_ORGANIZER(GUICtrlGetHandle($msg))
						Case $ORGANIZER_labels[$i]
							unregisterMsg_ORGANIZER()
							ORGANIZER_WinActivate(fenetre_handle($window), "ANIMATED")
							registerMsg_ORGANIZER(GUICtrlGetHandle($msg))
						Case $ORGANIZER_buttons[$i]
							unregisterMsg_ORGANIZER()
							Local $shortcut = ORGANIZER_catchShortcut(fenetre_shortcut($window))
							If Not @error Then
								fenetre_shortcut($window, $shortcut)
								GUICtrlSetData($msg, shortcut_toString($shortcut, 1))
								GUICtrlSetFont($msg, Default, $shortcut<>""?700:0)
							EndIf
							registerMsg_ORGANIZER()
						Case $ORGANIZER_checkboxes[$i]
							unregisterMsg_ORGANIZER()
							Local $state = _GUICtrlGetCheck($msg)
							fenetre_activated($window, $state?1:0)
							registerMsg_ORGANIZER(GUICtrlGetHandle($msg))
					EndSwitch
				Next
		EndSwitch
	Until $quit Or $activate
	unregisterMsg_ORGANIZER()
	saveDataToConfigFile()
	GUIDelete($ORGANIZER_GUI)
	Return ($quit?"QUIT":"ACTIVATE")
EndFunc

Func registerMsg_ORGANIZER($control=0)
	GUIRegisterMsg(0x0020, "onHovering_ORGANIZER") ; $WM_SETCURSOR = 0x0020
	_onHovering_ORGANIZER($ORGANIZER_GUI, 0, $control, 0, True)
EndFunc

Func unregisterMsg_ORGANIZER()
	GUIRegisterMsg(0x0020, "") ; $WM_SETCURSOR = 0x0020
	_onHovering_ORGANIZER($ORGANIZER_GUI, 0, 0, 0, True)
	ToolTip("")
EndFunc

Func onHovering_ORGANIZER($handle, $msg, $wParam, $lParam)
	Return _onHovering_ORGANIZER($handle, $msg, $wParam, $lParam, False)
EndFunc

Func _onHovering_ORGANIZER($handle, $msg, $wParam, $lParam, $force=False)
	If Not IsDeclared("previous_over_ORGANIZER") Then Global $previous_over_ORGANIZER = 0
	Local $hovercolor = 0xDDDDDD, $unhovercolor = -2 ; $GUI_BKCOLOR_TRANSPARENT = -2
	If $force = True Or $previous_over_ORGANIZER <> $wParam Then
		Local $actual_over_ORGANIZER = $wParam, $position = WinGetPos($ORGANIZER_GUI), $tip[3] = [($handle = $ORGANIZER_GUI), $position[0]+$position[2]/2, $position[1]+$position[3]-10]
		; Unhover
		; Rien
		; Hover
		Local $found = False
		If Not $found Then
			$found = True
			Switch $actual_over_ORGANIZER
				Case GUICtrlGetHandle($ORGANIZER_titre)
					If $tip[0] Then ToolTip(translate("onHovering_move_text"), $tip[1], $tip[2], field("name")&" v"&field("version"), 0, 3)
				Case GUICtrlGetHandle($ORGANIZER_permuter)
					If $tip[0] Then ToolTip(translate("onHovering_permuter_text"), $tip[1], $tip[2], translate("onHovering_permuter_title"), 2, 3)
				Case GUICtrlGetHandle($ORGANIZER_quitter)
					If $tip[0] Then ToolTip(translate("onHovering_quit_text"), $tip[1], $tip[2], translate("main_quit"), 0, 3)
				Case GUICtrlGetHandle($ORGANIZER_buttonPrevious)
					If $tip[0] Then ToolTip(translate($ORGANIZER_commandes[1]=""?"onHovering_raccourciAdd_text":"onHovering_raccourciModify_text", shortcut_toString($ORGANIZER_commandes[1])), $tip[1], $tip[2], translate("onHovering_previous_title"), 0, 3)
				Case GUICtrlGetHandle($ORGANIZER_buttonNext)
					If $tip[0] Then ToolTip(translate($ORGANIZER_commandes[2]=""?"onHovering_raccourciAdd_text":"onHovering_raccourciModify_text", shortcut_toString($ORGANIZER_commandes[2])), $tip[1], $tip[2], translate("onHovering_next_title"), 0, 3)
				Case GUICtrlGetHandle($ORGANIZER_buttonRefresh)
					If $tip[0] Then ToolTip(translate("onHovering_refresh_text"), $tip[1], $tip[2], translate("onHovering_refresh_title"), 0, 3)
				Case GUICtrlGetHandle($ORGANIZER_fieldDock), GUICtrlGetHandle($ORGANIZER_buttonDock)
					If $tip[0] Then ToolTip(translate("onHovering_dock_text"), $tip[1], $tip[2], translate("onHovering_dock_title"), 0, 3)
				Case Else
					$found = False
			EndSwitch
		EndIf
		If Not $found Then
			For $i = 1 To $ORGANIZER_fenetres[0]
				If Not $found Then
					$found = True
					Switch $actual_over_ORGANIZER
						Case GUICtrlGetHandle($ORGANIZER_icons[$i])
							If $tip[0] Then
								Local $avatars = NAIO_avatars()
								ToolTip(translate($avatars[0][0]>0 ? "onHovering_avatar_text" : "onHovering_avatar_textNo"),   $tip[1], $tip[2], translate("onHovering_avatar_title", fenetre_alias($ORGANIZER_fenetres[$i])), ($avatars[0][0]>0?0:3), 3)
							EndIf
						Case GUICtrlGetHandle($ORGANIZER_labels[$i])
							If $tip[0] Then ToolTip(translate("onHovering_personnage_text"), $tip[1], $tip[2], fenetre_alias($ORGANIZER_fenetres[$i]), 0, 3)
						Case GUICtrlGetHandle($ORGANIZER_inputs[$i])
							If $tip[0] Then ToolTip(translate("onHovering_initiative_text"), $tip[1], $tip[2], translate("onHovering_initiative_title", fenetre_alias($ORGANIZER_fenetres[$i])), 0, 3)
						Case GUICtrlGetHandle($ORGANIZER_buttons[$i])
							If $tip[0] Then ToolTip(translate(fenetre_shortcut($ORGANIZER_fenetres[$i])=""?"onHovering_raccourciAdd_text":"onHovering_raccourciModify_text", shortcut_toString(fenetre_shortcut($ORGANIZER_fenetres[$i]))), $tip[1], $tip[2], translate("onHovering_raccourci_title", fenetre_alias($ORGANIZER_fenetres[$i])), 0, 3)
						Case GUICtrlGetHandle($ORGANIZER_checkboxes[$i])
							If $tip[0] Then ToolTip(translate(fenetre_activated($ORGANIZER_fenetres[$i])=1 ? "onHovering_activation_textOn" : "onHovering_activation_textOff"), $tip[1], $tip[2], translate("onHovering_activation_title", fenetre_alias($ORGANIZER_fenetres[$i])), 0, 3)
						Case Else
							$found = False
					EndSwitch
				EndIf
			Next
		EndIf
		If Not $found Then ToolTip("")
		$previous_over_ORGANIZER = $actual_over_ORGANIZER
	EndIf
	Return "GUI_RUNDEFMSG" ; $GUI_RUNDEFMSG = "GUI_RUNDEFMSG"
EndFunc

Func saveDataToConfigFile()
	Local $file = ORGANIZER_config_file(), $section = ORGANIZER_profil()
	IniWrite($file, $section, "PositionX",   $ORGANIZER_GUI_position[0])
	IniWrite($file, $section, "PositionX",   $ORGANIZER_GUI_position[0])
	IniWrite($file, $section, "PositionY",   $ORGANIZER_GUI_position[1])
	IniWrite($file, $section, "Previous",    $ORGANIZER_commandes[1])
	IniWrite($file, $section, "Next",        $ORGANIZER_commandes[2])
	IniWrite($file, $section, "Dock",        $ORGANIZER_dock_position)
	IniWrite($file, $section, "Thumbnails",  $ORGANIZER_dock_thumbnails?"Y":"N")
	IniWrite($file, $section, "CursorCycle", $ORGANIZER_cursorcycle_enabled?"Y":"N")
	For $i = 1 To $ORGANIZER_fenetres[0]
		Local $fenetre = $ORGANIZER_fenetres[$i]
		IniWrite($file, $section, "_"&fenetre_alias($fenetre), Number(fenetre_order($fenetre))&"¶"&Number(fenetre_activated($fenetre))&"¶"&fenetre_shortcut($fenetre)&"¶"&fenetre_icon($fenetre))
	Next
EndFunc

Func loadDataFromConfigFile()
	Local $file = ORGANIZER_config_file(), $section = ORGANIZER_profil()
	Local $vide[1][2] = [[0]], $resultat = IniReadSection($file, $section)
	If @error Then Return $vide
	Return $resultat
EndFunc

; ### Region Rafraîchissement des données

Func ORGANIZER_refresh($sort=True)
	saveDataToConfigFile()
	GUICtrlSetState($ORGANIZER_buttonRefresh, 0x80) ; $GUI_DISABLE = 0x80
	For $i = 1 To $ORGANIZER_fenetres[0]
		GUICtrlDelete($ORGANIZER_icons[$i])
		GUICtrlDelete($ORGANIZER_labels[$i])
		GUICtrlDelete($ORGANIZER_inputs[$i])
		GUICtrlDelete($ORGANIZER_buttons[$i])
		GUICtrlDelete($ORGANIZER_checkboxes[$i])
	Next
	Local $old = WinGetPos($ORGANIZER_GUI)
	WinMove($ORGANIZER_GUI, "", $old[0], $old[1], $old[2], $old[3]-25*$ORGANIZER_fenetres[0])
	$ORGANIZER_fenetres = ORGANIZER_getWinList()
	Local $new = WinGetPos($ORGANIZER_GUI)
	WinMove($ORGANIZER_GUI, "", $new[0], $new[1], $new[2], $new[3]+25*$ORGANIZER_fenetres[0])
	Local $elements[$ORGANIZER_fenetres[0]+1] = [$ORGANIZER_fenetres[0]]
	$ORGANIZER_icons      = $elements
	$ORGANIZER_labels     = $elements
	$ORGANIZER_inputs     = $elements
	$ORGANIZER_buttons    = $elements
	$ORGANIZER_checkboxes = $elements
	GUICtrlSetState($ORGANIZER_nothing,           ($ORGANIZER_fenetres[0]<>0 ? 0x20 : 0x10)) ; $GUI_HIDE = 0x20 ; $GUI_SHOW = 0x10
	GUICtrlSetState($ORGANIZER_icons_header,      ($ORGANIZER_fenetres[0]<>0 ? 0x10 : 0x20)) ; $GUI_SHOW = 0x10 ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_labels_header,     ($ORGANIZER_fenetres[0]<>0 ? 0x10 : 0x20)) ; $GUI_SHOW = 0x10 ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_inputs_header,     ($ORGANIZER_fenetres[0]<>0 ? 0x10 : 0x20)) ; $GUI_SHOW = 0x10 ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_buttons_header,    ($ORGANIZER_fenetres[0]<>0 ? 0x10 : 0x20)) ; $GUI_SHOW = 0x10 ; $GUI_HIDE = 0x20
	GUICtrlSetState($ORGANIZER_checkboxes_header, ($ORGANIZER_fenetres[0]<>0 ? 0x10 : 0x20)) ; $GUI_SHOW = 0x10 ; $GUI_HIDE = 0x20
	For $i = 1 To $ORGANIZER_fenetres[0]
		Local $handle = fenetre_handle($ORGANIZER_fenetres[$i]), $icone = NAIO_images_folder()&"\Avatars\"&fenetre_icon($ORGANIZER_fenetres[$i])&".ico", $default = ORGANIZER_images_folder()&"\Defaut.ico"
		$ORGANIZER_icons[$i]      = GUICtrlCreateIcon($default, -1, 12, 47+25*$i,    16, 16)
		$ORGANIZER_labels[$i]     = GUICtrlCreateLabel("",          40, 45+25*$i+3, 105, 15, 0x0001) ; $ES_CENTER = 0x0001
		$ORGANIZER_inputs[$i]     = GUICtrlCreateInput("",         155, 45+25*$i,    55, 20, 0x0001) ; $ES_CENTER = 0x0001
		$ORGANIZER_buttons[$i]    = GUICtrlCreateButton("",        220, 45+25*$i,    80, 20)
		$ORGANIZER_checkboxes[$i] = GUICtrlCreateCheckbox("",      310, 45+25*$i,    20, 20)
		GUICtrlSetBkColor($ORGANIZER_icons[$i],    0xff9900)
		GUICtrlSetState($ORGANIZER_icons[$i],      0x80) ; $GUI_DISABLE = 0x80
		GUICtrlSetState($ORGANIZER_buttons[$i],    0x80) ; $GUI_DISABLE = 0x80
		GUICtrlSetState($ORGANIZER_checkboxes[$i], 0x80) ; $GUI_DISABLE = 0x80
		WinSetState($handle, "", @SW_HIDE)
		If Not $sort Then WinSetState($handle, "", @SW_SHOW)
		If FileExists($icone) Then
			GUICtrlSetImage($ORGANIZER_icons[$i], $icone, -1, 0)
			If Not $sort Then WinSetIcon($handle, $icone)
		Else
			GUICtrlSetImage($ORGANIZER_icons[$i], $default, -1, 0)
			If Not $sort Then WinResetIcon($handle)
		EndIf
		GUICtrlSetData($ORGANIZER_labels[$i],      fenetre_alias($ORGANIZER_fenetres[$i]))
		GUICtrlSetData($ORGANIZER_inputs[$i],      fenetre_order($ORGANIZER_fenetres[$i]))
		GUICtrlSetData($ORGANIZER_buttons[$i],     shortcut_toString(fenetre_shortcut($ORGANIZER_fenetres[$i]), 1))
		GUICtrlSetState($ORGANIZER_checkboxes[$i], fenetre_activated($ORGANIZER_fenetres[$i]) ? 0x01 : 0x04) ; $GUI_CHECKED = 0x01 ; $GUI_UNCHECKED = 0x04
		GUICtrlSetBkColor($ORGANIZER_labels[$i],   -2) ; $GUI_BKCOLOR_TRANSPARENT = -2
		If fenetre_shortcut($ORGANIZER_fenetres[$i]) <> "" Then GUICtrlSetFont($ORGANIZER_buttons[$i], Default, 700)
		; Positionnement
		GUICtrlSetResizing($ORGANIZER_icons[$i],      0x0102 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKWIDTH = 0x0100 ; $GUI_DOCKTOP = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
		GUICtrlSetResizing($ORGANIZER_labels[$i],     0x0006 + 0x0220) ; $GUI_DOCKLEFT  = 0x0002 ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKTOP = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
		GUICtrlSetResizing($ORGANIZER_inputs[$i],     0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH = 0x0100 ; $GUI_DOCKTOP = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
		GUICtrlSetResizing($ORGANIZER_buttons[$i],    0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH = 0x0100 ; $GUI_DOCKTOP = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
		GUICtrlSetResizing($ORGANIZER_checkboxes[$i], 0x0104 + 0x0220) ; $GUI_DOCKRIGHT = 0x0004 ; $GUI_DOCKWIDTH = 0x0100 ; $GUI_DOCKTOP = 0x0020 ; $GUI_DOCKHEIGHT = 0x0200
	Next
	; Réorganisation
	If $sort Then
		Local $tempTray = _TrayIconCreate(field("name")&" v"&field("version"), @ScriptFullPath)
		; Affichage
		_TrayIconSetClick($tempTray, 0) ; Aucune action possible
		_TrayIconSetState($tempTray, 1)
		For $i = 1 To $ORGANIZER_fenetres[0]
			_TrayTip($tempTray, field("name")&" v"&field("version")&" - "&translate("main_sorting"), translate("displayTray_sorting", $i, $ORGANIZER_fenetres[0]), 10, 2)
			Local $handle = fenetre_handle($ORGANIZER_fenetres[$i]), $icone = NAIO_images_folder()&"\Avatars\"&fenetre_icon($ORGANIZER_fenetres[$i])&".ico"
			If Not $sort Then WinSetState($handle, "", @SW_HIDE)
			WinSetState($handle, "", @SW_SHOW)
			If FileExists($icone) Then
				WinSetIcon($handle, $icone)
			Else
				WinResetIcon($handle)
			EndIf
			GUICtrlSetState($ORGANIZER_icons[$i],      0x40) ; $GUI_ENABLE = 0x40
			GUICtrlSetState($ORGANIZER_buttons[$i],    0x40) ; $GUI_ENABLE = 0x40
			GUICtrlSetState($ORGANIZER_checkboxes[$i], 0x40) ; $GUI_ENABLE = 0x40
		Next
		_TrayTip($tempTray, "", "")
		_TrayIconDelete($tempTray)
	Else
		For $i = 1 To $ORGANIZER_fenetres[0]
			GUICtrlSetState($ORGANIZER_icons[$i],      0x40) ; $GUI_ENABLE = 0x40
			GUICtrlSetState($ORGANIZER_buttons[$i],    0x40) ; $GUI_ENABLE = 0x40
			GUICtrlSetState($ORGANIZER_checkboxes[$i], 0x40) ; $GUI_ENABLE = 0x40
		Next
	EndIf
	GUICtrlSetState($ORGANIZER_buttonRefresh, 0x40) ; $GUI_ENABLE = 0x40
EndFunc

Func ORGANIZER_refreshDock()
	Local $centerH = @DesktopWidth/2, $centerV = @DesktopHeight/2, $position = WinGetPos($DOCK_GUI)
	If Not @error Then
		$centerH = $position[0]+$position[2]/2
		$centerV = $position[1]+$position[3]/2
	EndIf
	If checkOrientation($ORGANIZER_dock_position) Then
		WinMove($DOCK_GUI, "", $centerH-15, Default, 30, Default)
	Else
		WinMove($DOCK_GUI, "", Default, $centerV-15, Default, 30)
	EndIf
	For $i = 1 To $DOCK_ICONES[0]
		If $DOCK_ICONES[$i] <> 0 Then GUICtrlDelete($DOCK_ICONES[$i])
	Next
	ReDim $DOCK_ICONES[1]
	$DOCK_ICONES[0] = 0
	Local $default = ORGANIZER_images_folder()&"\Defaut.ico"
	For $i = 1 To $ORGANIZER_fenetres[0]
		Local $handle = fenetre_handle($ORGANIZER_fenetres[$i]), $alias = fenetre_alias($ORGANIZER_fenetres[$i]), $shortcut = fenetre_shortcut($ORGANIZER_fenetres[$i])
		Local $icone = NAIO_images_folder()&"\Avatars\"&fenetre_icon($ORGANIZER_fenetres[$i])&".ico"
		$DOCK_ICONES[0]=$DOCK_ICONES[0]+1
		ReDim $DOCK_ICONES[$DOCK_ICONES[0]+1]
		$DOCK_ICONES[$DOCK_ICONES[0]] = GUICtrlCreateButton("", checkOrientation($ORGANIZER_dock_position)?(28+($i-1)*52):2, checkOrientation($ORGANIZER_dock_position)?2:(28+($i-1)*52), 50, 50, 0x40) ; $BS_ICON = 0x40
		GUICtrlSetTip($DOCK_ICONES[$DOCK_ICONES[0]], translate("dock_FENETRE_tooltip", shortcut_toString($shortcut)), $i&"/"&$ORGANIZER_fenetres[0]&" : "&$alias)
		_GUICtrlSetImage($DOCK_ICONES[$DOCK_ICONES[0]], FileExists($icone)?$icone:$default, 32)
		GUICtrlSetResizing($DOCK_ICONES[$DOCK_ICONES[0]], 802) ; $GUI_DOCKALL = 2+32+256+512
	Next
	If $DOCK_ICONES[0] > 0 Then
		Local $length = 30+52*$DOCK_ICONES[0]
		If checkOrientation($ORGANIZER_dock_position) Then
			WinMove($DOCK_GUI, "", $centerH-$length/2, Default, $length, Default)
		Else
			WinMove($DOCK_GUI, "", Default, $centerV-$length/2, Default, $length)
		EndIf
	EndIf
EndFunc

Func ORGANIZER_getWinList($sort=True)
	Local $resultat[1] = [0]
	; Liste des fenêtres éligibles
	Local $patternDofus = IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "PatternDofus", "[REGEXPCLASS:^(?i)ApolloRuntimeContentWindow$]")
	Local $processDofus = IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "RegexpDofus",  "^(?i)dofus[^\.]*\.exe$")
	Local $patternTitle = IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "PatternTitle", "^(?i)(.*?) - Dofus ([\d\.]+)$")
	Local $winList = WinList($patternDofus), $processList = ProcessList()
	For $i = 1 To $winList[0][0]
		Local $handle = $winList[$i][1], $pid = WinGetProcess($handle), $title = WinGetTitle($handle)
		If $pid > 0 And BitAND(WinGetState($handle), 2) And StringRegExp($title, $patternTitle) Then
			Local $cleanedTitle = StringRegExpReplace($title, $patternTitle, "$1")
			For $j = 1 To $processList[0][0]
				If $processList[$j][1] = $pid Then
					If StringLower($processList[$j][0]) = StringLower($processDofus) Or StringRegExp($processList[$j][0], $processDofus) Then
						Local $fenetre = fenetre_new()
						fenetre_alias($fenetre,  $cleanedTitle)
						fenetre_handle($fenetre, $handle)
						$resultat[0] = $resultat[0]+1
						ReDim $resultat[$resultat[0]+1]
						$resultat[$resultat[0]] = $fenetre
					EndIf
					ExitLoop
				EndIf
			Next
		EndIf
	Next
	If $sort And $resultat[0] > 0 Then
		fenetres_generateIndex($resultat)
		; Liste des ressources disponibles
		Local $patternData = "^(\d+)¶(\d)¶([^¶]*)¶([^¶]*)$"
		Local $ressources = loadDataFromConfigFile()
		; Association ressources-fenêtres
		Local $association[$resultat[0]+1][3] = [[$resultat[0]]]
		For $i = 1 To $resultat[0]
			$association[$i][0] = 0
			$association[$i][1] = $resultat[$i]
			Local $found = "", $name = fenetre_alias($resultat[$i])
			For $j = 1 To $ressources[0][0]
				If $found = "" And $ressources[$j][0] = "_"&$name Then $found = $ressources[$j][1]
			Next
			If $found <> "" Then
				Local $order     = Number(StringRegExpReplace($found, $patternData, "$1"))
				Local $activated = Number(StringRegExpReplace($found, $patternData, "$2"))
				Local $shortcut  = StringRegExpReplace($found,        $patternData, "$3")
				Local $icon      = StringRegExpReplace($found,        $patternData, "$4")
				fenetre_order($resultat[$i],     $order)
				fenetre_activated($resultat[$i], $activated)
				fenetre_shortcut($resultat[$i],  $shortcut)
				fenetre_icon($resultat[$i],      $icon)
				$association[$i][0] = $order
			EndIf
		Next
		; Tri de la liste
		_ArraySort($association, 1, 1)
		; Réorganisation
		For $i = 1 To $resultat[0]
			$resultat[$i] = $association[$i][1]
		Next
	EndIf
	Return $resultat
EndFunc

; ### Region Gestion des raccourcis

Func ORGANIZER_detectShortcut()
	Local $found = False, $fenetres = $ORGANIZER_fenetres
	For $i = 1 To $fenetres[0]
		If @HotKeyPressed = fenetre_shortcut($fenetres[$i]) Then
			Local $index = Mod(($i)-1, $fenetres[0])+1, $handle = fenetre_handle($fenetres[$index])
			ORGANIZER_WinActivate($handle)
			If $ORGANIZER_dock_position <> "" Then ORGANIZER_MoveDockToHandle($handle)
			ExitLoop
		EndIf
	Next
EndFunc

Func ORGANIZER_detectShortcut_previous()
	ORGANIZER_detectShortcut_cycle(-1, @HotKeyPressed, "ORGANIZER_detectShortcut_previous")
EndFunc

Func ORGANIZER_detectShortcut_next()
	ORGANIZER_detectShortcut_cycle(+1, @HotKeyPressed, "ORGANIZER_detectShortcut_next")
EndFunc

Func ORGANIZER_detectShortcut_cycle($direction, $shortcut, $function)
	Local $found = False, $fenetres = $ORGANIZER_fenetres
	For $indexFrom = 1 To $fenetres[0]
		If WinActive(fenetre_handle($fenetres[$indexFrom])) Then
			Local $indexTo = $indexFrom
			Do
				$indexTo = $indexTo+$direction
				If $indexTo < 1 Then $indexTo = $fenetres[0]
				If $indexTo > $fenetres[0] Then $indexTo = 1
				$found = $indexTo <> $indexFrom And WinExists(fenetre_handle($fenetres[$indexTo])) And fenetre_activated($fenetres[$indexTo])
				If $found Then
					Local $handleFrom = fenetre_handle($fenetres[$indexFrom]), $handleTo = fenetre_handle($fenetres[$indexTo])
					If $ORGANIZER_cursorcycle_enabled Then
						Local $ratio[2] = [5,4], $opt = Opt("MouseCoordMode", 2)
						Local $position = ORGANIZER_getCursorDestination($handleFrom, $handleTo, $ratio)
						ORGANIZER_WinActivate($handleTo)
						If $ORGANIZER_dock_position <> "" Then ORGANIZER_MoveDockToHandle($handleTo)
						MouseMove($position[0], $position[1], 0)
						Opt("MouseCoordMode", $opt)
					Else
						ORGANIZER_WinActivate($handleTo)
						If $ORGANIZER_dock_position <> "" Then ORGANIZER_MoveDockToHandle($handleTo)
					EndIf
				EndIf
			Until $indexTo = $indexFrom Or $found
			ExitLoop
		EndIf
	Next
	If Not $found Then
		HotKeySet($shortcut)
		Send($shortcut)
		HotKeySet($shortcut, $function)
	EndIf
EndFunc

; ### Enregistrement d'un nouveau raccourci

Func ORGANIZER_catchShortcut($parameter="")
	; Initialisation
	Local $shortcut = $parameter
	; Création des éléments graphiques
	Local $CATCH_GUI_size[2] = [160,120], $CATCH_GUI_position[2] = [Default, Default], $parent_position = WinGetPos($ORGANIZER_GUI)
	If Not @error Then
		$CATCH_GUI_position[0] = $parent_position[0]+($parent_position[2]-$CATCH_GUI_size[0])/2
		$CATCH_GUI_position[1] = $parent_position[1]+($parent_position[3]-$CATCH_GUI_size[1])/2
	EndIf
	Local $CATCH_GUI = GUICreate(field("name")&" v"&field("version"), $CATCH_GUI_size[0], $CATCH_GUI_size[1], $CATCH_GUI_position[0], $CATCH_GUI_position[1], 0x80800000, 0x00000010, $ORGANIZER_GUI) ; $WS_POPUP = 0x80000000 ; $WS_BORDER = 0x00800000 ; $WS_EX_ACCEPTFILES = 0x00000010
	GUISetIcon(@ScriptFullPath, Default, $CATCH_GUI)
	Local $CATCH_button = GUICtrlCreateButton("", 5, 5, 40, 40)
	Local $CATCH_label1 = GUICtrlCreateLabel("",  50, 5, $CATCH_GUI_size[0]-55, 40, 0x2000) ; $BS_MULTILINE = 0x2000
	Local $CATCH_label2 = GUICtrlCreateLabel("",  5, 50, $CATCH_GUI_size[0]-10, $CATCH_GUI_size[1]-80, 0x2000) ; $BS_MULTILINE = 0x2000
	Local $CATCH_input  = GUICtrlCreateInput("", 30, $CATCH_GUI_size[1]-25, $CATCH_GUI_size[0]-60, 20, 0x0001) ; $ES_CENTER = 0x0001
	Local $CATCH_erase  = GUICtrlCreateButton("X", 5, $CATCH_GUI_size[1]-25, 20, 20)
	Local $CATCH_valid  = GUICtrlCreateButton(">", $CATCH_GUI_size[0]-25, $CATCH_GUI_size[1]-25, 20, 20)
	; Habillage
	GUICtrlSetStyle($CATCH_button, 0x40) ; $BS_ICON = 0x40
	GUICtrlSetData($CATCH_label1, translate("catchShortcut_label_type", shortcut_toString($shortcut)))
	GUICtrlSetData($CATCH_label2, translate("catchShortcut_label_type", shortcut_toString($shortcut)))
	GUICtrlSetData($CATCH_input,  $shortcut)
	GUICtrlSetState($CATCH_input, 0x80) ; $GUI_DISABLE = 0x80
	_GUICtrlSetImage($CATCH_button, ORGANIZER_images_folder()&"\Clavier.ico", 32)
	; Affichage
	GUISetState(@SW_SHOW, $CATCH_GUI)
	Local $stop = False, $valid = False, $process = True, $periodicite = False, $previous = ""
	Do
		; Focus
		If Not WinActive($CATCH_GUI) Then $stop = True
		; Action périodique
		If $process And $periodicite <> (@MSEC > 500) Then
			$periodicite = (@MSEC > 500)
			_GUICtrlSetImage($CATCH_button, ORGANIZER_images_folder()&"\"&($periodicite?"Clavier":"Enregistrer")&".ico", 32)
		EndIf
		; Traitement
;~ 		Sleep(20)
		Local $msg = GUIGetMsg()
		Switch $msg
			Case $CATCH_button
				If $process Then
					GUICtrlSetData($CATCH_label1, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", shortcut_toString($shortcut)))
					GUICtrlSetData($CATCH_label2, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", shortcut_toString($shortcut)))
					GUICtrlSetData($CATCH_input,  $shortcut)
					GUICtrlSetState($CATCH_input, 0x40) ; $GUI_ENABLE = 0x40
					$process = False
				Else
					GUICtrlSetData($CATCH_label1, translate("catchShortcut_label_type", shortcut_toString($shortcut)))
					GUICtrlSetData($CATCH_label2, translate("catchShortcut_label_type", shortcut_toString($shortcut)))
					GUICtrlSetData($CATCH_input,  $shortcut)
					GUICtrlSetState($CATCH_input, 0x80) ; $GUI_DISABLE = 0x80
					$process = True
				EndIf
			Case $CATCH_valid
				$valid = True
			Case $CATCH_erase
				GUICtrlSetData($CATCH_input, "")
				$valid = True
			Case Else
				If $process Then
					Local $value = ""
					For $code = 0x08 To 0xFF
						If ORGANIZER_catchShortcut_checkKey($code) Then
							$value = ORGANIZER_catchShortcut_decodeKey($code)
							If Not @error Then ExitLoop
						EndIf
					Next
					If $previous <> $value Then
						If $value = "" Then
							Local $shortcut = "" _
								& (ORGANIZER_catchShortcut_checkKey(0x11)?"^":"") _ ; Control
								& (ORGANIZER_catchShortcut_checkKey(0x12)?"!":"") _ ; Alt
								& (ORGANIZER_catchShortcut_checkKey(0x10)?"+":"") _ ; Shift
								& (ORGANIZER_catchShortcut_checkKey(0x5B)?"#":"") _ ; Windows
								& "{"&$previous&"}"             ; Touche
							Local $test = shortcut_toString($shortcut)
							GUICtrlSetData($CATCH_label1, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", $test))
							GUICtrlSetData($CATCH_label2, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", $test))
							GUICtrlSetData($CATCH_input,  $shortcut)
							GUICtrlSetState($CATCH_input, 0x40) ; $GUI_ENABLE = 0x40
							_GUICtrlSetImage($CATCH_button, ORGANIZER_images_folder()&"\Clavier.ico", 32)
							$process = False
						EndIf
						$previous = $value
					EndIf
				EndIf
		EndSwitch
	Until $stop Or $valid
	$shortcut = GUICtrlRead($CATCH_input)
	GUIDelete($CATCH_GUI)
	Return ($valid?$shortcut:$parameter)
EndFunc

Func ORGANIZER_catchShortcut_OLD($parameter="")
	; Initialisation
	Local $shortcut = $parameter
	; Création des éléments graphiques
	Local $CATCH_GUI_size[2] = [160,120], $CATCH_GUI_position[2] = [Default, Default], $parent_position = WinGetPos($ORGANIZER_GUI)
	If Not @error Then
		$CATCH_GUI_position[0] = $parent_position[0]+($parent_position[2]-$CATCH_GUI_size[0])/2
		$CATCH_GUI_position[1] = $parent_position[1]+($parent_position[3]-$CATCH_GUI_size[1])/2
	EndIf
	Local $CATCH_GUI = GUICreate(field("name")&" v"&field("version"), $CATCH_GUI_size[0], $CATCH_GUI_size[1], $CATCH_GUI_position[0], $CATCH_GUI_position[1], 0x80800000, 0x00000010, $ORGANIZER_GUI) ; $WS_POPUP = 0x80000000 ; $WS_BORDER = 0x00800000 ; $WS_EX_ACCEPTFILES = 0x00000010
	GUISetIcon(@ScriptFullPath, Default, $CATCH_GUI)
	Local $CATCH_button = GUICtrlCreateButton("", 5, 5, $CATCH_GUI_size[0]-10, $CATCH_GUI_size[1]-35, 0x2000) ; $BS_MULTILINE = 0x2000
	Local $CATCH_input  = GUICtrlCreateInput("", 30, $CATCH_GUI_size[1]-25, $CATCH_GUI_size[0]-60, 20, 0x0001) ; $ES_CENTER = 0x0001
	Local $CATCH_erase  = GUICtrlCreateButton("X", 5, $CATCH_GUI_size[1]-25, 20, 20)
	Local $CATCH_valid  = GUICtrlCreateButton(">", $CATCH_GUI_size[0]-25, $CATCH_GUI_size[1]-25, 20, 20)
	; Habillage
	Local $test = shortcut_toString($shortcut)
	GUICtrlSetData($CATCH_button, translate("catchShortcut_label_type", $test))
	GUICtrlSetData($CATCH_input,  $shortcut)
	GUICtrlSetState($CATCH_input, 0x80) ; $GUI_DISABLE = 0x80
	; Affichage
	GUISetState(@SW_SHOW, $CATCH_GUI)
	Local $stop = False, $valid = False, $process = True, $previous = ""
	Do
		; Focus
		If Not WinActive($CATCH_GUI) Then $stop = True
		; Traitement
;~ 		Sleep(20)
		Local $msg = GUIGetMsg()
		Switch $msg
			Case $CATCH_button
				If $process Then
					Local $test = shortcut_toString($shortcut)
					GUICtrlSetData($CATCH_button, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", $test))
					GUICtrlSetData($CATCH_input,  $shortcut)
					GUICtrlSetState($CATCH_input, 0x40) ; $GUI_ENABLE = 0x40
					$process = False
				Else
					Local $test = shortcut_toString($shortcut)
					GUICtrlSetData($CATCH_button, translate("catchShortcut_label_type", $test))
					GUICtrlSetData($CATCH_input,  $shortcut)
					GUICtrlSetState($CATCH_input, 0x80) ; $GUI_DISABLE = 0x80
					$process = True
				EndIf
			Case $CATCH_valid
				$valid = True
			Case $CATCH_erase
				GUICtrlSetData($CATCH_input, "")
				$valid = True
			Case Else
				If $process Then
					Local $value = ""
					For $code = 0x08 To 0xFF
						If ORGANIZER_catchShortcut_checkKey($code) Then
							$value = ORGANIZER_catchShortcut_decodeKey($code)
							If Not @error Then ExitLoop
						EndIf
					Next
					If $previous <> $value Then
						If $value = "" Then
							Local $shortcut = "" _
								& (ORGANIZER_catchShortcut_checkKey(0x11)?"^":"") _ ; Control
								& (ORGANIZER_catchShortcut_checkKey(0x12)?"!":"") _ ; Alt
								& (ORGANIZER_catchShortcut_checkKey(0x10)?"+":"") _ ; Shift
								& (ORGANIZER_catchShortcut_checkKey(0x5B)?"#":"") _ ; Windows
								& "{"&$previous&"}"             ; Touche
							Local $test = shortcut_toString($shortcut)
							GUICtrlSetData($CATCH_button, translate(@error?"catchShortcut_label_add":"catchShortcut_label_modify", $test))
							GUICtrlSetData($CATCH_input,  $shortcut)
							GUICtrlSetState($CATCH_input, 0x40) ; $GUI_ENABLE = 0x40
							$process = False
						EndIf
						$previous = $value
					EndIf
				EndIf
		EndSwitch
	Until $stop Or $valid
	$shortcut = GUICtrlRead($CATCH_input)
	GUIDelete($CATCH_GUI)
	Return ($valid?$shortcut:$parameter)
EndFunc

Func ORGANIZER_catchShortcut_checkKey($code)
	Local $resultat = DllCall($USER32_DLL, "int", "GetAsyncKeyState", "int", $code)
	Return Not @error And BitAND($resultat[0], 0x8000) = 0x8000
EndFunc

Func ORGANIZER_catchShortcut_decodeKey($code)
	If $code = 0x08 Then Return "BS"
	If $code = 0x09 Then Return "TAB"
	If $code = 0x13 Then Return "PAUSE"
	If $code = 0x1B Then Return "ESC"
	If $code = 0x20 Then Return "SPACE"
	If $code = 0x21 Then Return "PGUP"
	If $code = 0x22 Then Return "PGDN"
	If $code = 0x23 Then Return "END"
	If $code = 0x24 Then Return "HOME"
	If $code = 0x25 Then Return "LEFT"
	If $code = 0x26 Then Return "UP"
	If $code = 0x27 Then Return "RIGHT"
	If $code = 0x28 Then Return "DOWN"
	If $code = 0x2C Then Return "PRINTSCREEN"
	If $code = 0x2D Then Return "INS"
	If $code = 0x2E Then Return "DEL"
	If $code = 0x6A Then Return "NUMPADMULT"
	If $code = 0x6B Then Return "NUMPADADD"
	If $code = 0x6D Then Return "NUMPADSUB"
	If $code = 0x6E Then Return "NUMPADDOT"
	If $code = 0x6F Then Return "NUMPADDIV"
	If $code = 0xDE Then Return "²"
	If $code = 0xDB Then Return ")"
	If $code = 0xBB Then Return "="
	If $code = 0xDD Then Return "^"
	If $code = 0xBA Then Return "$"
	If $code = 0xC0 Then Return "ù"
	If $code = 0xDC Then Return "*"
	If $code = 0xBC Then Return ","
	If $code = 0xBE Then Return ";"
	If $code = 0xBF Then Return ":"
	If $code = 0xDF Then Return "!"
	If $code = 0xE2 Then Return "<"
	If $code = 0x30 Then Return "à"
	If $code = 0x31 Then Return "&"
	If $code = 0x32 Then Return "é"
	If $code = 0x33 Then Return """"
	If $code = 0x34 Then Return "'"
	If $code = 0x35 Then Return "("
	If $code = 0x36 Then Return "-"
	If $code = 0x37 Then Return "è"
	If $code = 0x38 Then Return "_"
	If $code = 0x39 Then Return "ç"
	If $code >= 0x41 And $code <= 0x5A Then Return StringLower(Chr($code))
	If $code >= 0x60 And $code <= 0x69 Then Return "NUMPAD"&Number($code-0x60)
	If $code >= 0x70 And $code <= 0x87 Then Return "F"&Number($code-0x6F)
	; Eviter de traiter les commandes primitives
;~ 	If $code = 0x0D Then Return "Enter"
;~ 	If $code = 0x29 Then Return "Select"
;~ 	If $code = 0x2A Then Return "Print"
;~ 	If $code = 0x2B Then Return "Execute"
	; Eviter les touches intraitables par HotKey
;~ 	If $code = 0x6C Then Return "Separator"
	; Eviter de traiter les commandes souris (privilégier les raccourcis cablés sur les boutons)
;~ 	If $code = 0x01 Then Return "MouseLeft"
;~ 	If $code = 0x02 Then Return "MouseRight"
;~ 	If $code = 0x04 Then Return "MouseMiddle"
;~ 	If $code = 0x05 Then Return "MouseX1"
;~ 	If $code = 0x06 Then Return "MouseX2"
	; Ne pas du tout traiter les modificateurs (utiliser dans une autre fonction pour scruter l'état)
;~ 	If $code = 0x10 Then Return "Shift"
;~ 	If $code = 0x11 Then Return "Control"
;~ 	If $code = 0x12 Then Return "Alt"
;~ 	If $code = 0x5B Then Return "WindowsLeft"
;~ 	If $code = 0x5C Then Return "WindowsRight"
;~ 	If $code = 0xA0 Then Return "ShiftLeft"
;~ 	If $code = 0xA1 Then Return "ShiftRight"
;~ 	If $code = 0xA2 Then Return "ControlLeft"
;~ 	If $code = 0xA3 Then Return "ControlRight"
;~ 	If $code = 0xA4 Then Return "MenuLeft"
;~ 	If $code = 0xA5 Then Return "MenuRight"
;~ 	If $code = 0x14 Then Return "CapsLock"
;~ 	If $code = 0x90 Then Return "NumLock"
;~ 	If $code = 0x91 Then Return "ScrollLock"
	Return SetError(1, 0, "")
EndFunc

; ### Region Dossiers des ressources

Func NAIO_folder($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("NAIO_folder")
	If Not $declared Or $reset Then
		If Not $declared Then Global $NAIO_folder
		$NAIO_folder = StringRegExpReplace(@ScriptDir, "\\[^\\]*$", "")
	EndIf
	Local $resultat = $NAIO_folder
	If @NumParams > 0 And Not $reset Then $NAIO_folder = $value
	Return $resultat
EndFunc

Func NAIO_images_folder()
	Return NAIO_folder()&"\Images"
EndFunc

Func NAIO_config_folder()
	Return NAIO_folder()&"\Data"
EndFunc

Func ORGANIZER_folder($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_folder")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_folder
		$ORGANIZER_folder = @ScriptDir&"\"&field("name")
	EndIf
	Local $resultat = $ORGANIZER_folder
	If @NumParams > 0 And Not $reset Then $ORGANIZER_folder = $value
	Return $resultat
EndFunc

Func ORGANIZER_images_folder()
	Return ORGANIZER_folder()&"\Images"
EndFunc

Func ORGANIZER_languages_folder()
	Return ORGANIZER_folder()&"\Language"
EndFunc

; ### Region Fonctions d'activation/déplacement des clients, de la dockbar et du curseur

Func ORGANIZER_WinActivate($handle, $mode="NORMAL")
	Switch $mode
;~ 		Case "QUICK"
;~ 			_WinAPI_ShowWindow($handle, @SW_HIDE)
;~ 			_WinAPI_ShowWindow($handle, @SW_SHOW)
		Case "ANIMATED"
			_WinAPI_ShowWindow($handle, @SW_MINIMIZE)
			_WinAPI_ShowWindow($handle, @SW_RESTORE)
		Case Else
			WinActivate($handle)
	EndSwitch
EndFunc

Func ORGANIZER_MoveDockToHandle($handle=0, $cursor=0)
	Local $background[4] = [0,0,@DesktopWidth,@DesktopHeight], $position[2] = [0,0], $client = $background
	If $handle <> 0 Then
		Local $client = getWindowClientCoords($handle)
		If @error Then $client = $background
	EndIf
	Local $dock = WinGetPos($DOCK_GUI)
	If Not @error Then
		$position[0] = StringInStr($ORGANIZER_dock_position,"E") ? ($client[0]+$client[2]-$dock[2]-10) : StringInStr($ORGANIZER_dock_position,"W") ? ($client[0]+10) : ($client[0]+($client[2]-$dock[2])/2)
		$position[1] = StringInStr($ORGANIZER_dock_position,"S") ? ($client[1]+$client[3]-$dock[3]-20) : StringInStr($ORGANIZER_dock_position,"N") ? ($client[1]+20) : ($client[1]+($client[3]-$dock[3])/2)
		WinMove($DOCK_GUI, "", $position[0], $position[1])
		If IsArray($cursor) Then MouseMove($position[0]+1+$cursor[0], $position[1]+1+$cursor[1], 0) ; +1 = border
	EndIf
EndFunc

Func ORGANIZER_getCursorDestination($handleFrom, $handleTo, $ratio)
	Local $mouse = MouseGetPos()
	If @error Then Return SetError(1)
	Local $from = WinGetClientSize($handleFrom)
	If @error Then Return SetError(2)
	Local $to = WinGetClientSize($handleTo)
	If @error Then Return SetError(2)
	; Calcul de proportions par rapport aux coordonnées d'origine
	Local $quota[2] = [$mouse[0]/$from[0]-0.5, $mouse[1]/$from[1]-0.5]
	If $ratio[0]*$ratio[1] = 0 Then ; Pas de ratio défini
		; Ne rien appliquer
	ElseIf $from[0]*$ratio[1] > $ratio[0]*$from[1] Then ; plus large, bandes à gauche et droite
		$quota[0] = $ratio[1] * ($mouse[0]-$from[0]/2) / ($from[1]*$ratio[0])
	ElseIf $from[0]*$ratio[1] < $ratio[0]*$from[1] Then ; plus haut, bandes en haut et en bas
		$quota[1] = $ratio[0] * ($mouse[1]-$from[1]/2) / ($from[0]*$ratio[1])
	EndIf
	; Calcul de position par rapport aux proportions calculées
	Local $new[2] = [$to[0] * (1+2*$quota[0]), $to[1] * (1+2*$quota[1])]
	If $ratio[0]*$ratio[1] = 0 Then ; Pas de ratio défini
		; Ne rien appliquer
	ElseIf $to[0]*$ratio[1] > $ratio[0]*$to[1] Then ; plus large, bandes à gauche et droite
		$new[0] = $to[0] + 2*$quota[0]*$to[1]*$ratio[0]/$ratio[1]
	ElseIf $to[0]*$ratio[1] < $ratio[0]*$to[1] Then ; plus haut, bandes en haut et en bas
		$new[1] = $to[1] + 2*$quota[1]*$to[0]*$ratio[1]/$ratio[0]
	EndIf
	$new[0] = Round($new[0]/2,2)
	$new[1] = Round($new[1]/2,2)
	; Retour du résultat
	Return $new
EndFunc

; ### Region Fichiers des ressources

Func ORGANIZER_config_file($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_config_file")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_config_file
		$ORGANIZER_config_file = ORGANIZER_folder()&"\"&field("name")&"."&"ini"
	EndIf
	Local $resultat = $ORGANIZER_config_file
	If @NumParams > 0 And Not $reset Then $ORGANIZER_config_file = $value
	Return $resultat
EndFunc

Func ORGANIZER_languages_file()
	Return ORGANIZER_languages_folder()&"\"&"Language.ini"
EndFunc

; ### Region Chargement des ressources

Func NAIO_avatars($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("NAIO_avatars")
	If Not $declared Or $reset Then
		If Not $declared Then Global $NAIO_avatars
		Local $vide2[1][3] = [[0]], $size = 0
		$NAIO_avatars = $vide2
		; Dossiers
		Local $vide1[1] = [0]
		Local $dossiers = listFolders(NAIO_images_folder()&"\Avatars\", "*")
		If @error Then $dossiers = $vide1
		_ArraySort($dossiers,Default,1)
		For $i = 1 To $dossiers[0]
			$dossiers[$i] = $dossiers[$i]&"\"
		Next
		$dossiers[0] = $dossiers[0]+1
		ReDim $dossiers[$dossiers[0]+1]
		$dossiers[$dossiers[0]] = ""
		For $i = 1 To $dossiers[0]
			; Fichiers de chaque dossier
			Local $files = listFiles(NAIO_images_folder()&"\Avatars\"&$dossiers[$i], "*.ico")
			If @error Then $files = $vide1
			_ArraySort($files,Default,1)
			For $j = 1 To $files[0]
				$NAIO_avatars[0][0] = $NAIO_avatars[0][0]+1
				ReDim $NAIO_avatars[$NAIO_avatars[0][0]+1][3]
				$NAIO_avatars[$NAIO_avatars[0][0]][0] = $dossiers[$i]&StringTrimRight($files[$j], StringLen(".ico"))
				$NAIO_avatars[$NAIO_avatars[0][0]][1] = NAIO_images_folder()&"\Avatars\"&$NAIO_avatars[$NAIO_avatars[0][0]][0]&".ico"
				$NAIO_avatars[$NAIO_avatars[0][0]][2] = _WinAPI_LoadImage(0, $NAIO_avatars[$NAIO_avatars[0][0]][1], $IMAGE_ICON, 32, 32, BitOR($LR_LOADFROMFILE, $LR_CREATEDIBSECTION))
			Next
		Next
	EndIf
	Local $resultat = $NAIO_avatars
	If @NumParams > 0 And Not $reset Then $NAIO_avatars = $value
	Return $resultat
EndFunc

Func ORGANIZER_profil($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_profil")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_profil
		$ORGANIZER_profil = $ORGANIZER_profil_DEFAULT
		For $i = 1 To $CmdLine[0]-1
			If StringRegExp($CmdLine[$i], "^(?i)(-|/)(profil)$") Then $ORGANIZER_profil = $CmdLine[$i+1]
		Next
	EndIf
	Local $resultat = $ORGANIZER_profil
	If @NumParams > 0 And Not $reset Then $ORGANIZER_profil = $value
	Return $ORGANIZER_profil
EndFunc

Func ORGANIZER_profils($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_profils")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_profils
		Local $file = ORGANIZER_config_file(), $section = "Language"
		Local $resources[2][4] = [[1], [$ORGANIZER_profil_DEFAULT, True, ""]], $names = IniReadSectionNames($file)
		If Not @error Then
			For $i = 1 To $names[0]
				If StringRegExp($names[$i], "^\d+$") Then
					$resources[0][0] = $resources[0][0]+1
					ReDim $resources[$resources[0][0]+1][UBound($resources,2)]
					$resources[$resources[0][0]][0] = $names[$i]
					$resources[$resources[0][0]][1] = False
					$resources[$resources[0][0]][2] = IniRead(NAIO_config_folder()&"\"&"Config_"&$names[$i]&".ini", "Config", "Alias", "")
					$resources[$resources[0][0]][3] = IniRead(NAIO_config_folder()&"\"&"Config_"&$names[$i]&".ini", "Config", "Image", "")
				EndIf
			Next
		EndIf
		$ORGANIZER_profils = $resources
	EndIf
	Local $resultat = $ORGANIZER_profils
	If @NumParams > 0 And Not $reset Then $ORGANIZER_profils = $value
	Return $resultat
EndFunc

Func ORGANIZER_profil_restart($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_profil_restart")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_profil_restart
		$ORGANIZER_profil_restart = ""
	EndIf
	Local $resultat = $ORGANIZER_profil_restart
	If @NumParams > 0 And Not $reset Then $ORGANIZER_profil_restart = $value
	Return $ORGANIZER_profil_restart
EndFunc

Func ORGANIZER_language($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_language")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_language
		$ORGANIZER_language = IniRead(ORGANIZER_config_file(), ORGANIZER_profil(), "Language", "FR")
		If @error Then $ORGANIZER_language = "FR"
	EndIf
	Local $resultat = $ORGANIZER_language
	If @NumParams > 0 And Not $reset Then
		$ORGANIZER_language = $value
		IniWrite(ORGANIZER_config_file(), ORGANIZER_profil(), "Language", $ORGANIZER_language)
	EndIf
	Return $resultat
EndFunc

Func ORGANIZER_languages($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_languages")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_languages
		Local $file = ORGANIZER_languages_file(), $section = "Language"
		Local $names = IniReadSectionNames($file)
		If @error Then
			Local $vide1[1] = [0]
			$names = $vide1
		EndIf
		Local $resources = IniReadSection($file, $section)
		If @error Then
			Local $vide2[1][2] = [[0]]
			$resources = $vide2
		EndIf
		; quicksort($resources)
		Local $cleaned[1][3] = [[0]]
		For $i = 1 To $resources[0][0]
			If StringRegExp($resources[$i][0], "^\w+$") Then
				$cleaned[0][0] = $cleaned[0][0]+1
				ReDim $cleaned[$cleaned[0][0]+1][UBound($cleaned,2)]
				$cleaned[$cleaned[0][0]][0] = $resources[$i][0]
				$cleaned[$cleaned[0][0]][1] = BinaryToString(StringToBinary($resources[$i][1], 1), 4)
				$cleaned[$cleaned[0][0]][2] = False
				For $j = 1 To $names[0]
				   If $cleaned[$cleaned[0][0]][0] = $names[$j] Then $cleaned[$cleaned[0][0]][2] = True
				Next
			EndIf
		Next
		$ORGANIZER_languages = $cleaned
	EndIf
	Local $resultat = $ORGANIZER_languages
	If @NumParams > 0 And Not $reset Then $ORGANIZER_languages = $value
	Return $resultat
EndFunc

Func ORGANIZER_translation($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_translation")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_translation
		Local $file = ORGANIZER_languages_file(), $section = "FR"
		Local $language = ORGANIZER_language(), $languages = ORGANIZER_languages()
		For $i = 1 To $languages[0][0]
			If $languages[$i][0] = $language Then
				$section = $language
				ExitLoop
			EndIf
		Next
		Local $resources = IniReadSection($file, $section)
		If @error Then
			Local $vide[1][2] = [[0]]
			$resources = $vide
		EndIf
		quicksort($resources)
		Local $fields[4] = ["name", "version", "fullversion", "url"]
		For $i = 1 To $resources[0][0]
			$resources[$i][1] = BinaryToString(StringToBinary($resources[$i][1], 1), 4)
			For $field In $fields
				$resources[$i][1] = StringReplace($resources[$i][1], "{"&$field&"}", field($field),0,2)
			Next
		Next
		$ORGANIZER_translation = $resources
	EndIf
	Local $resultat = $ORGANIZER_translation
	If @NumParams > 0 And Not $reset Then $ORGANIZER_translation = $value
	Return $resultat
EndFunc

Func ORGANIZER_msg($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_msg")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_msg
		$ORGANIZER_msg = 0
	EndIf
	Local $resultat = $ORGANIZER_msg
	If @NumParams > 0 And Not $reset Then $ORGANIZER_msg = $value
	Return $resultat
EndFunc

Func ORGANIZER_restart($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("ORGANIZER_restart")
	If Not $declared Or $reset Then
		If Not $declared Then Global $ORGANIZER_restart
		$ORGANIZER_restart = False
	EndIf
	Local $resultat = $ORGANIZER_restart
	If @NumParams > 0 And Not $reset Then $ORGANIZER_restart = $value
	Return $resultat
EndFunc

; ### Region Fonctions annexes

Func shortcut_toString($shortcut, $simple=0)
	Local $resultat = "", $erreur = 0, $patternShortcut = "^([\^!\+#]*)\{(.+)\}$"
	If $shortcut = "" Then
		$resultat = translate($simple<>1?"shortcut_none":"main_none")
		$erreur = 1
	ElseIf Not StringRegExp($shortcut, $patternShortcut) Then
		$resultat = translate($simple<>1?"shortcut_unknown":"main_unknown")
		$erreur = 2
	Else
		Local $modifiers = StringRegExpReplace($shortcut, $patternShortcut, "$1"), $value = StringRegExpReplace($shortcut, $patternShortcut, "$2")
		$modifiers = StringReplace($modifiers, "^", ($simple<>0?"c":"Control"))
		$modifiers = StringReplace($modifiers, "!", ($simple<>0?"a":"Alt"))
		$modifiers = StringReplace($modifiers, "+", ($simple<>0?"s":"Shift"))
		$modifiers = StringReplace($modifiers, "#", ($simple<>0?"w":"Windows"))
		$resultat = $modifiers&($modifiers=""?"":" ")&"["&StringUpper($value)&"]"
	EndIf
	Return SetError($erreur, 0, $resultat)
EndFunc

Func shortcutKey_toString($shortcut)
	Local $value = StringRegExpReplace($shortcut, "^\{(.*)\}$", "$1")
	If $value = ""            Then Return ""
	If $value = "BS"          Then Return translate("shortcutLabel_01")
	If $value = "TAB"         Then Return translate("shortcutLabel_02")
	If $value = "PAUSE"       Then Return translate("shortcutLabel_03")
	If $value = "ESC"         Then Return translate("shortcutLabel_04")
	If $value = "SPACE"       Then Return translate("shortcutLabel_05")
	If $value = "PGUP"        Then Return translate("shortcutLabel_06")
	If $value = "PGDN"        Then Return translate("shortcutLabel_07")
	If $value = "END"         Then Return translate("shortcutLabel_08")
	If $value = "HOME"        Then Return translate("shortcutLabel_09")
	If $value = "LEFT"        Then Return translate("shortcutLabel_10")
	If $value = "UP"          Then Return translate("shortcutLabel_11")
	If $value = "RIGHT"       Then Return translate("shortcutLabel_12")
	If $value = "DOWN"        Then Return translate("shortcutLabel_13")
	If $value = "PRINTSCREEN" Then Return translate("shortcutLabel_14")
	If $value = "INS"         Then Return translate("shortcutLabel_15")
	If $value = "DEL"         Then Return translate("shortcutLabel_16")
	If $value = "NUMPADMULT"  Then Return translate("shortcutLabel_17")
	If $value = "NUMPADADD"   Then Return translate("shortcutLabel_18")
	If $value = "NUMPADSUB"   Then Return translate("shortcutLabel_19")
	If $value = "NUMPADDOT"   Then Return translate("shortcutLabel_20")
	If $value = "NUMPADDIV"   Then Return translate("shortcutLabel_21")
	If $value = "²"           Then Return translate("shortcutLabel_22")
	If $value = ")"           Then Return translate("shortcutLabel_23")
	If $value = "="           Then Return translate("shortcutLabel_24")
	If $value = "^"           Then Return translate("shortcutLabel_25")
	If $value = "$"           Then Return translate("shortcutLabel_26")
	If $value = "ù"           Then Return translate("shortcutLabel_27")
	If $value = "*"           Then Return translate("shortcutLabel_28")
	If $value = ","           Then Return translate("shortcutLabel_29")
	If $value = ";"           Then Return translate("shortcutLabel_30")
	If $value = ":"           Then Return translate("shortcutLabel_31")
	If $value = "!"           Then Return translate("shortcutLabel_32")
	If $value = "<"           Then Return translate("shortcutLabel_33")
	If $value = "à"           Then Return translate("shortcutLabel_34")
	If $value = "&"           Then Return translate("shortcutLabel_35")
	If $value = "é"           Then Return translate("shortcutLabel_36")
	If $value = """"          Then Return translate("shortcutLabel_37")
	If $value = "'"           Then Return translate("shortcutLabel_38")
	If $value = "("           Then Return translate("shortcutLabel_39")
	If $value = "-"           Then Return translate("shortcutLabel_40")
	If $value = "è"           Then Return translate("shortcutLabel_41")
	If $value = "_"           Then Return translate("shortcutLabel_42")
	If $value = "ç"           Then Return translate("shortcutLabel_43")
	If StringRegExp($value, "[a-zA-Z]") Then Return StringUpper($value)
	If StringRegExp($value, "NUMPAD\d") Then Return $value
	If StringRegExp($value, "F\d+")     Then Return $value
	Return SetError(1, 0, "Custom")
EndFunc

Func checkPosition($position)
	Return StringInStr(",N,S,NW,W,SW,NE,E,SE,", ","&$position&",") ? $position : ""
EndFunc

Func checkOrientation($position)
	Return StringInStr(",N,S,", ","&$position&",") ; Vrai si horizontal
EndFunc

Func gradient($percent, $color0, $color1)
	Local $result = 0, $masks[4] = [3, 0xFF0000, 0x00FF00, 0x0000FF]
	For $i = 1 To $masks[0]
		Local $value0 = BitAND($masks[$i],$color0), $value1 = BitAND($masks[$i],$color1)
		$result += BitAND($masks[$i],$value0+($value1-$value0)*$percent)
	Next
	Return $result
EndFunc

Func DirExists($path)
	Return FileExists($path) And StringInStr(FileGetAttrib($path),"D") <> 0
EndFunc