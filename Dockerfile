FROM node:22-slim

# Instalar librerías nativas requeridas por skia-canvas y fuentes
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    fontconfig \
    fonts-dejavu-core \
    libfontconfig1 \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
