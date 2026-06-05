import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import * as jose from 'jose';
import cookie from 'cookie';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.WS_PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || '*',
    credentials: true,
  },
});

// Setup Redis adapter for scaling WebSocket instances
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
const appEventsSub = pubClient.duplicate();

Promise.all([
  pubClient.connect(),
  subClient.connect(),
  appEventsSub.connect()
]).then(async () => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✓ Connected to Redis and set up Socket.io Redis Adapter');

  // Subscribe to internal app:events for Next.js API / Worker communication
  await appEventsSub.subscribe('app:events', (message) => {
    try {
      const { orgId, event, payload } = JSON.parse(message);
      if (orgId && event) {
        io.to(`org_${orgId}`).emit(event, payload);
      }
    } catch (err) {
      console.error('✗ Failed to process app:events Redis broadcast:', err);
    }
  });
  console.log('✓ Subscribed to Redis "app:events" channel');
}).catch(err => {
  console.error('✗ Redis Connection failed inside WS server:', err);
});

// Middleware for authorization using cookies
io.use(async (socket, next) => {
  try {
    const cookiesHeader = socket.handshake.headers.cookie || '';
    const parsedCookies = cookie.parse(cookiesHeader);
    const token = parsedCookies['auth_token'];
    const activeOrgId = parsedCookies['active_org_id'];

    if (!token) {
      return next(new Error('Authentication failed: auth_token missing'));
    }
    if (!activeOrgId) {
      return next(new Error('Authentication failed: active_org_id missing'));
    }

    // Decrypt and verify JWT
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    // Authenticated successfully
    socket.data.userId = payload.userId as string;
    socket.data.orgId = activeOrgId;
    next();
  } catch (err) {
    console.warn('🔌 Socket authentication failed:', err instanceof Error ? err.message : err);
    next(new Error('Authentication failed: invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, orgId } = socket.data;
  const roomName = `org_${orgId}`;
  
  socket.join(roomName);
  console.log(`🔌 Client connected: User ${userId} joined room ${roomName}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: User ${userId} left room ${roomName}`);
  });
});

app.get('/health', (req, res) => {
  res.send({ status: 'healthy', port: PORT });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Standalone WebSockets Server running on port ${PORT}`);
});
