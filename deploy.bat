@echo off
REM ============================================================================
REM DEPLOYMENT SCRIPT - Force Sync Local to Server (Windows)
REM ============================================================================

echo.
echo ========================================
echo   MAGNIFIC KLING V3 DEPLOYMENT
echo ========================================
echo.

REM Configuration
set SERVER_USER=gekanet
set SERVER_HOST=your-server-ip
set SERVER_PATH=/var/www/magnific-kling

REM Check if server is configured
if "%SERVER_HOST%"=="your-server-ip" (
    echo [ERROR] Please configure SERVER_HOST in deploy.bat
    echo Edit deploy.bat and change SERVER_HOST to your server IP
    pause
    exit /b 1
)

echo [1/5] Checking for local changes...
git status --short > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found git repository
) else (
    echo [ERROR] Not a git repository
    pause
    exit /b 1
)

REM Check if there are changes
git diff-index --quiet HEAD --
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Found uncommitted changes. Committing...
    git add .
    git commit -m "deploy: Auto-commit before deployment %date% %time%"
    echo [SUCCESS] Changes committed
) else (
    echo [INFO] No local changes to commit
)

echo.
echo [2/5] Pushing to git repository...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to push to git
    pause
    exit /b 1
)
echo [SUCCESS] Pushed to git

echo.
echo [3/5] Deploying to server...
echo Connecting to %SERVER_USER%@%SERVER_HOST%...

REM Deploy via SSH
ssh %SERVER_USER%@%SERVER_HOST% "cd %SERVER_PATH% && git fetch origin && git reset --hard origin/master && git clean -fd && ls -la public/ && pm2 restart magnific-kling"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo [SUCCESS] Deployment completed

echo.
echo [4/5] Waiting for server to restart...
timeout /t 5 /nobreak > nul

echo.
echo [5/5] Verifying deployment...
curl -s https://magnific.he3x.my.id | findstr "AI Motion Video Generator" > nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Server is responding correctly!
) else (
    echo [WARNING] Could not verify server response
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Server is now in sync with local
echo Access: https://magnific.he3x.my.id
echo.
pause