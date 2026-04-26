@echo off
title TelegaDrun Installer
cd /d "%~dp0"

echo ====================================
echo    TelegaDrun Desktop App
echo ====================================
echo.

:: Check if Python is running
netstat -ano | findstr ":8080" >nul
if %errorlevel% neq 0 (
    echo Запуск сервера...
    cd ..
    start /b python server.py
    timeout /t 2 /nobreak >nul
    cd app
)

:: Create batch launcher
echo Создание ярлыка...

set "BAT=%USERPROFILE%\Desktop\TelegaDrun.bat"
echo @echo off > "%BAT%"
echo title TelegaDrun >> "%BAT%"
echo cd /d "%~dp0" >> "%BAT%"
echo :start >> "%BAT%"
echo python -m http.server 8080 >> "%BAT%"
echo timeout /t 2 /nobreak >> "%BAT%"
echo start http://localhost:8080 >> "%BAT%"
echo goto start >> "%BAT%"
echo :stop >> "%BAT%"
echo taskkill /f /im python.exe >> "%BAT%"
echo exit >> "%BAT%"

echo.
echo ====================================
echo    Готово!
echo ====================================
echo.
echo Файлы созданы:
echo - Desktop\TelegaDrun.bat - ярлык
echo.
echo Запуск...
echo.

start http://localhost:8080

pause