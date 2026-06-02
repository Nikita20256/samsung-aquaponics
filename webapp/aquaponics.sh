#!/bin/bash
# ===========================================
# Aquaponics — Универсальный скрипт управления
# Bash (Linux / macOS / Git Bash on Windows)
# ===========================================

set -e
cd "$(dirname "$0")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; DIM='\033[2m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }
ask()  { echo -ne "  $1 ${DIM}[$2]${NC}: "; read -r val; echo "${val:-$2}"; }

banner() {
    echo ""
    echo -e "  ${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "  ${CYAN}║  🌱  Aquaponics — Управление системой               ║${NC}"
    echo -e "  ${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

rand() {
    local len=${1:-32}
    if command -v openssl &>/dev/null; then
        openssl rand -base64 48 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c "$len"
    else
        tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$len"
    fi
}

# ─── Docker / Compose ───
ensure_docker() {
    if ! command -v docker &>/dev/null; then
        err "Docker не найден."
        echo -e "    ${DIM}Linux:   https://docs.docker.com/engine/install/${NC}"
        echo -e "    ${DIM}macOS:   https://docs.docker.com/desktop/install/mac-install/${NC}"
        echo -e "    ${DIM}Windows: https://docs.docker.com/desktop/install/windows-install/${NC}"
        exit 1
    fi
    if ! docker info &>/dev/null; then
        err "Docker не запущен. Запустите Docker Desktop (или 'sudo systemctl start docker')."
        exit 1
    fi
    COMPOSE="docker compose"
    if ! $COMPOSE version &>/dev/null 2>&1; then
        COMPOSE="docker-compose"
        if ! $COMPOSE version &>/dev/null 2>&1; then
            err "Docker Compose не найден."
            exit 1
        fi
    fi
    ok "Docker и Compose готовы"
}

# ─── 1. Установка / Запуск ───
action_start() {
    MODE="update"
    if [ ! -f ".env" ]; then
        info "Конфигурация не найдена — запускаю первоначальную настройку"
        MODE="install"
    else
        echo -e "  Найдена существующая конфигурация."
        echo ""
        echo "  [1] Запустить / Обновить (текущие настройки)"
        echo "  [2] Настроить заново"
        echo ""
        CHOICE=$(ask "Выбор" "1")
        [ "$CHOICE" = "2" ] && MODE="install"
    fi

    if [ "$MODE" = "install" ]; then
        echo ""
        echo -e "  ${CYAN}── Настройка ──${NC}"
        echo ""

        FE=$(ask "Порт веб-интерфейса" "80")
        BE=$(ask "Порт API" "3000")
        MQ=$(ask "Порт MQTT" "1883")
        MQWS=$(ask "Порт MQTT WebSocket" "9001")
        echo ""
        MQUSER=$(ask "MQTT пользователь" "device")
        MQPASS=$(ask "MQTT пароль" "device_password")

        DBPASS=$(rand 20)
        JWT_SEC=$(rand 40)
        ok "Пароль БД и JWT-секрет сгенерированы"

        echo ""
        echo "  Внешний доступ (опционально):"
        EXT=$(ask "  IP или домен (Enter = только localhost)" "")

        CORS="http://localhost,http://localhost:${FE}"
        [ -n "$EXT" ] && CORS="${CORS},http://${EXT},http://${EXT}:${FE},https://${EXT},https://${EXT}:${FE}"

        echo ""
        echo "  Email-уведомления (опционально, Enter = пропустить):"
        EMAIL_HOST=$(ask "  SMTP сервер" "")
        EMAIL_PORT=""; EMAIL_USER=""; EMAIL_PASS=""
        if [ -n "$EMAIL_HOST" ]; then
            EMAIL_PORT=$(ask "  SMTP порт" "465")
            EMAIL_USER=$(ask "  Email логин" "")
            EMAIL_PASS=$(ask "  Email пароль" "")
        fi

        cat > .env <<EOF
# Aquaponics — Конфигурация
# Сгенерировано: $(date '+%d.%m.%Y %H:%M')

# --- База данных ---
POSTGRES_USER=aquaponics_app
POSTGRES_PASSWORD=${DBPASS}
POSTGRES_DB=aquaponics_db

# --- Авторизация ---
JWT_SECRET=${JWT_SEC}
JWT_EXPIRES_IN=24h

# --- MQTT ---
MQTT_HOST=mqtt://mqtt:1883
MQTT_USERNAME=${MQUSER}
MQTT_PASSWORD=${MQPASS}

# --- Порты ---
FRONTEND_PORT=${FE}
BACKEND_PORT=${BE}
DB_PORT=5432
MQTT_PORT=${MQ}
MQTT_WS_PORT=${MQWS}

# --- CORS ---
CORS_ORIGINS=${CORS}

# --- Email (опционально) ---
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}
EOF
        ok "Файл .env создан"
    fi

    # Удаление старого тома при пересоздании
    if [ "$MODE" = "install" ]; then
        OLD_VOL=$(docker volume ls -q --filter "name=aquaponics-postgres-data" 2>/dev/null || true)
        if [ -n "$OLD_VOL" ]; then
            echo ""
            echo -e "  ${YELLOW}⚠ Обнаружен старый том базы данных.${NC}"
            V=$(ask "  Удалить старые данные? [y/N]" "N")
            if [ "$V" = "y" ] || [ "$V" = "Y" ]; then
                info "Удаляю старые контейнеры и тома..."
                $COMPOSE down -v 2>/dev/null || true
                ok "Старые данные удалены"
            fi
        fi
    fi

    # Запуск
    echo ""
    echo -e "  ${CYAN}── Запуск ──${NC}"
    info "Собираю и запускаю контейнеры..."
    $COMPOSE up -d --build

    info "Жду готовности backend..."
    for i in {1..20}; do
        sleep 3
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aquaponics-backend 2>/dev/null || echo "")
        if [ "$HEALTH" = "healthy" ]; then
            ok "Все сервисы готовы!"
            break
        fi
        echo -ne "\r  ⏳ Ожидание... ($((i*3))/60 с)"
    done
    echo ""

    # Итог
    FE=$(grep "^FRONTEND_PORT=" .env | cut -d= -f2 || echo "80")
    BE=$(grep "^BACKEND_PORT=" .env | cut -d= -f2 || echo "3000")
    MQ=$(grep "^MQTT_PORT=" .env | cut -d= -f2 || echo "1883")
    MU=$(grep "^MQTT_USERNAME=" .env | cut -d= -f2 || echo "device")
    MP=$(grep "^MQTT_PASSWORD=" .env | cut -d= -f2 || echo "device_password")
    [ "$FE" = "80" ] && URL="http://localhost" || URL="http://localhost:${FE}"

    echo ""
    echo -e "  ${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "  ${GREEN}║        ✅  Установка завершена успешно!              ║${NC}"
    echo -e "  ${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  🌐 Веб:     ${CYAN}${URL}${NC}"
    echo -e "  🔌 API:     ${CYAN}http://localhost:${BE}${NC}"
    echo -e "  📡 MQTT:    ${CYAN}localhost:${MQ}${NC}"
    echo ""
    echo -e "  ${DIM}Логин: admin  |  Пароль: admin123${NC}"
    echo -e "  ${YELLOW}⚠ Смените пароль после первого входа!${NC}"
    echo ""
    echo -e "  ${DIM}MQTT устройства: ${MU} / ${MP}${NC}"
}

