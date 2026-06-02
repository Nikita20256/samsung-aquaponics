# ===========================================
# Aquaponics — Универсальный скрипт управления
# PowerShell (Windows / Linux / macOS)
# ===========================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ─── Цвета ───
function banner {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║  🌱  Aquaponics — Управление системой               ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}
function ok($t)   { Write-Host "  ✓ $t" -ForegroundColor Green }
function err($t)  { Write-Host "  ✗ $t" -ForegroundColor Red }
function info($t) { Write-Host "  → $t" -ForegroundColor Yellow }
function ask($prompt, $default) {
    Write-Host "  $prompt " -NoNewline
    Write-Host "[$default]" -NoNewline -ForegroundColor DarkGray
    Write-Host ": " -NoNewline
    $v = Read-Host
    if ([string]::IsNullOrWhiteSpace($v)) { return $default }
    return $v
}
function rand($len = 32) {
    return -join ((65..90) + (97..122) + (48..57) | Get-Random -Count $len | ForEach-Object { [char]$_ })
}

# ─── Docker / Compose ───
function ensure-docker {
    try { $null = Get-Command docker -ErrorAction Stop } catch {
        err "Docker не найден."
        Write-Host "    Windows: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor DarkGray
        Write-Host "    Linux:   https://docs.docker.com/engine/install/" -ForegroundColor DarkGray
        Write-Host "    macOS:   https://docs.docker.com/desktop/install/mac-install/" -ForegroundColor DarkGray
        exit 1
    }
    try { $null = docker info 2>$null; if ($LASTEXITCODE -ne 0) { throw } } catch {
        err "Docker не запущен. Запустите Docker Desktop (или 'sudo systemctl start docker')."
        exit 1
    }
    $script:COMPOSE = "docker compose"
    try { $null = Invoke-Expression "$COMPOSE version" 2>$null } catch { $script:COMPOSE = "docker-compose" }
    ok "Docker и Compose готовы"
}

# ─── Чтение .env ───
function read-env {
    $script:vars = @{}
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.+)$") { $script:vars[$matches[1].Trim()] = $matches[2].Trim() }
        }
    }
}

