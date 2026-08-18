@echo off
setlocal
set "ROOT=%~dp0"

if "%~1"=="--run-app" goto :run_app

wt.exe -w new  new-tab --suppressApplicationTitle --title "front"                    cmd /k call "%~f0" --run-app "%ROOT%front" react
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "back"                     cmd /k call "%~f0" --run-app "%ROOT%back" spring
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "front-mock-integracoes"   cmd /k call "%~f0" --run-app "%ROOT%simulacoes\front-mock-integracoes" react
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "ms-espec-registry"        cmd /k call "%~f0" --run-app "%ROOT%simulacoes\ms-espec-registry" spring
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "ms-mock-api-rest"         cmd /k call "%~f0" --run-app "%ROOT%simulacoes\ms-mock-api-rest" spring
ping -n 2 127.0.0.1 >nul
wt.exe -w last new-tab --suppressApplicationTitle --title "ms-transform-publication" cmd /k call "%~f0" --run-app "%ROOT%simulacoes\ms-transform-publication" spring
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
