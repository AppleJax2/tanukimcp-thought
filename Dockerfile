FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the package
RUN npm run build

# Expose the port if needed (adjust as necessary)
# EXPOSE 3000

# Command to run
CMD ["node", "dist/index.js"] 