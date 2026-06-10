# ============================================================
# Stage 1 — BUILD
# Use the official Node.js LTS image to build the Angular app
# ============================================================
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /voltstream

# Copy package manifests first to leverage Docker layer caching.
# Dependencies are only re-installed when package.json changes.
COPY package*.json ./

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Install project dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Angular app in production mode
# Output will be placed in /voltstream/dist/voltstream
RUN ng build --configuration production

# ============================================================
# Stage 2 — SERVE
# Use the official lightweight NGINX image to serve the built app
# ============================================================
FROM nginx:alpine

# Remove the default NGINX welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the production build from the build stage into NGINX's
# HTML serving directory. The project name is "voltstream" as
# defined in angular.json → projects → voltstream → outputPath.
COPY --from=build /voltstream/dist/voltstream/browser /usr/share/nginx/html

# Copy a custom NGINX config to support Angular's HTML5 routing
# (redirects all paths to index.html so deep-links work correctly)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start NGINX in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
