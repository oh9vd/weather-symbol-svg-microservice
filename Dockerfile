# Use Node.js 22 LTS with the latest Alpine Linux as the base image for smaller size and better security
FROM node:22-alpine

# Update Alpine packages to reduce vulnerabilities and install security patches
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better Docker layer caching
# This allows npm install to be cached if dependencies haven't changed
COPY weather-symbol-svg-microservice/package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application source code
COPY weather-symbol-svg-microservice/. .

# Run build script if it exists (conditional build step)
RUN if [ -f build.js ]; then node build.js; fi

# Expose port 4000 for the weather symbol SVG microservice
EXPOSE 4000

# Start the application server
CMD [ "node", "src/server.js" ]