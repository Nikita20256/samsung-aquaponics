#!/bin/bash

echo "=== Проверка PostgreSQL ==="

# 1. Проверяем, запущен ли PostgreSQL
echo "1. Статус PostgreSQL:"
sudo systemctl status postgresql | head -5

# 2. Проверяем, существует ли база данных
echo -e "\n2. Существующие базы данных:"
sudo -u postgres psql -c "\l" | grep aquaponics

# 3. Проверяем подключение от имени aquaponics_app
echo -e "\n3. Проверка подключения от имени aquaponics_app:"
sudo -u postgres psql -d aquaponics_db -c "SELECT 1;" 2>&1

# 4. Проверяем существование таблиц
echo -e "\n4. Таблицы в базе aquaponics_db:"
sudo -u postgres psql -d aquaponics_db -c "\dt" 2>&1

# 5. Проверяем подключение с паролем (как это делает Node.js)
echo -e "\n5. Проверка подключения через psql с паролем:"
PGPASSWORD=aserver psql -h localhost -U aquaponics_app -d aquaponics_db -c "SELECT 1;" 2>&1

echo -e "\n=== Проверка завершена ==="

