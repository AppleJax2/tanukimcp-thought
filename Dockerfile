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

# Set environment variables
ENV NODE_ENV=production
ENV ENABLE_QUICK_STARTUP=true
ENV SMITHERY_HOSTED=true
ENV USE_IDE_LLM=true

# Create a healthcheck that returns immediately
HEALTHCHECK --interval=5s --timeout=1s --retries=3 CMD [ "echo", "healthy" ]

# Run the server in stdio mode with IDE LLM flag (always required)
CMD ["node", "dist/index.js", "--ide-llm"] 