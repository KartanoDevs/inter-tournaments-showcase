@echo off
title Inter AUU - Backend API (Node.js)
color 0A
echo =======================================================
echo       INICIANDO SERVIDOR BACKEND (EXPRESS API)
echo =======================================================
echo.
cd ..
cd backend
echo Instalando/Verificando dependencias...
call npm install
echo.
echo Compilando y levantando servidor...
call npm run dev
pause
