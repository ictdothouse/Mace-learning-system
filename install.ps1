<#
.SYNOPSIS
  MACE LEARNING SYSTEM - WINDOWS INSTALLATION WIZARD
.DESCRIPTION
  This script installs Node.js, MongoDB, PM2, and the MACE system on a Windows PC automatically.
#>

# Ensure running as Administrator
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Meminta kebenaran Administrator (Run as Administrator)..." -ForegroundColor Yellow
    $StartProcessArgs = @{
        FilePath     = 'powershell.exe'
        ArgumentList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        Verb         = 'RunAs'
    }
    Start-Process @StartProcessArgs
    Exit
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  WIZARD PEMASANGAN LOCALHOST MACE (WINDOWS)   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Gather Inputs
Write-Host ""
Write-Host "Langkah 1: Mengumpul Maklumat Sistem..." -ForegroundColor Yellow
$APP_PORT = Read-Host "Masukkan Port untuk Node.js (Tekan Enter untuk Lalai/Default: 3000)"
if ([string]::IsNullOrWhiteSpace($APP_PORT)) { $APP_PORT = "3000" }

$ADMIN_PASS = Read-Host "Masukkan Kata Laluan untuk Akaun Master Admin (Tekan Enter untuk Lalai: admin123)"
if ([string]::IsNullOrWhiteSpace($ADMIN_PASS)) { $ADMIN_PASS = "admin123" }

# Generate Secrets
$JWT_SECRET = -join ((48..57) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$SESSION_SECRET = -join ((48..57) + (97..122) | Get-Random -Count 48 | % {[char]$_})
$MONGO_URI = "mongodb://127.0.0.1:27017/mace_db"

Write-Host ""
Write-Host "Langkah 2: Menyemak & Memasang Node.js (LTS)..." -ForegroundColor Yellow
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js tidak dijumpai. Memuat turun pemasang Node.js..." -ForegroundColor Cyan
    $nodeMsi = "$env:TEMP\nodejs.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi" -OutFile $nodeMsi
    Write-Host "Memasang Node.js secara automatik (senyap)..." -ForegroundColor Cyan
    Start-Process msiexec.exe -ArgumentList "/i $nodeMsi /quiet /norestart" -Wait
    Write-Host "Node.js berjaya dipasang." -ForegroundColor Green
    
    # Add Node to current session PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "Node.js sudah sedia ada." -ForegroundColor Green
}

Write-Host ""
Write-Host "Langkah 3: Menyemak & Memasang MongoDB (Pangkalan Data)..." -ForegroundColor Yellow
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if (-not $mongoService) {
    Write-Host "MongoDB tidak dijumpai. Memuat turun pemasang MongoDB..." -ForegroundColor Cyan
    $mongoMsi = "$env:TEMP\mongodb.msi"
    Invoke-WebRequest -Uri "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi" -OutFile $mongoMsi
    Write-Host "Memasang MongoDB secara automatik (senyap)... Sila tunggu." -ForegroundColor Cyan
    Start-Process msiexec.exe -ArgumentList "/i $mongoMsi /quiet /norestart" -Wait
    Write-Host "MongoDB berjaya dipasang dan dihidupkan." -ForegroundColor Green
} else {
    Write-Host "MongoDB sudah sedia ada." -ForegroundColor Green
}

Write-Host ""
Write-Host "Langkah 4: Memuat Turun Kod Sistem MACE..." -ForegroundColor Yellow
$installDir = "C:\MACE-SYSTEM-DEPLOY"
if (-not (Test-Path "$installDir\app.js")) {
    Write-Host "Memuat turun fail projek ke $installDir ..." -ForegroundColor Cyan
    $zipPath = "$env:TEMP\mace.zip"
    Invoke-WebRequest -Uri "https://github.com/ictdothouse/MACE-SYSTEM-DEPLOY/archive/refs/heads/main.zip" -OutFile $zipPath
    Write-Host "Mengekstrak (Unzip) fail..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath "C:\" -Force
    if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
    Rename-Item -Path "C:\MACE-SYSTEM-DEPLOY-main" -NewName "MACE-SYSTEM-DEPLOY"
}
Set-Location -Path $installDir

Write-Host ""
Write-Host "Langkah 5: Mengkonfigurasi Fail .env..." -ForegroundColor Yellow
$envContent = @"
PORT=$APP_PORT
MONGO_URI=$MONGO_URI
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
ADMIN_USER=admin
ADMIN_PASS=$ADMIN_PASS
NODE_ENV=production

# Konfigurasi Cloudflare R2 (Boleh ubah kemudian jika perlu)
R2_ACCOUNT_ID=your_account_id_here
R2_ENDPOINT=https://your_account_id_here.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=modulmace
R2_PUBLIC_URL=https://media.modulatletmsn.com
"@
Set-Content -Path ".env" -Value $envContent
Write-Host "Fail .env berjaya dicipta." -ForegroundColor Green

Write-Host ""
Write-Host "Langkah 6: Memasang NPM Dependencies..." -ForegroundColor Yellow
$npmCmd = if (Test-Path "$env:ProgramFiles\nodejs\npm.cmd") { "$env:ProgramFiles\nodejs\npm.cmd" } else { "npm" }

Write-Host "Memasang komponen utama (Backend)..." -ForegroundColor Cyan
& $npmCmd install

if (Test-Path "client") {
    Write-Host "Memasang komponen antaramuka (Frontend/React)..." -ForegroundColor Cyan
    Set-Location -Path "client"
    & $npmCmd install
    Write-Host "Membina (Build) React App..." -ForegroundColor Cyan
    & $npmCmd run build
    Set-Location -Path ".."
}

Write-Host ""
Write-Host "Langkah 7: Memasang PM2 & Menghidupkan Sistem MACE..." -ForegroundColor Yellow
& $npmCmd install -g pm2
$pm2Cmd = if (Test-Path "$env:APPDATA\npm\pm2.cmd") { "$env:APPDATA\npm\pm2.cmd" } else { "pm2" }

Write-Host "Menghidupkan mace-system dan mace-monitor..." -ForegroundColor Cyan
& $pm2Cmd start app.js --name "mace-system"
& $pm2Cmd start monitorpanel.js --name "mace-monitor"
& $pm2Cmd save

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ PEMASANGAN LOCALHOST (WINDOWS) BERJAYA!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Laman web MACE dan Database MongoDB anda kini aktif di komputer ini."
Write-Host "Akses laman web utama di : http://localhost:$APP_PORT"
Write-Host "Akses panel admin di     : http://localhost:$APP_PORT/admin-mace"
Write-Host "Akses MonitorPanel di    : http://localhost:4000"
Write-Host ""
Write-Host "Kata laluan admin anda ialah: $ADMIN_PASS"
Write-Host "Sistem disimpan di folder: $installDir"
Write-Host "=================================================" -ForegroundColor Cyan

Read-Host "Tekan Enter untuk tamat..." 
