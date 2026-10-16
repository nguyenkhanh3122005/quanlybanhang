@echo off
chcp 65001 >nul
title KHỞI CHẠY BAOX AI AUTOMATION TOOLS PRO MAX
color 0A

echo ====================================================================
echo    ⚡ KHỞI CHẠY BAOX AI AUTOMATION TOOLS PRO MAX 2026
echo ====================================================================
echo.
cd /d "%~dp0auto-media-matrix"

start "" http://127.0.0.1:8088
python backend\app.py
pause
