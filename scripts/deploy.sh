#!/bin/bash
# =================================================================
# deploy.sh — Script de despliegue para producción (Ubuntu/Linux)
# Uso: bash deploy.sh
# =================================================================

set -e  # Detener el script si cualquier comando falla

# Rutas absolutas
NPM_DIR="/home/ubuntu/docker/nginx-proxy"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================================="
echo " INTER AUU — Despliegue en Producción"
echo "================================================================="
echo ""

# -----------------------------------------------
# PASO 1: Obtener la última versión del código
# -----------------------------------------------
echo "[1/6] Actualizando código desde el repositorio..."
cd "$APP_DIR"
git pull origin main
echo "      ✅ Código actualizado."
echo ""

# -----------------------------------------------
# PASO 2: Arrancar Nginx Proxy Manager (puerta de entrada)
# -----------------------------------------------
echo "[2/6] Verificando Nginx Proxy Manager..."
cd "$NPM_DIR"
if docker compose ps | grep -q "Up"; then
    echo "      ℹ️  NPM ya está corriendo. Sin cambios."
else
    echo "      ⚠️  NPM estaba caído. Levantando..."
    docker compose up -d
    echo "      ✅ NPM levantado en puertos 80, 81 y 443."
fi
cd "$APP_DIR"
echo ""

# -----------------------------------------------
# PASO 3: Parar y eliminar contenedores de la app
# -----------------------------------------------
echo "[3/6] Deteniendo y eliminando contenedores actuales..."
docker compose down --remove-orphans
echo "      ✅ Contenedores eliminados."
echo ""

# -----------------------------------------------
# PASO 4: Limpiar imágenes antiguas de este proyecto
# -----------------------------------------------
echo "[4/6] Limpiando imágenes huérfanas (liberando espacio en disco)..."
docker image prune -f
echo "      ✅ Imágenes limpiadas."
echo ""

# -----------------------------------------------
# PASO 5: Reconstruir imágenes con el código nuevo
# -----------------------------------------------
echo "[5/6] Reconstruyendo imágenes (backend + frontend)..."
docker compose build --no-cache
echo "      ✅ Imágenes reconstruidas."
echo ""

# -----------------------------------------------
# PASO 6: Levantar todos los servicios en background
# -----------------------------------------------
echo "[6/6] Levantando servicios en segundo plano..."
docker compose up -d
echo "      ✅ Servicios levantados."
echo ""

echo "================================================================="
echo " DESPLIEGUE COMPLETADO"
echo " - NPM Panel:    http://<IP_SERVIDOR>:81"
echo " - Frontend:     http://<IP_SERVIDOR>  (vía NPM)"
echo " - Backend API:  http://<IP_SERVIDOR>/api (vía NPM → frontend nginx)"
echo "================================================================="
echo ""
echo " Estado de todos los contenedores:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo " Para monitorizar logs en tiempo real:"
echo "   docker compose logs -f"
