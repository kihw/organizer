#Include-Once

; ### Region Fonctions de communication inter-processus basée sur les MailSlots (Script d'origine par trancexx - trancexx@yahoo.com)

Func MailSlot_Size($mailslot)
	Local $result = DllCall("kernel32.dll", "int", "GetMailslotInfo", "ptr", $mailslot, "dword*", 0, "dword*", 0, "dword*", 0, "dword*", 0)
	If @error Or Not $result[0] Then Return SetError(1, 0, 0)
	If $result[3] = -1 Or Not $result[4] Then Return 0
	Return $result[3]
EndFunc

Func MailSlot_Close($mailslot)
	Local $result = DllCall("kernel32.dll", "int", "CloseHandle", "ptr", $mailslot)
	If @error Or Not $result[0] Then Return SetError(1, 0, 0)
	Return 1
EndFunc

Func MailSlot_Create($mailslotName)
	Local $result = DllCall("kernel32.dll", "ptr", "CreateMailslotW", "wstr", "\\."&"\mailslot"&"\"&$mailslotName, "dword", 0, "dword", 0, "ptr", 0)
	If @error Or $result[0] = -1 Then Return SetError(1, 0, -1)
	Return $result[0]
EndFunc

Func MailSlot_Count($mailslot)
	Local $result = DllCall("kernel32.dll", "int", "GetMailslotInfo", "ptr", $mailslot, "dword*", 0, "dword*", 0, "dword*", 0, "dword*", 0)
	If @error Or Not $result[0] Then Return SetError(1, 0, 0)
	If $result[3] = -1 Then Return 0
	Return $result[4]
EndFunc

Func MailSlot_Timeout($mailslot, $timeout = 0)
	If @NumParams > 1 Then
		Local $result = DllCall("kernel32.dll", "int", "SetMailslotInfo", "ptr", $mailslot, "dword", $timeout)
		If @error Or Not $result[0] Then Return SetError(1, 0, 0)
		Return 1
	Else
		Local $result = DllCall("kernel32.dll", "int", "GetMailslotInfo", "ptr", $mailslot, "dword*", 0, "dword*", 0, "dword*", 0, "int*", 0)
		If @error Or Not $result[0] Then Return SetError(1, 0, 0)
		Return $result[5]
	EndIf
EndFunc

Func MailSlot_Read($mailslot, $size = 0)
	If @NumParams = 1 Then $size = MailSlot_Size($mailslot)
	Local $buffer = DllStructCreate("byte["&$size&"]")
	Local $result = DllCall("kernel32.dll", "int", "ReadFile", "ptr", $mailslot, "ptr", DllStructGetPtr($buffer), "dword", $size, "dword*", 0, "ptr", 0)
	If @error Or Not $result[0] Then Return SetError(1, 0, "")
	Return SetError(0, $result[4], BinaryToString(DllStructGetData($buffer, 1), 4))
EndFunc

Func MailSlot_Write($mailslotName, $data)
	Local $result = DllCall("kernel32.dll", "ptr", "CreateFileW", "wstr", "\\."&"\mailslot"&"\"&$mailslotName, "dword", 0x40000000, "dword", 1, "ptr", 0, "dword", 3, "dword", 0, "ptr", 0)
	If @error Or $result[0] = -1 Then Return SetError(1, 0, 0)
	Local $mailslotHandle = $result[0], $binary = StringToBinary($data, 4), $size = BinaryLen($binary), $buffer = DllStructCreate("byte[" & $size & "]")
	DllStructSetData($buffer, 1, $binary)
	$result = DllCall("kernel32.dll", "int", "WriteFile", "ptr", $mailslotHandle, "ptr", DllStructGetPtr($buffer), "dword", $size, "dword*", 0, "ptr", 0)
	If @error Or Not $result[0] Then
		$result = DllCall("kernel32.dll", "int", "CloseHandle", "ptr", $mailslotHandle)
		Return SetError(2, 0, 0)
	EndIf
	$result = DllCall("kernel32.dll", "int", "CloseHandle", "ptr", $mailslotHandle)
	If @error Or Not $result[0] Then Return SetError(3, 0, "")
EndFunc
