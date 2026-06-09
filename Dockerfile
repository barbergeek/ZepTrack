# Build stage for frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built frontend from build stage
COPY --from=frontend-build /app/dist ./dist

# Copy server code
COPY server ./server
COPY tsconfig.json ./

# Install tsx for running TypeScript
RUN npm install tsx

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/zeptrack.db

# Health check
HEALTHCHECK --interval=5m --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["npx", "tsx", "server/index.ts"]
