# Stage 1: Install dependencies and build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including Prisma)
COPY package*.json ./
COPY prisma ./prisma/
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm ci

# Copy application files
COPY . .

# Generate the Prisma Client
RUN npx prisma generate

# Build Next.js in standalone mode
RUN npm run build

# Stage 2: Clean production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output and public files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
