!macro customInstall
  CreateShortCut "$desktop\Telegram Manager.lnk" "$INSTDIR\Telegram Manager.exe" "" "$INSTDIR\resources\app\assets\icon.ico"
!macroend

!macro customUnInstall
  Delete "$desktop\Telegram Manager.lnk"
!macroend 