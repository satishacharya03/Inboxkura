FROM node:20-alpine
WORKDIR /app

# Enable Next.js experimental memory restrictions and standalone build
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

# Install all dependencies (including devDependencies like tsx for workers)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# Copy the entire source code (since workers and websockets need their raw TS files)
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Expose Next.js and WebSocket ports
EXPOSE 3000
EXPOSE 4000

# Default command will be overridden by docker-compose for each service
CMD ["npm", "start"]
