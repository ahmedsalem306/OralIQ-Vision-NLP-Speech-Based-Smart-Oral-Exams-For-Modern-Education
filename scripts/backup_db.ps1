# ============================================================
# OralIQ Database Backup Script (Windows PowerShell)
# Usage:
#   .\scripts\backup_db.ps1               # SQLite backup
#   .\scripts\backup_db.ps1 -Restore      # Restore latest backup
#   .\scripts\backup_db.ps1 -List         # List all backups
# ============================================================
param(
    [switch]$Restore,
    [switch]$List,
    [string]$BackupFile = ""
)

$BackendDir = "$PSScriptRoot\..\backend"
$DataDir    = "$BackendDir\data"
$BackupDir  = "$DataDir\backups"
$DbFile     = "$DataDir\interview_ai.db"
if (-not (Test-Path $DbFile)) {
    $DbFile = "$DataDir\oraliq.db"
}
$Timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"

# Ensure backup dir exists
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

if ($List) {
    Write-Host "`n=== Available Backups ===" -ForegroundColor Cyan
    Get-ChildItem "$BackupDir\*.db" | Sort-Object LastWriteTime -Descending |
        ForEach-Object { Write-Host "  $($_.Name)  [$([math]::Round($_.Length/1KB, 1)) KB]" }
    exit 0
}

if ($Restore) {
    if ($BackupFile -eq "") {
        # Restore the most recent backup
        $Latest = Get-ChildItem "$BackupDir\*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $Latest) { Write-Error "No backups found in $BackupDir"; exit 1 }
        $BackupFile = $Latest.FullName
    }
    if (-not (Test-Path $BackupFile)) { Write-Error "Backup file not found: $BackupFile"; exit 1 }
    $SafetyBackup = "$BackupDir\pre_restore_$Timestamp.db"
    if (Test-Path $DbFile) {
        Copy-Item $DbFile $SafetyBackup
        Write-Host "Safety copy saved: $SafetyBackup" -ForegroundColor Yellow
    }
    Copy-Item $BackupFile $DbFile -Force
    Write-Host "✅ Restored: $BackupFile → $DbFile" -ForegroundColor Green

    # Quick smoke test
    Write-Host "Running pytest smoke test..." -ForegroundColor Cyan
    Set-Location $BackendDir
    $PyExe = "D:\interview-ai\backend\venv\Scripts\python.exe"
    if (-not (Test-Path $PyExe)) { $PyExe = "python" }
    & $PyExe -m pytest app/tests/test_google_login.py -q -p no:warnings 2>&1 | Select-Object -Last 5
    exit 0
}

# ── Normal backup ──
if (-not (Test-Path $DbFile)) {
    Write-Host "No SQLite DB found at $DbFile (maybe using Postgres). Skipping SQLite backup." -ForegroundColor Yellow
    # Postgres backup via pg_dump (uses DATABASE_URL env var)
    $DbUrl = $env:DATABASE_URL
    if ($DbUrl -and $DbUrl.StartsWith("postgresql")) {
        $PgDump = "$BackupDir\oraliq_pg_$Timestamp.sql"
        Write-Host "Running pg_dump → $PgDump" -ForegroundColor Cyan
        pg_dump $DbUrl -f $PgDump
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Postgres backup saved: $PgDump" -ForegroundColor Green
        } else {
            Write-Error "pg_dump failed (exit $LASTEXITCODE)"
            exit 1
        }
    } else {
        Write-Host "DATABASE_URL not set or not Postgres. Nothing to backup." -ForegroundColor Red
        exit 1
    }
} else {
    $Dest = "$BackupDir\oraliq_$Timestamp.db"
    Copy-Item $DbFile $Dest
    Write-Host "✅ SQLite backup saved: $Dest  [$([math]::Round((Get-Item $Dest).Length/1KB,1)) KB]" -ForegroundColor Green
}

# Prune backups older than 30 days
$OldFiles = Get-ChildItem "$BackupDir\*.db","$BackupDir\*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
if ($OldFiles) {
    $OldFiles | Remove-Item -Force
    Write-Host "🧹 Pruned $($OldFiles.Count) backups older than 30 days." -ForegroundColor DarkGray
}
