FROM node:22-slim

# better-sqlite3 needs these for native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV PORT=8080
ENV MEMORY_AUTH_TOKEN=changeme
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server.js"]
