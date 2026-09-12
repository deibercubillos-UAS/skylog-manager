# ── Bitafly AeroCivil Robot — Imagen Docker ───────────────────────────────────
# Usa la imagen oficial de Microsoft Playwright con Chromium + librerías del
# sistema pre-instaladas. Evita el error libglib-2.0.so.0 de entornos Nix.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# Browsers pre-instalados en /ms-playwright — no descargar de nuevo
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

WORKDIR /app

# Instalar dependencias de Node (sin postinstall que lanzaría playwright install)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copiar código fuente
COPY . .

# Railway inyecta $PORT automáticamente
EXPOSE 3001

CMD ["node", "server.js"]
