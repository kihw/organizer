#Include-Once

; ### Region Fonctions diverses

Global Const $ORGANIZER_profil_DEFAULT = "Organizer"

; Sémaphore
Func singleton()
	Local $resultat = _Semaphore_BlockerInit(@ScriptName)
	Return @error = 0 And @extended = 0
EndFunc

; Informations de base - $key = [name|type|version|fullversion|author|comment|url]
Func field($key, $val="")
	Local $fields = NAIO_fields()
	Local $resultat = quickget($fields, $key)
	If @NumParams > 1 And Not @error Then
		$fields[@extended][1] = $val
		NAIO_fields($fields)
	EndIf
	Return $resultat
EndFunc

; Traductions
Func translate($key, $_0="", $_1="", $_2="", $_3="", $_4="", $_5="", $_6="", $_7="", $_8="", $_9="")
	If $key = "" Then Return ""
	Local $translation = ORGANIZER_translation()
	Local $resultat = quickget($translation, $key)
	If @error Then Return SetError(1, 0, "["&$key&"]")
	$resultat = StringReplace($resultat, "\n", @CRLF, 0, 2)
	$resultat = StringReplace($resultat, "\t", @TAB,  0, 2)
	If StringRegExp($resultat, "\{\w+\}") Then
		For $i = 0 To 9
			$resultat = StringReplace($resultat, "{"&$i&"}", Eval("_"&$i),0,2)
		Next
	EndIf
	Return $resultat
EndFunc

; Tri rapide des tableaux
Func quicksort(ByRef $array, $start="", $end="")
	$start = (IsInt($start) ? $start : 1)
	$end   = (IsInt($end)   ? $end   : UBound($array)-1)
	If $end > $start Then
		Local $start2=$start, $end2=$end, $middle = Int(($start2+$end2)/2), $pivot = $array[$middle][0]
		Do
			While (StringCompare($array[$start2][0], $pivot, 2) < 0) And $start2 <= $end2
				$start2 += 1
			WEnd
			While (StringCompare($array[$end2][0], $pivot, 2) > 0) And $start2 <= $end2
				$end2 -= 1
			WEnd
			If $start2 <= $end2 Then
				For $i = 0 To UBound($array, 2) - 1
					Local $temp = $array[$start2][$i]
					$array[$start2][$i] = $array[$end2][$i]
					$array[$end2][$i] = $temp
				Next
				$start2 += 1
				$end2 -= 1
			EndIf
		Until $start2 > $end2
		quicksort($array, $start, $end2)
		quicksort($array, $start2, $end)
	EndIf
EndFunc

; Lecture rapide des tableaux associatifs
Func quickget($array, $key)
	Local $start = 1, $end = $array[0][0], $resultat = ""
	Do
		Local $i = Floor(($start+$end)/2), $compare = StringCompare($key, $array[$i][0], 2)
		If $compare = 0 Then
			$resultat = $array[$i][1]
		ElseIf $compare < 0 Then
			$end = $i-1
		ElseIf $compare > 0 Then
			$start = $i+1
		EndIf
	Until $start>$end Or $compare = 0
	Return SetError(($compare=0 ? 0 : 1), $i, $resultat)
EndFunc

; Vérification d'un état sur un contrôle donné
Func _GUICtrlGetState($element, $state)
	Return BitAND(GUICtrlGetState($element), $state) = $state
EndFunc

; Vérification de l'état sur un contrôle donné de type CheckBox
Func _GUICtrlGetCheck($element, $state=1) ; $GUI_CHECKED = 1
	Return BitAND(GUICtrlRead($element), $state) = $state
EndFunc

; Affection d'état à un contrôle selon la nécessité
Func _GUICtrlSetState($element, $state)
	If Not _GUICtrlGetState($element, $state) Then GUICtrlSetState($element, $state)
EndFunc

; Affection de coche à un contrôle donné de type CheckBox selon la nécessité
Func _GUICtrlSetCheck($element, $state)
	_GUICtrlSetState($element, ($state ? 1 : 4)) ; $GUI_CHECKED = 1 ; $GUI_UNCHECKED = 4
EndFunc

; Affectation d'une image à un contrôle donné de type Button
Func _GUICtrlSetImage($element, $path, $sizeX = 0, $sizeY = 0)
	Local $previous = 0
	Local $image = _WinAPI_LoadImage(0, $path, 1, $sizeX, ($sizeY=0?$sizeX:$sizeY), BitOR($LR_LOADFROMFILE, $LR_CREATEDIBSECTION))
	If Not $image Then Return False
	$previous = _SendMessage(GUICtrlGetHandle($element), 0xF7, 1, $image) ; $BM_SETIMAGE = 0xF7
	If $previous Then
		If Not _WinAPI_DeleteObject($previous) Then _WinAPI_DestroyIcon($previous)
	EndIf
	_WinAPI_UpdateWindow(GUICtrlGetHandle($element)) ; force a WM_PAINT
	Return True
EndFunc

