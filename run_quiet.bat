@echo off
cd /d D:\telega-clone
start python server.py
timeout /t 3 /nobreak >nul
echo Server started!