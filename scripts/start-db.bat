@echo off
title Inter AUU - Database Launcher
color 0B
echo =======================================================
echo     INICIANDO BASE DE DATOS (POSTGRESQL - DOCKER)
echo =======================================================
echo.
echo Levantando el entorno con docker-compose (SOLO Base de Datos)...
cd ..
docker-compose up -d db

echo.
echo [!] Esperando unos segundos para que la base de datos acepte conexiones...
timeout /t 5 /nobreak > nul

echo.
echo =======================================================
echo     SINCRONIZANDO PRISMA (GENERACION Y PUSH)
echo =======================================================
cd backend
echo - Generando cliente local de Prisma...
call npx prisma generate
echo - Empujando esquema a la base de datos...
call npx prisma db push
cd ..

echo.
echo Proceso finalizado con exito. Todo sincronizado, Boss.
pause