; Fonction de récupération de l'icone attribuée à une fenêtre
Func WinGetIcon($handle)
	If Not IsDeclared("NAIO_WINDOWICONS") Then Global $NAIO_WINDOWICONS[1][2] = [[0]]
	For $i = 1 To $NAIO_WINDOWICONS[0][0]
		If $NAIO_WINDOWICONS[$i][0] = $handle Then
			Return $NAIO_WINDOWICONS[$i][1]
		EndIf
	Next
    Return 0
EndFunc

; Fonction d'attribution d'icone à une fenêtre
Func WinSetIcon($handle, $file)
	If Not IsDeclared("NAIO_WINDOWICONS") Then Global $NAIO_WINDOWICONS[1][2] = [[0]]
	Local $avatars = NAIO_avatars(), $found = 0
	For $i = 1 To $avatars[0][0]
		If StringUpper($file) = StringUpper($avatars[$i][1]) Then
			$found = $i
			ExitLoop
		EndIf
	Next
	If $found Then
		Local $icon = $avatars[$i][2]
		_SendMessage($handle, 0x0080, 1, $icon) ; $WM_SETICON = 0x0080
		; Ajout à la liste des icones attribuées à des fenêtres
		For $i = 1 To $NAIO_WINDOWICONS[0][0]
			If $NAIO_WINDOWICONS[$i][0] = $handle Then
				$NAIO_WINDOWICONS[$i][1] = $icon
				Return True
			EndIf
		Next
		$NAIO_WINDOWICONS[0][0] = $NAIO_WINDOWICONS[0][0]+1
		ReDim $NAIO_WINDOWICONS[$NAIO_WINDOWICONS[0][0]+1][2]
		$NAIO_WINDOWICONS[$NAIO_WINDOWICONS[0][0]][0] = $handle
		$NAIO_WINDOWICONS[$NAIO_WINDOWICONS[0][0]][1] = $file
	EndIf
	Return False
EndFunc

; Fonction de restauration de l'icone attribuée à une fenêtre
Func WinRestoreIcon($handle)
	If Not IsDeclared("NAIO_WINDOWICONS") Then Global $NAIO_WINDOWICONS[1][2] = [[0]]
	For $i = 1 To $NAIO_WINDOWICONS[0][0]
		If $NAIO_WINDOWICONS[$i][0] = $handle Then
			Return WinSetIcon($NAIO_WINDOWICONS[$i][0], $NAIO_WINDOWICONS[$i][1])
		EndIf
	Next
	Return False
EndFunc

; Fonction de réinitialisation de l'icone attribuée à une fenêtre
Func WinResetIcon($handle)
	If Not IsDeclared("NAIO_WINDOWICONS") Then Global $NAIO_WINDOWICONS[1][2] = [[0]]
	For $i = 1 To $NAIO_WINDOWICONS[0][0]
		If $NAIO_WINDOWICONS[$i][0] = $handle Then
			$NAIO_WINDOWICONS[$i][0] = ""
			$NAIO_WINDOWICONS[$i][1] = ""
			_SendMessage($handle, 0x0080, 0, 0) ; $WM_SETICON = 0x0080
			Return True
		EndIf
	Next
	Return False
EndFunc

; Fonction de nettoyage de la liste des icones attribuées à des fenêtres
Func WinCleanIcons()
	If Not IsDeclared("NAIO_WINDOWICONS") Then Global $NAIO_WINDOWICONS[1][2] = [[0]]
	Local $resultat[1][2] = [[0]]
	For $i = 1 To $NAIO_WINDOWICONS[0][0]
		If $NAIO_WINDOWICONS[$i][0] <> "" And WinExists($NAIO_WINDOWICONS[$i][0]) Then
			$resultat[0][0] = $resultat[0][0] + 1
			ReDim $resultat[$resultat[0][0]+1][2]
			$resultat[$resultat[0][0]][0] = $NAIO_WINDOWICONS[$i][0]
			$resultat[$resultat[0][0]][1] = $NAIO_WINDOWICONS[$i][1]
		EndIf
	Next
	$NAIO_WINDOWICONS = $resultat
EndFunc

