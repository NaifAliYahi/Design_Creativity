Set args = WScript.Arguments
appDir = args(0)
If Right(appDir, 1) <> "\" Then appDir = appDir & "\"

Set oWS = WScript.CreateObject("WScript.Shell")
desktop = oWS.SpecialFolders("Desktop")
linkPath = desktop & "\Mahfazat Jeeb - Network Cards.lnk"

Set oLink = oWS.CreateShortcut(linkPath)
oLink.TargetPath = appDir & "run-app.bat"
oLink.WorkingDirectory = appDir
oLink.WindowStyle = 1
oLink.Description = "Network Cards System - Pocket Wallet"
oLink.IconLocation = "imageres.dll,109"
oLink.Save

' Arabic name shortcut (second shortcut for Arabic desktop users)
linkPathAr = desktop & "\محفظة جيب - كروت الشبكات.lnk"
Set oLinkAr = oWS.CreateShortcut(linkPathAr)
oLinkAr.TargetPath = appDir & "run-app.bat"
oLinkAr.WorkingDirectory = appDir
oLinkAr.WindowStyle = 1
oLinkAr.Description = "نظام متابعة الشبكات - محفظة جيب"
oLinkAr.IconLocation = "imageres.dll,109"
oLinkAr.Save

WScript.Echo "Desktop shortcuts created successfully."
