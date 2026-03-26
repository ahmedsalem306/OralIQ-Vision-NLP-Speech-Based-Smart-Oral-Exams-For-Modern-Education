@echo off
echo ===================================================
echo   OralIQ - Frontend Presentation Mode
echo ===================================================
echo.
echo Installing dependencies (if needed) and checking for errors...
echo.

cd /d "%~dp0\frontend"
call npm install
echo.
echo Starting the Frontend Server...
echo The site will automatically open in your default browser.
echo.

call npm run dev -- --open

pause
