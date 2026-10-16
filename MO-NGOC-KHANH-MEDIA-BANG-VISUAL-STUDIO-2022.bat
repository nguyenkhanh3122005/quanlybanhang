@echo off
chcp 65001 >nul
title MỞ NGỌC KHÁNH MEDIA TRÊN VISUAL STUDIO 2022
color 0B

echo ====================================================================
echo    ⚡ ĐANG MỞ DỰ ÁN NGỌC KHÁNH MEDIA TRÊN VISUAL STUDIO 2022...
echo ====================================================================
echo.

set "PROJECT_DIR=%~dp0auto-media-matrix"
set "VS_DIR=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE"
if not exist "%VS_DIR%\devenv.exe" (
    set "VS_DIR=C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\IDE"
)
if not exist "%VS_DIR%\devenv.exe" (
    set "VS_DIR=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\IDE"
)

if exist "%VS_DIR%\devenv.exe" (
    start "" "%VS_DIR%\devenv.exe" "%PROJECT_DIR%"
    echo [OK] Đã mở thư mục auto-media-matrix trong Visual Studio 2022!
    echo 👉 Bạn có thể chỉnh sửa code và nhấn [F5] để chạy Server FastAPI!
) else (
    echo [OK] Đang mở thư mục dự án bằng VS Code hoặc Explorer...
    start "" code "%PROJECT_DIR%"
)

echo.
timeout /t 5 >nul
exit
