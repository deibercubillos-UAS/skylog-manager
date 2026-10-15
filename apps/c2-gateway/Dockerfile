FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Puerto MQTT (RC/Pilot 2 se conecta aquí) + puerto HTTP (health check).
EXPOSE 1883 8080

CMD ["node", "src/index.js"]
