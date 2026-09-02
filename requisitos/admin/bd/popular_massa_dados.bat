@echo off
rem Confirma com o usuario, checa se a stack esta no ar, zera o Camunda (mata a porta 8080 e
rem apaga o H2, sobe de novo), repopula journey_admin com massa_de_dados_journeys.sql e
rem republica as jornadas via API do admin/back. Toda a logica fica em popular_massa_dados.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0popular_massa_dados.ps1"
exit /b %errorlevel%