; Fonction de listing de fichiers
Func listFiles($path, $filter)
	Local $resultat = "", $root = StringRegExpReplace($path, "[\\/]+$", "")
	If Not FileExists($root & "\") Or StringRegExp($filter, "[\\/:><\|]|(?s)^\s*$") Then Return SetError(1)
	Local $search = FileFindFirstFile($root & "\" & $filter)
	If @error Then Return SetError(2)
	Do
		Local $file = FileFindNextFile($search)
		If Not @error And @extended <> 1 Then $resultat &= ($resultat=""?"":"|") & $file
	Until @error
	FileClose($search)
	If $resultat = "" Then Return SetError(3)
	Return StringSplit($resultat, "|")
EndFunc

; Fonction de listing de dossiers
Func listFolders($path, $filter)
	Local $resultat = "", $root = StringRegExpReplace($path, "[\\/]+$", "")
	If Not FileExists($root & "\") Or StringRegExp($filter, "[\\/:><\|]|(?s)^\s*$") Then Return SetError(1)
	Local $search = FileFindFirstFile($root & "\" & $filter)
	If @error Then Return SetError(2)
	Do
		Local $folder = FileFindNextFile($search)
		If Not @error And @extended <> 0 Then $resultat &= ($resultat=""?"":"|") & $folder
	Until @error
	FileClose($search)
	If $resultat = "" Then Return SetError(3)
	Return StringSplit($resultat, "|")
EndFunc

; Comparaison de numéros de versions
Func compareVersion($version1, $version2)
	Local $resultat = 0, $no_version = "0.0", $pattern = "^([0-9]+)\.([0-9]+)([a-z]?)$"
	If Not StringRegExp($version1, $pattern) Then $version1 = $no_version
	If Not StringRegExp($version2, $pattern) Then $version2 = $no_version
	If $resultat = 0 Then $resultat = Int(StringRegExpReplace($version1,$pattern,"$1")) - Int(StringRegExpReplace($version2,$pattern,"$1"))
	If $resultat = 0 Then $resultat = Int(StringRegExpReplace($version1,$pattern,"$2")) - Int(StringRegExpReplace($version2,$pattern,"$2"))
	If $resultat = 0 Then $resultat = Asc(StringRegExpReplace($version1,$pattern,"$3")) - Asc(StringRegExpReplace($version2,$pattern,"$3"))
	Return $resultat
EndFunc

; Fonction de récupération des coordonnées de l'intérieur d'une fenêtre
Func getWindowClientCoords($handle, $ratio = 0)
	If Not IsInt($handle) Then $handle = WinGetHandle($handle)
	If $handle = "" Then Return SetError(1)
	Local $tpoint = DllStructCreate("int X;int Y")
	DllStructSetData($tpoint, "X", 0)
	DllStructSetData($tpoint, "Y", 0)
	Local $pPoint = DllStructGetPtr($tPoint)
	DllCall("user32.dll", "bool", "ClientToScreen", "hwnd", $handle, "ptr", $pPoint)
	Local $clientsize = WinGetClientSize($handle)
	If @error Then Return SetError(2)
	Local $resultat[4] = [DllStructGetData($tpoint, "X"),DllStructGetData($tpoint, "Y"),$clientsize[0],$clientsize[1]]
	If $ratio > 0 And $clientsize[0]*$clientsize[1] > 0 Then
		If $clientsize[0]/$clientsize[1] > $ratio Then
			$resultat[2] = $clientsize[1]*$ratio
			$resultat[0] += ($clientsize[0]-$resultat[2])/2
		EndIf
		If $clientsize[0]/$clientsize[1] < $ratio Then
			$resultat[3] = $clientsize[0]/$ratio
			$resultat[1] += ($clientsize[1]-$resultat[3])/2
		EndIf
	EndIf
	Return $resultat
EndFunc

Func NAIO_fields($value=0)
	Local $reset = ($value = Default), $declared = IsDeclared("NAIO_fields")
	If Not $declared Or $reset Then
		If Not $declared Then Global $NAIO_fields ; [name|type|version|fullversion|author|comment|url|project]
		If @Compiled Then
			Local $resources[10][2] = [[9] _
				, ["name",               "name"] , ["type",               "type"] , ["version",         "version"] _
				, ["fullversion", "FileVersion"] , ["author",   "LegalCopyright"] , ["comment",        "Comments"] _
				, ["url",                 "url"] , ["language",       "Language"] , ["project",         "PROJECT"] _
			]
			For $i = 1 To $resources[0][0]
				Local $field = FileGetVersion(@ScriptFullPath, $resources[$i][1])
				If Not @error Then
					$resources[$i][1] = StringStripWS($field, 1+2)
				Else
					$resources[$i][1] = "["&$resources[$i][0]&"]"
				EndIf
			Next
			quicksort($resources)
			$NAIO_fields = $resources
		Else
			Local $entete = FileRead(@ScriptFullPath, 1000)
			Local $resources[10][2] = [[9] _
				, ["name",        "Field=name\|"] , ["type",        "Field=type\|"] , ["version",  "Field=version\|"] _
				, ["fullversion", "Fileversion="] , ["author",   "LegalCopyright="] , ["comment",         "Comment="] _
				, ["url",          "Field=url\|"] , ["language",       "Language="] , ["project",  "Field=PROJECT\|"] _
			]
			For $i = 1 To $resources[0][0]
				Local $field = StringRegExp($entete, "\n#AutoIt3Wrapper_Res_"&$resources[$i][1]&"([^\n]*)\n", 1)
				If Not @error Then
					$resources[$i][1] = StringStripWS($field[0], 1+2)
				Else
					$resources[$i][1] = "["&$resources[$i][0]&"]"
				EndIf
			Next
			quicksort($resources)
			$NAIO_fields = $resources
		EndIf
	EndIf
	Local $resultat = $NAIO_fields
	If @NumParams > 0 And Not $reset Then $NAIO_fields = $value
	Return $resultat
EndFunc