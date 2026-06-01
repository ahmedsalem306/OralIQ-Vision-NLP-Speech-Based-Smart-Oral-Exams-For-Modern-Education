# نشر OralIQ: GitHub (كامل) + Hugging Face Space (مجلد backend فقط)
# الاستخدام: powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== 1/2 Push to GitHub (origin main) ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== 2/2 Push backend to Hugging Face Space (hfspace main) ===" -ForegroundColor Cyan
git subtree push --prefix=backend hfspace main
if ($LASTEXITCODE -ne 0) {
    Write-Host "إذا فشل subtree، جرّب: git push hfspace `$(git subtree split --prefix=backend HEAD):main --force" -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host "تم. Vercel يُحدَّث تلقائياً من GitHub إن كان المشروع مربوطاً." -ForegroundColor Green
Write-Host "Frontend: https://oral-iq-vision-nlp-speech-based-sma.vercel.app/" -ForegroundColor Green
Write-Host "Backend:  https://ahmed2552-oraliq-api.hf.space/health" -ForegroundColor Green
