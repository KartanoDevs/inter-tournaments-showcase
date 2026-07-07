# ==========================================
# Stage 1: Build de Angular (producción)
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

# Copiar manifiestos primero para aprovechar cache de capas de Docker
COPY package*.json ./
COPY .npmrc ./

# Instalación reproducible de dependencias
RUN npm ci

# Copiar el código fuente de la aplicación
# version.ts viene versionado en git (ya no se genera en build); el prebuild fue eliminado
COPY . .

# Compilar Angular en modo producción
RUN npm run build -- --configuration production

# ==========================================
# Stage 2: Servidor Nginx (imagen final mínima)
# ==========================================
FROM nginx:alpine AS serve

# Copiar los archivos estáticos compilados
# Angular 17+ genera los archivos en /dist/<nombre_proyecto>/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copiar la configuración de Nginx (con reverse proxy al backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
