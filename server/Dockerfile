FROM node:20-alpine AS builder
WORKDIR /app

# Outils nécessaires pour compiler les modules natifs (better-sqlite3, bcrypt)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
