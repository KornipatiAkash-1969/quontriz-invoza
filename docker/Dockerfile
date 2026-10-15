# Multi-stage Dockerfile for Quontriz Invoza
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY server/package*.json ./server/

# Install all dependencies
RUN npm run install:all

# Copy project source
COPY . .

# Build production frontend
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000

VOLUME ["/app/server/database", "/app/server/uploads"]

CMD ["npm", "start"]
