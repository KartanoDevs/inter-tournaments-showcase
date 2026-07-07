# ==========================================
# Stage 1: Compilación
# ==========================================
FROM node:22-alpine AS build

# Instalar openssl para que Prisma genere el cliente correcto para Alpine/OpenSSL 3
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar manifiestos de dependencias primero (aprovecha cache de capas)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDeps para compilar)
RUN npm install

# Copiar el código fuente
COPY src ./src
COPY tsconfig.json ./

# Generar el cliente de Prisma (target nativo para linux-musl-openssl-3.0.x)
RUN npx prisma generate

# Compilar TypeScript a JavaScript
RUN npm run build

# ==========================================
# Stage 2: Producción (imagen final mínima)
# ==========================================
FROM node:22-alpine AS production

# openssl es requerido por el cliente nativo de Prisma en tiempo de ejecución
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar solo los artefactos necesarios para producción
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

# Crear el directorio para uploads (será montado como volumen Docker)
RUN mkdir -p public/uploads

EXPOSE 3000

# Al arrancar: sincroniza el schema con la DB y luego inicia el servidor
CMD ["sh", "-c", "npx prisma db push && node dist/app.js"]
