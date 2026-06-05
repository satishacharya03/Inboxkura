import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Use a dummy connection string during Next.js static build phase if missing
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

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
