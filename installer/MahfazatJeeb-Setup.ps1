#Requires -Version 5.1
<#
  Mahfazat Jeeb - Network Cards Installer
  - No admin rights required
  - Portable Node.js (zip) instead of MSI — fixes error 1603
  - npm install only when needed (cached)
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path $ScriptDir -Parent

# Find app source: release/app/ OR root/dist/ OR dev folder
if (Test-Path (Join-Path (Join-Path $RootDir 'app') 'dist\index.html')) {
  $SourceDir = Join-Path $RootDir 'app'
} elseif (Test-Path (Join-Path $RootDir 'dist\index.html')) {
  $SourceDir = $RootDir
} elseif (Test-Path (Join-Path $ScriptDir 'app\dist\index.html')) {
  $SourceDir = Join-Path $ScriptDir 'app'
} else {
  $SourceDir = $RootDir
}
$DefaultInstall = Join-Path $env:LOCALAPPDATA 'MahfazatJeeb\NetworkCards'
$RuntimeDir = Join-Path $env:LOCALAPPDATA 'MahfazatJeeb\runtime\node'
$CacheDir = Join-Path $env:LOCALAPPDATA 'MahfazatJeeb\cache'
$NodeVersion = '22.14.0'
$NodeZipName = "node-v$NodeVersion-win-x64.zip"
$NodeZipUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeZipName"

$script:NodeDir = $null

function Write-Log([string]$msg) {
  $script:LogLines += $msg
  if ($script:LogBox) {
    $script:LogBox.AppendText("$msg`r`n")
    $script:LogBox.SelectionStart = $script:LogBox.Text.Length
    $script:LogBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
  }
}

function Ensure-PortableNode {
  $nodeExe = Join-Path $RuntimeDir 'node.exe'
  if (Test-Path $nodeExe) {
    $ver = & $nodeExe -v 2>$null
    Write-Log "Node.js جاهز (portable): $ver"
    $script:NodeDir = $RuntimeDir
    return
  }

  New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
  New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
  $zipPath = Join-Path $CacheDir $NodeZipName

  if (-not (Test-Path $zipPath)) {
    Write-Log 'تنزيل Node.js (مرة واحدة — يحتاج إنترنت)...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $NodeZipUrl -OutFile $zipPath -UseBasicParsing
  } else {
    Write-Log 'Node.js محفوظ مسبقاً — بدون تنزيل.'
  }

  Write-Log 'فك ضغط Node.js...'
  $extractTemp = Join-Path $CacheDir "extract-$NodeVersion"
  if (Test-Path $extractTemp) { Remove-Item $extractTemp -Recurse -Force }
  Expand-Archive -Path $zipPath -DestinationPath $extractTemp -Force
  $inner = Join-Path $extractTemp "node-v$NodeVersion-win-x64"
  if (-not (Test-Path $inner)) { throw 'فشل فك ضغط Node.js' }

  Get-ChildItem $inner | ForEach-Object {
    Copy-Item $_.FullName $RuntimeDir -Recurse -Force
  }

  if (-not (Test-Path $nodeExe)) { throw 'node.exe not found after extract' }
  $ver = & $nodeExe -v
  Write-Log "Node.js OK: $ver"
  $script:NodeDir = $RuntimeDir
}

function Get-LockHash([string]$dir) {
  $lock = Join-Path $dir 'package-lock.json'
  if (-not (Test-Path $lock)) { return $null }
  return (Get-FileHash $lock -Algorithm SHA256).Hash
}

function Test-NeedsNpmInstall([string]$dir) {
  $nm = Join-Path $dir 'node_modules'
  $meta = Join-Path $dir '.install-meta.json'
  if (-not (Test-Path $nm)) { return $true }
  $hash = Get-LockHash $dir
  if (-not $hash) { return $false }
  if (-not (Test-Path $meta)) { return $true }
  try {
    $m = Get-Content $meta -Raw | ConvertFrom-Json
    return $m.lockHash -ne $hash
  } catch { return $true }
}

