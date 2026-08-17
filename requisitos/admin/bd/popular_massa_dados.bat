@echo off
rem Limpa e repopula o banco journey_admin com massa_de_dados_journeys.sql, depois publica todas
rem as jornadas criadas via API real do admin/back (POST /journeys/{id}/publish). Toda a logica
rem fica em popular_massa_dados.ps1 (usa Invoke-RestMethod para autenticar/publicar).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0popular_massa_dados.ps1"
exit /b %errorlevel%
