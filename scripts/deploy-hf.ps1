# نشر الباك إند على Hugging Face Space (تاريخ نظيف بدون ملفات >10MB في التاريخ)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"
$Stage = Join-Path $env:TEMP "oraliq-hf-deploy"

$exclude = @("venv", "data", "..bfg-report", ".git")

function Remove-Pycache($dir) {
    Get-ChildItem $dir -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
}

Write-Host "=== Preparing HF deploy in $Stage ===" -ForegroundColor Cyan
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Path $Stage | Out-Null

Get-ChildItem $Backend -Force | Where-Object {
    $exclude -notcontains $_.Name
} | ForEach-Object {
    Copy-Item $_.FullName $Stage -Recurse -Force
}

Remove-Pycache $Stage

@(
    "bfg.jar",
    "local.env",
    "scripts\lbfmodel.yaml"
) | ForEach-Object {
    $p = Join-Path $Stage $_
    if (Test-Path $p) { Remove-Item -Force $p -Recurse -ErrorAction SilentlyContinue }
}

Get-ChildItem $Stage -Recurse -File | Where-Object { $_.Length -gt 9.5MB } | ForEach-Object {
    Write-Warning "Large file (>9.5MB): $($_.FullName)"
}

# UTF-8 .gitignore (UTF-16 breaks git and ignores all files)
$utf8 = New-Object System.Text.UTF8Encoding $false
$giContent = @"
*.wav
bfg.jar
..bfg-report/
scripts/lbfmodel.yaml
local.env
data/
*.db
"@
[System.IO.File]::WriteAllText((Join-Path $Stage ".gitignore"), $giContent.TrimStart(), $utf8)

Set-Location $Stage
if (Test-Path .git) { Remove-Item -Recurse -Force .git }
git init | Out-Null
git config user.email "deploy@oraliq.local"
git config user.name "OralIQ Deploy"
git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "deploy: OralIQ API $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
if (-not (git remote | Select-String "hfspace")) {
    git remote add hfspace "https://huggingface.co/spaces/ahmed2552/OralIQ-API"
}
git push hfspace HEAD:main --force

Write-Host "HF deploy done: https://ahmed2552-oraliq-api.hf.space/health" -ForegroundColor Green