function Copy-AppFiles([string]$dest) {
  $distCheck = Join-Path $SourceDir 'dist\index.html'
  if (-not (Test-Path $distCheck)) {
    throw "مجلد dist غير موجود في: $SourceDir`r`nتأكد من فك ضغط ZIP كاملاً (مجلد app داخل المجلد)"
  }
  $items = @('dist', 'server', 'public', 'scripts', 'package.json', 'package-lock.json', 'run-app.bat')
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Write-Log "مصدر الملفات: $SourceDir"
  foreach ($item in $items) {
    $src = Join-Path $SourceDir $item
    if (-not (Test-Path $src)) {
      if ($item -in @('dist', 'package.json')) { throw "ملف مطلوب غير موجود: $item في $SourceDir" }
      continue
    }
    $target = Join-Path $dest $item
    if (Test-Path $src -PathType Container) {
      if (Test-Path $target) { Remove-Item $target -Recurse -Force }
      Copy-Item $src $target -Recurse -Force
    } else {
      Copy-Item $src $target -Force
    }
    Write-Log "نسخ: $item"
  }

  $runtimeInfo = Join-Path $dest 'runtime-path.txt'
  Set-Content $runtimeInfo $RuntimeDir -Encoding ASCII
}

function Install-NpmDeps([string]$dir) {
  if (-not $script:NodeDir) { throw 'Node.js not ready' }
  $npm = Join-Path $script:NodeDir 'npm.cmd'

  if (-not (Test-NeedsNpmInstall $dir)) {
    Write-Log 'المكتبات مثبتة مسبقاً — بدون تنزيل.'
    return
  }

  Write-Log 'تثبيت مكتبات التطبيق (production فقط)...'
  Push-Location $dir
  try {
    $env:Path = "$($script:NodeDir);$env:Path"
    & $npm install --omit=dev --no-audit --no-fund 2>&1 | ForEach-Object { Write-Log "$_" }
    if ($LASTEXITCODE -ne 0) { throw 'فشل npm install' }
    $hash = Get-LockHash $dir
    if ($hash) {
      @{ lockHash = $hash; installedAt = (Get-Date).ToString('o') } |
        ConvertTo-Json | Set-Content (Join-Path $dir '.install-meta.json') -Encoding UTF8
    }
    Write-Log 'المكتبات OK.'
  } finally { Pop-Location }
}

function New-DesktopShortcut([string]$dir) {
  $wsh = New-Object -ComObject WScript.Shell
  @(
    'محفظة جيب - كروت الشبكات.lnk',
    'Mahfazat Jeeb - Network Cards.lnk'
  ) | ForEach-Object {
    $lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) $_
    $s = $wsh.CreateShortcut($lnk)
    $s.TargetPath = Join-Path $dir 'run-app.bat'
    $s.WorkingDirectory = $dir
    $s.Description = 'نظام متابعة الشبكات - محفظة جيب'
    $s.IconLocation = 'imageres.dll,109'
    $s.Save()
  }
  Write-Log 'تم إنشاء أيقونة سطح المكتب.'
}

function Register-Uninstaller([string]$dir) {
  try {
    $regPath = 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\MahfazatJeebNetworkCards'
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty $regPath -Name DisplayName -Value 'محفظة جيب - كروت الشبكات'
    Set-ItemProperty $regPath -Name DisplayVersion -Value '1.0.1'
    Set-ItemProperty $regPath -Name InstallLocation -Value $dir
    $uninstall = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$ScriptDir\uninstall.ps1`" -InstallDir `"$dir`""
    Set-ItemProperty $regPath -Name UninstallString -Value $uninstall
  } catch {
    Write-Log 'ملاحظة: لم يُسجّل في قائمة البرامج (لا يؤثر على التشغيل).'
  }
}

# --- GUI ---
$form = New-Object System.Windows.Forms.Form
$form.Text = 'تثبيت — محفظة جيب · كروت الشبكات'
$form.Size = New-Object System.Drawing.Size(580, 500)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.RightToLeft = [System.Windows.Forms.RightToLeft]::Yes
$form.RightToLeftLayout = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$title = New-Object System.Windows.Forms.Label
$title.Location = New-Object System.Drawing.Point(20, 15)
$title.Size = New-Object System.Drawing.Size(530, 70)
$title.Text = "مرحباً`r`nاضغط «التالي» — لا يحتاج صلاحيات مدير"

