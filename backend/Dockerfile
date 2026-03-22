# Dockerfile para Google Cloud Run - GastroRed
FROM node:20-slim

# Instalar dependencias necesarias para algunas librerías de Node (opcional pero recomendado)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa Cloud Run (8080 por defecto)
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]
