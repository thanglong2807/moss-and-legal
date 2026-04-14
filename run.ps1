# Build frontend then start backend
Set-Location $PSScriptRoot

Write-Host "`n[1/2] Building frontend..." -ForegroundColor Cyan
Set-Location ui
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed." -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "`n[2/2] Starting backend..." -ForegroundColor Cyan
python main.py
