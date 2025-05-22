FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Set production environment for running
ENV NODE_ENV=production

# Expose port for server
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/index.js"] 