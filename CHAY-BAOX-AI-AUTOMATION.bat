@echo off
chcp 65001 >nul
title KHỞI CHẠY BAOX & NGỌC KHÁNH MEDIA - AUTO TOOLS
color 0A

echo ====================================================================
echo    ⚡ KHỞI CHẠY NGỌC KHÁNH MEDIA & BAOX - AUTO TOOLS PRO MAX 2026
echo    🌐 Web Dashboard: http://127.0.0.1:8000
echo    📡 WebSocket Logs: ws://127.0.0.1:8000/ws/logs
echo ====================================================================
echo.
cd /d "%~dp0auto-media-matrix"

start "" http://127.0.0.1:8000
python server.py
pause
