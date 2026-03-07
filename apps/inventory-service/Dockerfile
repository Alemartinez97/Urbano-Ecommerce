FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# El comando asume la estructura de salida de NestJS
CMD ["node", "dist/apps/inventory-service/main"]
