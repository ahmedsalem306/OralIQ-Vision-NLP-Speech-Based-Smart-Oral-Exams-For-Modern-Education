@echo off
echo ===================================================
echo   OralIQ - AI Face Tracking Demo (Portable Setup)
echo ===================================================
echo.
cd /d "%~dp0"

IF NOT EXIST venv echo Creating isolated Python environment (venv)...
IF NOT EXIST venv python -m venv venv

echo Activating environment...
call venv\Scripts\activate.bat

echo Installing required AI processing libraries... (This may take a minute)
python -m pip install --upgrade pip
python -m pip install opencv-python==4.13.0.92 mediapipe numpy ultralytics

echo.
echo Starting the AI monitoring camera...
echo Press 'q' in the camera window to quit.
echo.

python face_model\demo_face_live.py

pause
