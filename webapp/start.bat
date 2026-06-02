@echo off
REM Aquaponics — Запуск меню управления
chcp 65001 >nul 2>nul
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "aquaponics.ps1"
