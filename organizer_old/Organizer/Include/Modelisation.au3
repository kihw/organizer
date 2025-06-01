#Include-Once

; ### Region Limites d'objets modélisés

Global Const $NAIO_MAXWINDOWS = 100

; ### Region Fonctions générale de modélisation et de debug

Func objects_generateIndex(ByRef $objects, $indexFunc)
	For $i = 1 To $objects[0]
		Local $object = $objects[$i], $result = Call($indexFunc, $object)
		If $result = 0 Then
			For $index = 1 To $objects[0]
				Local $found = False
				For $j = 1 To $objects[0]
					If $j <> $i Then
						Local $result = Call($indexFunc, $objects[$j])
						If $index = $result Then
							$found = True
							ExitLoop
						EndIf
					EndIf
				Next
				If Not $found Then
					Local $result = Call($indexFunc, $object, $index)
					ExitLoop
				EndIf
			Next
			$objects[$i] = $object
		EndIf
	Next
EndFunc

Func object_destroy(ByRef $object)
	$object = 0
EndFunc

Func object_check($object, $structFunc, $title)
	If Not IsDllStruct($object) Then Return False
	Local $structure = Call($structFunc)
	For $i = 1 To $structure[0]
		Local $valeur = DllStructGetData($object, $structure[$i])
		If @error Then Return False
	Next
	Return True
EndFunc

Func object_debug($object, $structFunc, $title, $number = "")
	Local $check = object_check($object, $structFunc, $title)
	If $check Then
		Local $structure = Call($structFunc)
		Local $message = ""
		For $i = 1 To $structure[0]
			$message &= @CRLF & $structure[$i] & " : """ & DllStructGetData($object, $structure[$i]) & """"
		Next
		MsgBox(64, $title&" "&$number, $message)
	Else
		MsgBox(48, $title&" "&$number, "L'objet n'est pas un " & $title)
	EndIf
EndFunc

Func objects_debug($objects, $structFunc, $title)
	For $i = 1 To $objects[0]
		object_debug($objects[$i], $structFunc, $title, $i&"/"&$objects[0])
	Next
EndFunc

; ### Region Modélisation des fenêtres

Func fenetres_generateIndex(ByRef $fenetres)
	objects_generateIndex($fenetres, "fenetre_index")
EndFunc

Func fenetre_new($index=0, $alias="", $handle=0, $order=0, $activated=1, $shortcut="", $icon="")
	Local $fenetre = DllStructCreate("int index;WCHAR alias[128];int handle;int order;int activated;WCHAR shortcut[64];WCHAR icon[1024]")
	fenetre_index($fenetre,     $index)
	fenetre_alias($fenetre,     $alias)
	fenetre_handle($fenetre,    $handle)
	fenetre_order($fenetre,     $order)
	fenetre_activated($fenetre, $activated)
	fenetre_shortcut($fenetre,  $shortcut)
	fenetre_icon($fenetre,      $icon)
	Return $fenetre
EndFunc

Func fenetre_destroy(ByRef $fenetre)
	object_destroy($fenetre)
EndFunc

Func fenetre_structure()
	Local $structure[8] = [7, "index", "alias", "handle", "order", "activated", "shortcut", "icon"]
	Return $structure
EndFunc

Func fenetre_check($fenetre)
	Return object_check($fenetre, "fenetre_structure", "Fenêtre")
EndFunc

Func fenetre_index(ByRef $fenetre, $index = 0)
	Local $resultat = DllStructGetData($fenetre, "index")
	If @NumParams > 1 Then DllStructSetData($fenetre, "index", $index)
	Return $resultat
EndFunc

Func fenetre_alias(ByRef $fenetre, $alias = "")
	Local $resultat = DllStructGetData($fenetre, "alias")
	If @NumParams > 1 Then DllStructSetData($fenetre, "alias", $alias)
	Return $resultat
EndFunc

Func fenetre_handle(ByRef $fenetre, $handle = 0)
	Local $resultat = DllStructGetData($fenetre, "handle")
	If @NumParams > 1 Then DllStructSetData($fenetre, "handle", $handle)
	Return HWnd($resultat) ; IMPORTANT
EndFunc

Func fenetre_order(ByRef $fenetre, $order = 0)
	Local $resultat = DllStructGetData($fenetre, "order")
	If @NumParams > 1 Then DllStructSetData($fenetre, "order", $order)
	Return $resultat
EndFunc

Func fenetre_activated(ByRef $fenetre, $activated = 0)
	Local $resultat = DllStructGetData($fenetre, "activated")
	If @NumParams > 1 Then DllStructSetData($fenetre, "activated", $activated)
	Return $resultat
EndFunc

Func fenetre_shortcut(ByRef $fenetre, $shortcut = "")
	Local $resultat = DllStructGetData($fenetre, "shortcut")
	If @NumParams > 1 Then DllStructSetData($fenetre, "shortcut", $shortcut)
	Return $resultat
EndFunc

Func fenetre_icon(ByRef $fenetre, $icon = "")
	Local $resultat = DllStructGetData($fenetre, "icon")
	If @NumParams > 1 Then DllStructSetData($fenetre, "icon", $icon)
	Return $resultat
EndFunc

Func fenetre_toSend($fenetre, $destination)
	Local $resultat = StringTrimLeft(""&StringToBinary(""&$destination,          4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_index($fenetre),     4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_alias($fenetre),     4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_handle($fenetre),    4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_order($fenetre),     4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_activated($fenetre), 4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_shortcut($fenetre),  4), 2) _
		& "#" & StringTrimLeft(""&StringToBinary(""&fenetre_icon($fenetre),      4), 2)
	Return $resultat
EndFunc

Func fenetre_fromSend($data, $destination)
	Local $resultat = fenetre_new(), $erreur = 0, $datas = StringSplit($data, "#")
	If IsArray($datas) And $datas[0] = 8 Then
		For $i = 1 To $datas[0]
			$datas[$i] = BinaryToString(Binary("0x"&$datas[$i]),4)
		Next
		If $destination = $datas[1] Then
			fenetre_index($resultat,     Number($datas[2]))
			fenetre_alias($resultat,     $datas[3])
			fenetre_handle($resultat,    Number($datas[4]))
			fenetre_order($resultat,     Number($datas[5]))
			fenetre_activated($resultat, Number($datas[6]))
			fenetre_shortcut($resultat,  $datas[7])
			fenetre_icon($resultat,      $datas[8])
		Else
			$erreur = 2
		EndIf
	Else
		$erreur = 1
	EndIf
	Return SetError($erreur, 0, $resultat)
EndFunc

Func fenetre_debug($object)
	Call("object"&(IsArray($object)?"s":"")&"_debug", $object, "fenetre_structure", "Fenêtre")
EndFunc
