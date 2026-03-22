# Dockerfile para Google Cloud Run - GastroRed (Root Context)
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# NOTA: Ahora agregamos "backend/" antes de los archivos porque el build se lanza desde la raíz
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .

EXPOSE 8080
CMD ["node", "src/index.js"]
