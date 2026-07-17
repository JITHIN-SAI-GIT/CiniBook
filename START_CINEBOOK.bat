@REM ============================================================
@REM  CineBook - Start ALL services with one click
@REM  1. Start Spring Boot backend  (http://localhost:8080)
@REM  2. Start React frontend       (http://localhost:5173)
@REM ============================================================
@echo off
title CineBook Startup
color 0A

echo.
echo  ============================================
echo   CineBook Movie Booking System - Startup
echo  ============================================
echo.

REM --- Check MySQL ---
echo [1/3] Checking MySQL...
sc query MySQL80 >nul 2>&1
if %errorlevel%==0 (
    net start MySQL80 >nul 2>&1
    echo  MySQL: Running
) else (
    sc query MySQL57 >nul 2>&1
    if %errorlevel%==0 (
        net start MySQL57 >nul 2>&1
        echo  MySQL: Running (MySQL57)
    ) else (
        echo  WARNING: Could not detect MySQL service. Make sure MySQL is running.
    )
)

REM --- Download mvnw if needed ---
if not exist "%USERPROFILE%\.m2\wrapper\dists" mkdir "%USERPROFILE%\.m2\wrapper\dists"

REM --- Start Backend ---
echo.
echo [2/3] Starting Spring Boot Backend (port 8080)...
echo  Tip: First run downloads Maven and compiles (~3 min). Subsequent starts are faster.
echo.
start "CineBook Backend" cmd /k "set JAVA_HOME=C:\Program Files\Java\jdk-17 && cd /d "%~dp0backend" && mvnw.cmd spring-boot:run"

REM Give backend time to start
timeout /t 5 /nobreak >nul

REM --- Start Frontend ---
echo.
echo [3/3] Starting React Frontend (port 5173)...
start "CineBook Frontend" cmd /k "cd /d "%~dp0project" && npm run dev"

echo.
echo  ============================================
echo   CineBook is starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8080/api
echo   Admin:    admin@cinebook.com / admin123
echo  ============================================
echo.
echo  Both windows opened. Close this window when done.
pause
