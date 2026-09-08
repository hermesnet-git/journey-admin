@echo off
chcp 65001 >nul
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0popular_massa_dados.ps1"
exit /b %errorlevel%
