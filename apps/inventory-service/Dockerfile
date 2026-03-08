FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copiamos archivos de configuración de la raíz
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalamos dependencias
RUN npm install

# Copiamos todo el código fuente para que NestJS vea las librerías compartidas
COPY . .

# Compilamos la aplicación específica
RUN npm run build inventory-service

# Etapa final para reducir el tamaño de la imagen
FROM node:20-alpine
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_OPTIONS="-r dd-trace/init"
CMD ["node", "dist/apps/inventory-service/main"]
