@echo off
setlocal enabledelayedexpansion
for %%P in (5173 8081 5175 8083 8084 8082) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
        echo Porta %%P -^> matando PID %%A
        taskkill /F /PID %%A >nul 2>&1
    )
)
pause
