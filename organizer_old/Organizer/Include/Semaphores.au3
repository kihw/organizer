#Include-Once

; ### Region Fonction de gestion des sémaphores

Func _Semaphore_Init($nom, $valeur, $valeurMax)
    If $valeur>$valeurMax Then SetError(1, 0, 0)
    Local $resultat = DllCall("kernel32.dll", "ptr", "CreateSemaphoreW", "ptr", DllStructGetPtr(0), "int", $valeur, "int", $valeurMax, "wstr", $nom)
    If @error Then Return SetError(1, 0, 0)
	Local $erreur = DllCall("kernel32.dll", "dword", "GetLastError")
	If @error Then Return SetError(1, 0, 0)
	Local $retour = $resultat[0], $info = 0, $code = 0
	If Not $retour Then $code = 1
	If $erreur[0] = 183 Then $info = 1
    Return SetError($code, $info, $retour)
EndFunc

Func _Semaphore_MutexInit($nom)
    Local $resultat = _Semaphore_Init($nom,1,1)
    Return SetError(@error, @extended, $resultat)
EndFunc

Func _Semaphore_BlockerInit($nom)
    Local $resultat = _Semaphore_Init($nom,0,1)
    Return SetError(@error, @extended, $resultat)
EndFunc

Func _Semaphore_P($semaphore)
    Local $resultat = DllCall("kernel32.dll", "int", "WaitForSingleObject", "handle", $semaphore, "dword", -1)
    If @error Then Return SetError(1, 0, 0)
    Return $resultat[0]
EndFunc

Func _Semaphore_V($semaphore)
    Local $resultat = DllCall("kernel32.dll", "int", "ReleaseSemaphore", "ptr", $semaphore, "int", 1, "int*", 0)
    If @error Or Not $resultat[0] Then Return SetError(1, 0, 0)
    Return $resultat[0]
EndFunc
