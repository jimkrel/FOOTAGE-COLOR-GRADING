@echo off
title Footage Color Studio Launcher
cd /d "%~dp0"

echo ===================================================
echo        FOOTAGE COLOR STUDIO - LAUNCHER
echo ===================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js tu https://nodejs.org/
    pause
    exit /b 1
)

echo Dang khoi chay ung dung...
call npm start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [THONG BAO] Ung dung da dong hoac xay ra loi.
    pause
)
