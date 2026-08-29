@echo off
setlocal enabledelayedexpansion
for %%P in (8086 8087 5176 5177) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
        echo Porta %%P -^> matando PID %%A
        taskkill /F /PID %%A >nul 2>&1
    )
)
pause
