@echo off
title ZNS ORDER MASTER PRO - He Thong Quan Ly Don Hang va Zalo ZNS
chcp 65001 >nul
cls

echo ====================================================================
echo      ZNS ORDER MASTER PRO - HE THONG QUAN LY DON HANG VA ZNS
echo      Nen Tang Quan Ly Don - Ton Kho - Khach Hang - Zalo ZNS
echo ====================================================================
echo.

:: [1] Kiem tra moi truong Node.js
echo [1/5] Kiem tra moi truong Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong tim thay Node.js tren he thong!
    echo Vui long cai dat Node.js tai https://nodejs.org/ truoc khi su dung.
    echo.
    pause
    exit /b 1
)

:: [2] Kiem tra file server.js
echo [2/5] Kiem tra tep ma nguon server.js...
if exist "%~dp0server.js" (
    cd /d "%~dp0"
) else if exist "%~dp0zns-oms\server.js" (
    cd /d "%~dp0zns-oms"
) else (
    echo.
    echo [LOI] Khong tim thay file "server.js"!
    echo Vui long kiem tra lai cau truc thu muc du an.
    echo.
    pause
    exit /b 1
)

:: [3] Kiem tra thu vien phu thuoc (node_modules)
echo [3/5] Kiem tra goi thu vien node_modules...
if not exist "node_modules" (
    echo.
    echo [THONG BAO] Phat hien chua cai dat thu vien, dang tu dong chay "npm install"...
    echo Qua trinh nay chi dien ra 1 lan duy nhat, vui long doi giay lat...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [LOI] Cai dat thu vien that bai. Vui long kiem tra lai ket noi mang.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Da cai dat xong thu vien phu thuoc!
)

:: [4] Kiem tra xung dot cong mang (Port 3500)
echo [4/5] Kiem tra trang thai cong 3500...
netstat -ano | findstr /r /c:":3500 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ====================================================================
    echo [THONG BAO] Cong 3500 da dang hoat dong - Web Server da chay san!
    echo.
    echo  - Xem tren Laptop:     http://localhost:3500
    echo  - Xem tren Dien thoai:  http://192.168.1.34:3500
    echo.
    echo Dang mo trinh duyet Laptop... (Dien thoai ket noi cung Wi-Fi)
    echo ====================================================================
    echo.
    start http://localhost:3500
    pause
    exit /b 0
)

:: [5] Hien thi thong tin he thong
echo.
echo ====================================================================
echo  TINH NANG CHINH CUA HE THONG:
echo  --------------------------------------------------------------------
echo  1. Dashboard KPI, Doanh thu, Xu huong va Bieu do trang thai
echo  2. Quan ly Don hang, Theo doi tien do, Tra cuu Ma van don
echo  3. Tich hop Zalo ZNS Hub (Tu dong thong bao khi doi trang thai don)
echo  4. Quan ly San pham, Tu dong tru va hoan ton kho (Optimistic Lock)
echo  5. Quan tri Khach hang (CRM), Hang thanh vien va Lich su mua hang
echo  6. In Hoa don A4, Tem nhan nhiet A6, Phieu nhat A5 va Bill K80
echo  7. Ho tro xem va thao tac muot ma ca tren Laptop va Dien thoai (Wi-Fi)
echo ====================================================================
echo.

:: [6] Hen gio 3 giay mo trinh duyet trong nen (Khac phuc triet de Race Condition)
echo [5/5] Dang chuan bi khoi dong trinh duyet tai http://localhost:3500...
start /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3500"

:: [7] Khoi dong Server Node.js
echo.
echo ====================================================================
echo  DANG KHOI DONG WEB SERVER TAI CONG 3500...
echo  - Laptop / May tinh:  http://localhost:3500
echo  - Dien thoai (Wi-Fi): http://192.168.1.34:3500
echo.
echo  (Nhan to hop phim Ctrl + C de dong he thong khi ket thuc ca lam viec)
echo ====================================================================
echo.
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [CANH BAO] Server Node.js da dung dot ngot voi ma loi: %errorlevel%
    echo Vui long kiem tra lai nhat ky he thong.
    pause
)
