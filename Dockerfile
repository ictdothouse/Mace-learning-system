# Dockerfile untuk eLearning Atlet SUKMA
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies dulu (optimize layer caching)
COPY package*.json ./
RUN npm install --production

# Copy semua file aplikasi
COPY . .

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "app.js"]
