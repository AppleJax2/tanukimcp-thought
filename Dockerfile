FROM node:18.18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies - using production flag for smaller image
RUN npm install --production

# Copy only necessary files
COPY dist/ ./dist/
COPY tools-response.json ./
COPY smithery.yaml ./

# Set environment variables
ENV NODE_ENV=production
ENV ENABLE_QUICK_STARTUP=true

# Create a healthcheck that returns immediately
HEALTHCHECK --interval=5s --timeout=1s --retries=3 CMD [ "echo", "healthy" ]

# Run the server in stdio mode with IDE LLM flag
CMD ["node", "dist/index.js", "--ide-llm"] 