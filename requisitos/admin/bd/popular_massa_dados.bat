@echo off
rem Limpa e repopula o banco journey_admin com massa_de_dados_journeys.sql, dump literal do
rem estado real do banco (jornadas/versoes/publicacoes ja inclusas). Toda a logica fica em
rem popular_massa_dados.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0popular_massa_dados.ps1"
exit /b %errorlevel%
