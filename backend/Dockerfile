# Dockerfile para Railway / GastroRed
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copiamos archivos desde la raíz del contexto (que en Railway es /backend)
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
