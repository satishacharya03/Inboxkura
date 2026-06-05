FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
ENV NODE_OPTIONS="--max-old-space-size=256"
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["npm", "start"]