# ─── 1. Установка / Запуск ───
function action-start {
    $mode = "update"
    if (-not (Test-Path ".env")) {
        info "Конфигурация не найдена — запускаю первоначальную настройку"
        $mode = "install"
    } else {
        Write-Host "  Найдена существующая конфигурация."
        Write-Host ""
        Write-Host "  [1] Запустить / Обновить (текущие настройки)"
        Write-Host "  [2] Настроить заново"
        Write-Host ""
        $c = ask "Выбор" "1"
        if ($c -eq "2") { $mode = "install" }
    }

    if ($mode -eq "install") {
        Write-Host ""
        Write-Host "  ── Настройка ──" -ForegroundColor Cyan
        Write-Host ""

        $FE = ask "Порт веб-интерфейса" "80"
        $BE = ask "Порт API" "3000"
        $MQ = ask "Порт MQTT" "1883"
        $MQWS = ask "Порт MQTT WebSocket" "9001"
        Write-Host ""
        $MQUSER = ask "MQTT пользователь" "device"
        $MQPASS = ask "MQTT пароль" "device_password"

        $DBPASS = rand 20
        $JWT = rand 40
        ok "Пароль БД и JWT-секрет сгенерированы"

        Write-Host ""
        Write-Host "  Внешний доступ (опционально):"
        $EXT = ask "  IP или домен (Enter = только localhost)" ""

        $CORS = "http://localhost,http://localhost:$FE"
        if (-not [string]::IsNullOrWhiteSpace($EXT)) {
            $CORS += ",http://${EXT},http://${EXT}:${FE},https://${EXT},https://${EXT}:${FE}"
        }

        Write-Host ""
        Write-Host "  Email-уведомления (опционально, Enter = пропустить):"
        $EMAIL_HOST = ask "  SMTP сервер" ""
        $EMAIL_PORT = ""; $EMAIL_USER = ""; $EMAIL_PASS = ""
        if (-not [string]::IsNullOrWhiteSpace($EMAIL_HOST)) {
            $EMAIL_PORT = ask "  SMTP порт" "465"
            $EMAIL_USER = ask "  Email логин" ""
            $EMAIL_PASS = ask "  Email пароль" ""
        }

        @"
# Aquaponics — Конфигурация
# Сгенерировано: $(Get-Date -Format "dd.MM.yyyy HH:mm")

# --- База данных ---
POSTGRES_USER=aquaponics_app
POSTGRES_PASSWORD=$DBPASS
POSTGRES_DB=aquaponics_db

# --- Авторизация ---
JWT_SECRET=$JWT
JWT_EXPIRES_IN=24h

# --- MQTT ---
MQTT_HOST=mqtt://mqtt:1883
MQTT_USERNAME=$MQUSER
MQTT_PASSWORD=$MQPASS

# --- Порты ---
FRONTEND_PORT=$FE
BACKEND_PORT=$BE
DB_PORT=5432
MQTT_PORT=$MQ
MQTT_WS_PORT=$MQWS

# --- CORS ---
CORS_ORIGINS=$CORS

# --- Email (опционально) ---
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
"@ | Out-File -FilePath ".env" -Encoding UTF8
        ok "Файл .env создан"
    }

    # Удаление старого тома при пересоздании
    if ($mode -eq "install") {
        $vol = docker volume ls -q --filter "name=aquaponics-postgres-data" 2>$null
        if ($vol) {
            Write-Host ""
            Write-Host "  ⚠ Обнаружен старый том базы данных." -ForegroundColor Yellow
            $v = ask "  Удалить старые данные? [y/N]" "N"
            if ($v -eq "y" -or $v -eq "Y") {
                info "Удаляю старые контейнеры и тома..."
                $prev = $ErrorActionPreference; $ErrorActionPreference = "SilentlyContinue"
                Invoke-Expression "$COMPOSE down -v" 2>$null | Out-Null
                $ErrorActionPreference = $prev
                ok "Старые данные удалены"
            }
        }
    }

    # Запуск
    Write-Host ""
    Write-Host "  ── Запуск ──" -ForegroundColor Cyan
    info "Собираю и запускаю контейнеры..."
    Invoke-Expression "$COMPOSE up -d --build"

    info "Жду готовности backend..."
    $ready = $false
    for ($i = 1; $i -le 20; $i++) {
        Start-Sleep -Seconds 3
        $h = docker inspect --format='{{.State.Health.Status}}' aquaponics-backend 2>$null
        if ($h -eq "healthy") { $ready = $true; ok "Все сервисы готовы!"; break }
        Write-Host "`r  ⏳ Ожидание... ($($i*3)/60 с)" -NoNewline
    }
    Write-Host ""
    if (-not $ready) { info "Сервисы запущены (backend ещё инициализируется)" }

    # Итог
    read-env
    $fe = if ($vars["FRONTEND_PORT"]) { $vars["FRONTEND_PORT"] } else { "80" }
    $be = if ($vars["BACKEND_PORT"]) { $vars["BACKEND_PORT"] } else { "3000" }
    $mq = if ($vars["MQTT_PORT"]) { $vars["MQTT_PORT"] } else { "1883" }
    $mu = if ($vars["MQTT_USERNAME"]) { $vars["MQTT_USERNAME"] } else { "device" }
    $mp = if ($vars["MQTT_PASSWORD"]) { $vars["MQTT_PASSWORD"] } else { "device_password" }
    $url = if ($fe -eq "80") { "http://localhost" } else { "http://localhost:$fe" }

    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║        ✅  Установка завершена успешно!              ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  🌐 Веб:     " -NoNewline; Write-Host $url -ForegroundColor Cyan
    Write-Host "  🔌 API:     " -NoNewline; Write-Host "http://localhost:$be" -ForegroundColor Cyan
    Write-Host "  📡 MQTT:    " -NoNewline; Write-Host "localhost:$mq" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Логин: admin  |  Пароль: admin123" -ForegroundColor DarkGray
    Write-Host "  ⚠ Смените пароль после первого входа!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  MQTT устройства: $mu / $mp" -ForegroundColor DarkGray
}

