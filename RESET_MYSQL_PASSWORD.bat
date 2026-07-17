@echo off
:: Request admin privileges automatically
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:admin
echo ==============================================
echo MySQL Password Reset Tool
echo ==============================================
echo.
echo [1] Stopping MySQL service...
net stop MySQL80 >nul 2>&1
net stop MySQL57 >nul 2>&1
taskkill /F /IM mysqld.exe >nul 2>&1

echo.
echo [2] Preparing reset file...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; > "%TEMP%\mysql-init.txt"

echo.
echo [3] Applying new password (root)...
start "MySQL Password Reset" /MIN "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --init-file="%TEMP%\mysql-init.txt"

echo Waiting 10 seconds for MySQL to apply the password...
timeout /t 10 /nobreak >nul

echo.
echo [4] Cleaning up...
taskkill /F /IM mysqld.exe >nul 2>&1
del "%TEMP%\mysql-init.txt"

echo.
echo [5] Starting MySQL service...
net start MySQL80 >nul 2>&1
if %errorLevel% neq 0 (
    net start MySQL57 >nul 2>&1
)

echo.
echo ==============================================
echo DONE! Your MySQL root password is now: root
echo You can now run START_CINEBOOK.bat
echo ==============================================
pause
