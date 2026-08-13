Add-Type -AssemblyName System.Windows.Forms

param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MahfazatJeeb\NetworkCards"
)

$confirm = [System.Windows.Forms.MessageBox]::Show(
  "إزالة «محفظة جيب - كروت الشبكات»؟`r`n`r`nملاحظة: البيانات في server\data\store.json",
  'إزالة التثبيت', 'YesNo', 'Warning'
)
if ($confirm -ne 'Yes') { exit 0 }

$desktop = [Environment]::GetFolderPath('Desktop')
@('محفظة جيب - كروت الشبكات.lnk', 'Mahfazat Jeeb - Network Cards.lnk') | ForEach-Object {
  $p = Join-Path $desktop $_
  if (Test-Path $p) { Remove-Item $p -Force }
}

if (Test-Path $InstallDir) {
  Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

try {
  Remove-Item 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\MahfazatJeebNetworkCards' -Force -ErrorAction SilentlyContinue
} catch {}

[System.Windows.Forms.MessageBox]::Show('تمت الإزالة.', 'تم', 'OK', 'Information') | Out-Null
