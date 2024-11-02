import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { initDb } from './system.js';
import { setupListingsRoutes } from './listings.js';
import { setupUserRoutes } from './users.js';
import { setupAuthRoutes } from './system.js';
import { setupChatRoutes } from './chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const buildApp = async () => {
  const fastify = Fastify({ logger: true });

  // Initialize database
  await initDb();

  // Basic plugins
  await fastify.register(import('@fastify/multipart'), {
    attachFieldsToBody: true,
    limits: {
      fieldSize: 5 * 1024 * 1024 // 5MB
    }
  });
  
  await fastify.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://yourdomain.com' 
      : 'http://localhost:5173',
    credentials: true
  });

  await fastify.register(fastifyJwt, {
    secret: 'your-secret-key-change-this-in-production'
  });

  // Serve uploaded images
  await fastify.register(import('@fastify/static'), {
    root: path.join(__dirname, 'uploads'),
    prefix: '/images/',
    decorateReply: false
  });

  // Global auth hook
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      if (request.url.startsWith('/api/') && 
          !request.url.startsWith('/api/auth/') &&
          !request.url.match(/^\/api\/(listings|images)\/.*$/) &&
          request.method !== 'GET') {
        await request.jwtVerify();
      }
    } catch (err) {
      reply.send(err);
    }
  });

  // Register route modules
  setupChatRoutes(fastify);
  setupListingsRoutes(fastify);
  setupUserRoutes(fastify);
  setupAuthRoutes(fastify);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    
    if (error.validation) {
      reply.status(400).send({
        error: 'Validation Error',
        message: error.message
      });
      return;
    }

    if (error.statusCode) {
      reply.status(error.statusCode).send({
        error: error.name,
        message: error.message
      });
      return;
    }

    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  });

  return fastify;
};

const startServer = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: 8080, host: '0.0.0.0' });
    app.log.info('Server listening on port 8080');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();