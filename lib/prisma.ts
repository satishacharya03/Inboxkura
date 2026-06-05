import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to .env.local (see .env for reference).'
  );
}

// Configure connection pooling options dynamically for development and VPS/Docker environments
const isProduction = process.env.NODE_ENV === 'production';
const sslEnv = process.env.DATABASE_SSL;
const poolSize = process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE, 10) : (isProduction ? 15 : 5);

// Determine SSL usage (Neon requires SSL, local dev/docker database usually doesn't)
const ssl = sslEnv === 'true' 
  ? { rejectUnauthorized: false } 
  : sslEnv === 'false' 
    ? false 
    : (connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false);

const pool = new Pool({
  connectionString,
  ssl,
  max: poolSize,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
