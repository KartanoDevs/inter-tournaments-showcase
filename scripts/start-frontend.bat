@echo off
title Inter AUU - Frontend App (Angular)
color 0E
echo =======================================================
echo         INICIANDO APLICACION FRONTEND (ANGULAR)
echo =======================================================
echo.
cd ..
cd frontend
echo Instalando/Verificando dependencias...
call npm install
echo.
echo Levantando servidor de desarrollo Angular...
call npm start
pause
