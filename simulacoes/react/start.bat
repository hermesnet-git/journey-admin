@echo off
setlocal
set "ROOT=%~dp0"

if "%~1"=="--run-app" goto :run_app

wt.exe -w new  new-tab --suppressApplicationTitle --title "bff-canal-web" cmd /k call "%~f0" --run-app "%ROOT%bff-canal-web" spring
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "bff-canal-app" cmd /k call "%~f0" --run-app "%ROOT%bff-canal-app" spring
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "canal-web"     cmd /k call "%~f0" --run-app "%ROOT%canal-web" react
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "canal-app"     cmd /k call "%~f0" --run-app "%ROOT%canal-app" react
goto :eof

:run_app
set "APP_PATH=%~2"
set "APP_TYPE=%~3"
cd /d "%APP_PATH%"
if /i "%APP_TYPE%"=="react" (
    if not exist "node_modules" (
        call npm install
        if errorlevel 1 exit /b 1
    )
    call npm run dev
) else (
    call .\mvnw.cmd compile
    if errorlevel 1 exit /b 1
    call .\mvnw.cmd spring-boot:run
)
