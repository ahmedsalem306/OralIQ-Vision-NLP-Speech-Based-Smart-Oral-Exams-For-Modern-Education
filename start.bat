@echo off
chcp 65001 >nul
title Interview AI - Starting...

echo ============================================
echo    Interview AI - One Click Start
echo ============================================
echo.

:: ── 1. Start Backend ──────────────────────────
echo [1/3] Starting Backend Server...
cd /d "%~dp0backend"

:: Activate venv and start uvicorn in a new window
start "Interview-AI Backend" cmd /k "call venv\Scripts\activate.bat && echo. && echo Backend starting on http://localhost:8000 && echo. && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Give backend a moment to start
timeout /t 3 /nobreak >nul

:: ── 2. Start Frontend ─────────────────────────
echo [2/3] Starting Frontend Server...
cd /d "%~dp0frontend"

start "Interview-AI Frontend" cmd /k "echo. && echo Frontend starting on http://localhost:5173 && echo. && npm run dev"

:: Give frontend a moment to start
timeout /t 4 /nobreak >nul

:: ── 3. Open Browser ───────────────────────────
echo [3/3] Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo    All services started!
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo    Health:   http://localhost:8000/health
echo ============================================
echo.
echo Close this window anytime.
echo To stop: close the Backend and Frontend windows.
echo.
pause
