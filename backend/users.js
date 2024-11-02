import { getDb, validateAuth } from './system.js';

export function setupUserRoutes(fastify) {
  // Get user profile
  fastify.get('/api/users/:username', async (request) => {
    const db = getDb();
    const user = await db.get(
      'SELECT id, username, created_at FROM users WHERE username = ?',
      [request.params.username]
    );

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const listings = await db.all(
      `SELECT l.*, COUNT(li.user_id) as likes
       FROM listings l
       LEFT JOIN likes li ON l.id = li.listing_id
       WHERE l.user_id = ?
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
      [user.id]
    );

    return {
      ...user,
      listings
    };
  });

  // Get user's liked listings
  fastify.get('/api/users/me/likes', {
    preHandler: validateAuth,
    handler: async (request) => {
      const db = getDb();
      const likes = await db.all(
        `SELECT l.*, u.username, COUNT(li2.user_id) as likes
         FROM likes li
         JOIN listings l ON li.listing_id = l.id
         JOIN users u ON l.user_id = u.id
         LEFT JOIN likes li2 ON l.id = li2.listing_id
         WHERE li.user_id = ?
         GROUP BY l.id
         ORDER BY li.created_at DESC`,
        [request.user.id]
      );

      return likes;
    }
  });

  // Update user profile
  fastify.patch('/api/users/me', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const { username, email } = request.body;
      const db = getDb();

      if (username) {
        const existingUser = await db.get(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [username, request.user.id]
        );

        if (existingUser) {
          return reply.code(400).send({
            error: 'Username already taken'
          });
        }
      }

      if (email) {
        const existingEmail = await db.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, request.user.id]
        );

        if (existingEmail) {
          return reply.code(400).send({
            error: 'Email already in use'
          });
        }
      }

      const updates = [];
      const values = [];
      
      if (username) {
        updates.push('username = ?');
        values.push(username);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }

      if (updates.length > 0) {
        values.push(request.user.id);
        await db.run(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      const user = await db.get(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        [request.user.id]
      );

      return user;
    }
  });

  // Get user's listings
  fastify.get('/api/users/me/listings', {
    preHandler: validateAuth,
    handler: async (request) => {
      const db = getDb();
      const listings = await db.all(
        `SELECT l.*, COUNT(li.user_id) as likes
         FROM listings l
         LEFT JOIN likes li ON l.id = li.listing_id
         WHERE l.user_id = ?
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
        [request.user.id]
      );

      return listings;
    }
  });
}