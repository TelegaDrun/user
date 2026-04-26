@echo off
title TelegaDrun Setup
cd /d "%~dp0"

echo ====================================
echo    TelegaDrun - Установка
echo ====================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js не найден!
    echo.
    echo Скачай Node.js: https://nodejs.org/download/
    echo.
    echo После установки запусти этот скрипт снова.
    echo.
    pause
    exit
)

echo [1/3] Установка зависимостей...
call npm install 2>nul
if %errorlevel% neq 0 (
    echo Ошибка установки!
    pause
    exit
)

echo [2/3] Запуск сервера...
cd ..
start /b python server.py >nul 2>nul

timeout /t 2 /nobreak >nul

echo [3/3] Запуск приложения...
call npm start

pause