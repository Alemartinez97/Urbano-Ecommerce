FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copiamos archivos de dependencias del monorepo para aprovechar el caché
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos todo el monorepo para que se reconozca la estructura de workspaces
COPY . .

# Compilamos el chatbot utilizando el comando del monorepo
RUN npm run build:chatbot

# --- Etapa final de producción ---
FROM node:20-alpine
WORKDIR /usr/src/app

# Copiamos el build compilado y las dependencias necesarias de la etapa anterior
COPY --from=builder /usr/src/app/urbano-chatbot ./urbano-chatbot
COPY --from=builder /usr/src/app/package*.json ./

# Exponemos el puerto oficial del frontend del chatbot
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /usr/src/app/urbano-chatbot
EXPOSE 3000

CMD ["npm", "run", "start"]
