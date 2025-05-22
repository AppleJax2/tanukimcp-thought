FROM node:18.18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies for build process
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript project
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Copy configuration files
COPY tools-response.json ./
COPY tools-manifest.json ./
COPY smithery.yaml ./
COPY tanuki-config.json ./

# Set environment variables for HTTP mode
ENV NODE_ENV=production
ENV SMITHERY_HOSTED=true
ENV USE_IDE_LLM=true
ENV HTTP_MODE=true
ENV PORT=3000

# Expose HTTP port
EXPOSE 3000

# Create HTTP healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the HTTP server
CMD ["node", "dist/http-server.js"] 