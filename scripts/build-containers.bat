@echo off
setlocal enabledelayedexpansion
title Compilar y Desplegar Contenedores (Inter AUU)

echo =================================================================
echo [DEV-OPS] Compilando y Desplegando Contenedores de la Rama Actual
echo =================================================================
echo.
cd ..

echo.
echo [2/4] Deteniendo y limpiando contenedores previos...
docker-compose down

echo.
echo [3/4] Construyendo imagenes con el codigo fuente local (Backend y Frontend)...
:: Se fuerza la reconstruccion usando las capas de cache disponibles pero integrando el codigo nuevo
docker-compose build

echo.
echo [4/4] Levantando los servicios (Base de datos, Backend, Frontend)...
:: Se levantan en background (detached)
docker-compose up -d

echo.
echo =================================================================
echo Despliegue completado.
echo =================================================================
echo Para monitorizar los logs en tiempo real, ejecuta:
echo docker-compose logs -f
echo.
pause
