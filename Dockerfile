FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Railway injects PORT
ENV PORT=8080
ENV MEMORY_AUTH_TOKEN=changeme
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server.js"]