# ─── 2. Остановка ───
action_stop() {
    echo ""
    echo -e "  ${YELLOW}── Остановка ──${NC}"
    echo ""
    ANS=$(ask "Удалить данные БД тоже? [y/N]" "N")
    if [ "$ANS" = "y" ] || [ "$ANS" = "Y" ]; then
        $COMPOSE down -v
        ok "Все контейнеры и данные удалены."
    else
        $COMPOSE down
        ok "Контейнеры остановлены. Данные сохранены."
    fi
}

# ─── 3. Логи ───
action_logs() {
    echo ""
    echo -e "  ${YELLOW}── Логи ──${NC}"
    echo ""
    echo "  [1] Все сервисы"
    echo "  [2] Backend"
    echo "  [3] Frontend"
    echo "  [4] База данных"
    echo "  [5] MQTT"
    echo ""
    ANS=$(ask "Выбор" "1")
    case "$ANS" in
        2) $COMPOSE logs -f backend ;;
        3) $COMPOSE logs -f frontend ;;
        4) $COMPOSE logs -f db ;;
        5) $COMPOSE logs -f mqtt ;;
        *) $COMPOSE logs -f ;;
    esac
}

# ─── 4. Настроить заново ───
action_reconfig() {
    if [ ! -f ".env" ]; then
        err "Конфигурация ещё не создана. Сначала выполните 'Запустить / Установить'."
        return
    fi
    echo ""
    echo -e "  ${YELLOW}⚠ Это удалит текущий .env и пересоздаст его.${NC}"
    ANS=$(ask "Продолжить? [y/N]" "N")
    if [ "$ANS" = "y" ] || [ "$ANS" = "Y" ]; then
        rm -f .env
        info "Конфигурация удалена. Запускаю настройку заново..."
        action_start
    fi
}

# ─── 5. Статус ───
action_status() {
    echo ""
    echo -e "  ${CYAN}── Статус контейнеров ──${NC}"
    echo ""
    $COMPOSE ps
    echo ""
    if [ -f ".env" ]; then
        FE=$(grep "^FRONTEND_PORT=" .env | cut -d= -f2 || echo "80")
        [ "$FE" = "80" ] && URL="http://localhost" || URL="http://localhost:${FE}"
        echo -e "  🌐 Веб-интерфейс: ${CYAN}${URL}${NC}"
    fi
}

# ─── 6. Backup ───
action_backup() {
    echo ""
    echo -e "  ${CYAN}── Backup базы данных ──${NC}"
    echo ""
    FILE="backup_$(date '+%Y%m%d_%H%M%S').sql"
    info "Создаю $FILE ..."
    if docker exec aquaponics-db pg_dump -U aquaponics_app aquaponics_db > "$FILE" 2>/dev/null; then
        ok "Backup сохранён: $FILE"
    else
        err "Не удалось создать backup. Убедитесь, что БД запущена."
    fi
}

# ═══════════════════════════════════════════
#  MAIN MENU
# ═══════════════════════════════════════════

ensure_docker

while true; do
    banner
    echo "  [1] 🚀  Установить / Запустить / Обновить"
    echo "  [2] ⏹  Остановить"
    echo "  [3] 📋  Логи"
    echo "  [4] 🔄  Настроить заново"
    echo "  [5] ℹ️   Статус"
    echo "  [6] 💾  Backup БД"
    echo "  [7] ❌  Выход"
    echo ""
    CHOICE=$(ask "Выбор" "1")

    case "$CHOICE" in
        1) action_start ;;
        2) action_stop ;;
        3) action_logs ;;
        4) action_reconfig ;;
        5) action_status ;;
        6) action_backup ;;
        7) exit 0 ;;
        *) err "Неверный выбор" ;;
    esac

    echo ""
    read -rp "  Нажмите Enter для возврата в меню"
done
