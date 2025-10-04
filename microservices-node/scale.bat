@echo off
REM InkSync Service Scaling Script for Windows

echo 🚀 InkSync Service Scaling Helper
echo =================================

if "%1"=="status" goto show_status
if "%1"=="examples" goto show_examples
if "%1"=="help" goto show_help
if "%1"=="" goto show_status

REM Scale services with provided arguments
set ROOM_SCALE=%1
set CHAT_SCALE=%2
set DRAWING_SCALE=%3
set WEBSOCKET_SCALE=%4

if "%ROOM_SCALE%"=="" set ROOM_SCALE=1
if "%CHAT_SCALE%"=="" set CHAT_SCALE=1
if "%DRAWING_SCALE%"=="" set DRAWING_SCALE=1
if "%WEBSOCKET_SCALE%"=="" set WEBSOCKET_SCALE=1

echo 📈 Scaling to:
echo   - Room Service: %ROOM_SCALE% instances
echo   - Chat Service: %CHAT_SCALE% instances
echo   - Drawing Service: %DRAWING_SCALE% instances
echo   - WebSocket Gateway: %WEBSOCKET_SCALE% instances

docker-compose up -d --scale room-service=%ROOM_SCALE% --scale chat-service=%CHAT_SCALE% --scale drawing-service=%DRAWING_SCALE% --scale websocket-gateway=%WEBSOCKET_SCALE%

echo ✅ Scaling complete!
goto show_status

:show_status
echo 📊 Current service status:
docker-compose ps
goto end

:show_examples
echo 📋 Scaling Examples:
echo.
echo   Basic scaling:
echo     scale.bat 2 3 1 2
echo     (2 room, 3 chat, 1 drawing, 2 websocket)
echo.
echo   High traffic scenario:
echo     scale.bat 3 5 2 3
echo.
echo   Scale down to save resources:
echo     scale.bat 1 1 1 1
echo.
echo   Individual service scaling:
echo     docker-compose up --scale chat-service=5 -d
goto end

:show_help
echo Usage: scale.bat [room_scale] [chat_scale] [drawing_scale] [websocket_scale]
echo        scale.bat status     - Show current status
echo        scale.bat examples   - Show scaling examples
call :show_examples
goto end

:end