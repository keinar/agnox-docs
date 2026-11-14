# ============================================
# Docusaurus Documentation Site Dockerfile
# Replicates monorepo structure for correct relative paths
# ============================================

# Stage 1: Build the Docusaurus static site
FROM node:22-alpine AS builder

# Set base workdir to replicate monorepo root
WORKDIR /app

# Copy the root docs folder to /app/docs
COPY docs ./docs

# Root manifest + lockfile: the install is reproducible from the root lockfile
COPY package.json package-lock.json ./

# Copy apps/docs to /app/apps/docs (preserving monorepo structure)
COPY apps/docs ./apps/docs

# Install only the docs workspace from the root lockfile. No --legacy-peer-deps: with it
# npm skips peer dependencies the lockfile records (react-router) and the build fails.
RUN npm ci -w apps-docs

# Change to the docs app directory (where package.json lives)
WORKDIR /app/apps/docs

# Build the static site
# Now ../../docs correctly resolves to /app/docs
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output to Nginx html directory
COPY --from=builder /app/apps/docs/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]