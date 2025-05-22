FROM node:18.18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies - using production flag for smaller image
RUN npm install --production

# Copy only necessary files
COPY dist/ ./dist/
COPY tools-manifest.json ./
COPY smithery.yaml ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TOOLS_PORT=3001
ENV ENABLE_QUICK_STARTUP=true

# Expose both the main port and tools endpoint port
EXPOSE 3000
EXPOSE 3001

# Create a healthcheck that returns immediately
HEALTHCHECK --interval=5s --timeout=1s --retries=3 CMD [ "echo", "healthy" ]

# Run the server in HTTP mode
CMD ["node", "dist/http.js"] 