$info = New-Object System.Windows.Forms.Label
$info.Location = New-Object System.Drawing.Point(20, 88)
$info.Size = New-Object System.Drawing.Size(530, 40)
$info.Text = 'مجلد التثبيت (تلقائي):'

$pathBox = New-Object System.Windows.Forms.TextBox
$pathBox.Location = New-Object System.Drawing.Point(20, 128)
$pathBox.Size = New-Object System.Drawing.Size(530, 28)
$pathBox.Text = $DefaultInstall
$pathBox.ReadOnly = $true

$script:LogLines = @()
$script:LogBox = New-Object System.Windows.Forms.TextBox
$script:LogBox.Location = New-Object System.Drawing.Point(20, 168)
$script:LogBox.Size = New-Object System.Drawing.Size(530, 220)
$script:LogBox.Multiline = $true
$script:LogBox.ReadOnly = $true
$script:LogBox.ScrollBars = 'Vertical'
$script:LogBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$script:LogBox.Visible = $false

$btnNext = New-Object System.Windows.Forms.Button
$btnNext.Location = New-Object System.Drawing.Point(420, 410)
$btnNext.Size = New-Object System.Drawing.Size(130, 36)
$btnNext.Text = 'التالي'

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Location = New-Object System.Drawing.Point(20, 410)
$btnCancel.Size = New-Object System.Drawing.Size(100, 36)
$btnCancel.Text = 'إلغاء'
$btnCancel.Add_Click({ $form.Close() })

$form.Controls.AddRange(@($title, $info, $pathBox, $script:LogBox, $btnNext, $btnCancel))

$script:Step = 0

$btnNext.Add_Click({
  if ($script:Step -eq 0) {
    $script:Step = 1
    $title.Text = 'جاري التثبيت...'
    $info.Text = 'يرجى الانتظار — لا تغلق النافذة'
    $script:LogBox.Visible = $true
    $btnNext.Enabled = $false
    $form.Refresh()

    try {
      $dest = $pathBox.Text.Trim()
      if (-not $dest) { throw 'مجلد التثبيت فارغ' }

      Ensure-PortableNode

      Write-Log 'نسخ ملفات التطبيق...'
      Copy-AppFiles $dest

      Install-NpmDeps $dest

      Write-Log 'إنشاء اختصار سطح المكتب...'
      New-DesktopShortcut $dest

      Register-Uninstaller $dest

      Write-Log ''
      Write-Log '=== اكتمل التثبيت بنجاح ==='
      $script:Step = 2
      $title.Text = 'تم التثبيت بنجاح!'
      $info.Text = "اضغط «إنهاء»`r`n`r`nاستخدم أيقونة سطح المكتب:`r`n«محفظة جيب - كروت الشبكات»`r`n`r`nالدخول: admin / 1234"
      $btnNext.Text = 'إنهاء'
      $btnNext.Enabled = $true
      $script:InstallDir = $dest
    } catch {
      Write-Log "خطأ: $($_.Exception.Message)"
      [System.Windows.Forms.MessageBox]::Show(
        "$($_.Exception.Message)`r`n`r`nتأكد من اتصال الإنترنت وأعد المحاولة.",
        'خطأ في التثبيت', 'OK', 'Error') | Out-Null
      $btnNext.Text = 'إعادة المحاولة'
      $btnNext.Enabled = $true
      $script:Step = 0
    }
  } elseif ($script:Step -eq 2) {
    $launch = [System.Windows.Forms.MessageBox]::Show('تشغيل النظام الآن؟', 'تم', 'YesNo', 'Question')
    if ($launch -eq 'Yes') {
      Start-Process (Join-Path $script:InstallDir 'run-app.bat')
    }
    $form.Close()
  }
})

[void]$form.ShowDialog()
