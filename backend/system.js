import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

let db;

// Database initialization
export const initDb = async () => {
  if (!db) {
    db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    await db.run('PRAGMA foreign_keys = ON');

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        condition TEXT NOT NULL CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id)
      );

      CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
      CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
      CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
    `);
  }
  return db;
};

// Auth functions
export const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

export async function validateAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

// Auth routes
export async function setupAuthRoutes(fastify) {
  fastify.post('/api/auth/register', async (request, reply) => {
    const { username, email, password } = request.body;
    const db = getDb();

    try {
      const existingUser = await db.get(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUser) {
        return reply.code(400).send({
          error: 'User already exists'
        });
      }

      const passwordHash = await hashPassword(password);
      const result = await db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, passwordHash]
      );

      const token = fastify.jwt.sign({ id: result.lastID });
      return { token };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;
    const db = getDb();

    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const valid = await comparePasswords(password, user.password_hash);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ id: user.id });
      return { token, username: user.username };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/api/auth/me', { preHandler: [validateAuth] }, async (request) => {
    const db = getDb();
    const user = await db.get(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [request.user.id]
    );
    return user;
  });
}