# ============================================================
#  VORAZ PLATFORM — Script de arranque local
#  Ejecutar desde: F:\Programador GS\voraz-project\
#  Uso: .\start-local.ps1
# ============================================================

$ROOT = "F:\Programador GS\voraz-project"
$PLATFORM = "$ROOT\voraz-platform"
$BACKEND = "$PLATFORM\backend"
$FRONTEND = "$PLATFORM\frontend"

Write-Host ""
Write-Host "============================================" -ForegroundColor Red
Write-Host "   VORAZ PLATFORM - Arranque Local" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Red
Write-Host ""

# 1. Verificar Docker
Write-Host "[1/5] Verificando Docker..." -ForegroundColor Cyan
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker no esta corriendo. Iniciando Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "  Esperando 25 segundos para que Docker inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 25
}
Write-Host "  Docker OK" -ForegroundColor Green

# 2. Levantar base de datos
Write-Host ""
Write-Host "[2/5] Levantando PostgreSQL (Docker)..." -ForegroundColor Cyan
$env:DB_USER = "voraz_admin"
$env:DB_PASSWORD = "voraz_password_secure"
$env:DB_NAME = "voraz_db"
$env:DB_PORT = "5433"
docker compose -f "$ROOT\docker-compose.yml" up -d db 2>&1 | Out-Null
Start-Sleep -Seconds 5
$ready = docker exec voraz_db pg_isready -U voraz_admin -d voraz_db 2>&1
if ($ready -match "accepting connections") {
    Write-Host "  PostgreSQL OK en puerto 5433" -ForegroundColor Green
} else {
    Write-Host "  Esperando DB adicional..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
}

# 3. Instalar dependencias si no existen
Write-Host ""
Write-Host "[3/5] Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "$BACKEND\node_modules")) {
    Write-Host "  Instalando backend..." -ForegroundColor Yellow
    Set-Location $BACKEND; npm install --silent
}
if (-not (Test-Path "$FRONTEND\node_modules")) {
    Write-Host "  Instalando frontend..." -ForegroundColor Yellow
    Set-Location $FRONTEND; npm install --silent
}
Write-Host "  Dependencias OK" -ForegroundColor Green

# 4. Arrancar Backend en nueva ventana
Write-Host ""
Write-Host "[4/5] Arrancando Backend (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BACKEND'; Write-Host 'VORAZ BACKEND' -ForegroundColor Red; npm run dev"
Start-Sleep -Seconds 4
Write-Host "  Backend corriendo en http://localhost:3000" -ForegroundColor Green

# 5. Arrancar Frontend en nueva ventana
Write-Host ""
Write-Host "[5/5] Arrancando Frontend (puerto 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FRONTEND'; Write-Host 'VORAZ FRONTEND' -ForegroundColor Yellow; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  VORAZ PLATFORM CORRIENDO" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor Yellow
Write-Host "  DB Admin:  http://localhost:8080  (Adminer)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para levantar Adminer:" -ForegroundColor Gray
Write-Host "  docker compose -f '$ROOT\docker-compose.yml' up -d adminer" -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:5173"
