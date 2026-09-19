$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Waste2Worth setup" -ForegroundColor Green
Write-Host "================="
Write-Host ""

function Require-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
  & $Name --version | Select-Object -First 1
}

Require-Command "node" "Install Node.js 18+ from https://nodejs.org/"
Require-Command "npm" "Install Node.js 18+; npm is included with it."

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "Backend"
$frontend = Join-Path $root "frontend"
$example = Join-Path $backend ".env.example"
$envFile = Join-Path $backend ".env"

if (-not (Test-Path $example)) {
  throw "Missing Backend\.env.example. The repository copy is incomplete."
}

if (-not (Test-Path $envFile)) {
  Copy-Item $example $envFile
  Write-Host "Created Backend\.env from Backend\.env.example." -ForegroundColor Green
} else {
  Write-Host "Backend\.env already exists; leaving it unchanged." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location $backend
try { npm install } finally { Pop-Location }

Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location $frontend
try { npm install } finally { Pop-Location }

Write-Host ""
Write-Host "Setup completed." -ForegroundColor Green
Write-Host ""
Write-Host "Before starting the app, edit:"
Write-Host "  $envFile"
Write-Host ""
Write-Host "At minimum configure SUPABASE_URL, SUPABASE_ANON_KEY,"
Write-Host "SUPABASE_SERVICE_ROLE_KEY, and an AI provider key."
Write-Host ""
Write-Host "Start the app with:"
Write-Host "  .\start-preview.bat"
Write-Host ""
Write-Host "Then open http://localhost:3000/index.html"