# ─── 2. Остановка ───
function action-stop {
    Write-Host ""
    Write-Host "  ── Остановка ──" -ForegroundColor Yellow
    Write-Host ""
    $ans = ask "Удалить данные БД тоже? [y/N]" "N"
    if ($ans -eq "y" -or $ans -eq "Y") {
        Invoke-Expression "$COMPOSE down -v"
        ok "Все контейнеры и данные удалены."
    } else {
        Invoke-Expression "$COMPOSE down"
        ok "Контейнеры остановлены. Данные сохранены."
    }
}

# ─── 3. Логи ───
function action-logs {
    Write-Host ""
    Write-Host "  ── Логи ──" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] Все сервисы"
    Write-Host "  [2] Backend"
    Write-Host "  [3] Frontend"
    Write-Host "  [4] База данных"
    Write-Host "  [5] MQTT"
    Write-Host ""
    $ans = ask "Выбор" "1"
    switch ($ans) {
        "2" { Invoke-Expression "$COMPOSE logs -f backend" }
        "3" { Invoke-Expression "$COMPOSE logs -f frontend" }
        "4" { Invoke-Expression "$COMPOSE logs -f db" }
        "5" { Invoke-Expression "$COMPOSE logs -f mqtt" }
        default { Invoke-Expression "$COMPOSE logs -f" }
    }
}

# ─── 4. Настроить заново ───
function action-reconfig {
    if (-not (Test-Path ".env")) {
        err "Конфигурация ещё не создана. Сначала выполните 'Запустить / Установить'."
        return
    }
    Write-Host ""
    Write-Host "  ⚠ Это удалит текущий .env и пересоздаст его." -ForegroundColor Yellow
    $ans = ask "Продолжить? [y/N]" "N"
    if ($ans -eq "y" -or $ans -eq "Y") {
        Remove-Item ".env" -Force
        info "Конфигурация удалена. Запускаю настройку заново..."
        action-start
    }
}

# ─── 5. Статус ───
function action-status {
    Write-Host ""
    Write-Host "  ── Статус контейнеров ──" -ForegroundColor Cyan
    Write-Host ""
    Invoke-Expression "$COMPOSE ps"
    Write-Host ""
    read-env
    if ($vars.Count -gt 0) {
        $fe = if ($vars["FRONTEND_PORT"]) { $vars["FRONTEND_PORT"] } else { "80" }
        $url = if ($fe -eq "80") { "http://localhost" } else { "http://localhost:$fe" }
        Write-Host "  🌐 Веб-интерфейс: $url" -ForegroundColor Cyan
    }
}

# ─── 6. Backup ───
function action-backup {
    Write-Host ""
    Write-Host "  ── Backup базы данных ──" -ForegroundColor Cyan
    Write-Host ""
    $file = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    info "Создаю $file ..."
    try {
        docker exec aquaponics-db pg_dump -U aquaponics_app aquaponics_db > $file
        ok "Backup сохранён: $file"
    } catch {
        err "Не удалось создать backup. Убедитесь, что БД запущена."
    }
}

# ═══════════════════════════════════════════
#  MAIN MENU
# ═══════════════════════════════════════════

ensure-docker

while ($true) {
    banner
    Write-Host "  [1] 🚀  Установить / Запустить / Обновить"
    Write-Host "  [2] ⏹  Остановить"
    Write-Host "  [3] 📋  Логи"
    Write-Host "  [4] 🔄  Настроить заново"
    Write-Host "  [5] ℹ️   Статус"
    Write-Host "  [6] 💾  Backup БД"
    Write-Host "  [7] ❌  Выход"
    Write-Host ""
    $choice = ask "Выбор" "1"

    switch ($choice) {
        "1" { action-start }
        "2" { action-stop }
        "3" { action-logs }
        "4" { action-reconfig }
        "5" { action-status }
        "6" { action-backup }
        "7" { exit 0 }
        default { err "Неверный выбор" }
    }

    Write-Host ""
    Read-Host "  Нажмите Enter для возврата в меню"
}
