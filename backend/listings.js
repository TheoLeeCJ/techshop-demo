import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { getDb, validateAuth } from './system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function setupListingsRoutes(fastify) {
  // Get listings with filters
  // Update in listings.js - Get listings route
  fastify.get('/api/listings', async (request) => {
    const db = getDb();
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20
    } = request.query;

    let query = `
      SELECT l.*, u.username, COUNT(li.user_id) as likes 
      FROM listings l 
      LEFT JOIN users u ON l.user_id = u.id 
      LEFT JOIN likes li ON l.id = li.listing_id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(l.title LIKE ? OR l.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      conditions.push('l.category = ?');
      params.push(category);
    }

    if (condition) {
      conditions.push('l."condition" = ?');  // Fixed: Added quotes around condition
      params.push(condition);
    }

    if (minPrice) {
      conditions.push('l.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice) {
      conditions.push('l.price <= ?');
      params.push(maxPrice);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY l.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const listings = await db.all(query, params);
    
    // Count total with same filters but without pagination
    const countQuery = 'SELECT COUNT(*) as total FROM listings l ' +
      (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '');
    
    const [{ total }] = await db.all(countQuery, params.slice(0, -2));

    return {
      listings,
      total,
      pages: Math.ceil(total / limit)
    };
  });

  // Get single listing
  fastify.get('/api/listings/:id', async (request) => {
    const db = getDb();
    const listing = await db.get(
      `SELECT l.*, u.username, COUNT(li.user_id) as likes
       FROM listings l 
       LEFT JOIN users u ON l.user_id = u.id 
       LEFT JOIN likes li ON l.id = li.listing_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [request.params.id]
    );
    
    if (!listing) {
      throw { statusCode: 404, message: 'Listing not found' };
    }
    
    return listing;
  });

  // Create listing
  fastify.post('/api/listings', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const db = getDb();
      
      if (!request.isMultipart()) {
        return reply.code(400).send({ error: 'Request must be multipart' });
      }

      const data = await request.body;
      
      if (!data.file) {
        return reply.code(400).send({ error: 'Image is required' });
      }

      console.log(data);

      // Save image
      const file = data.file;
      const ext = path.extname(file.filename);
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      fs.writeFileSync(filepath, await file.toBuffer());
      //await pipeline(await file.toBuffer(), fs.createWriteStream(filepath));

      // Parse listing data
      const { title, description, price, category, condition } = JSON.parse(data.data.value.toString());
      
      const result = await db.run(
        `INSERT INTO listings 
         (user_id, title, description, price, category, condition, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          request.user.id,
          title,
          description,
          price,
          category,
          condition,
          `/images/${filename}`
        ]
      );

      const listing = await db.get('SELECT * FROM listings WHERE id = ?', [result.lastID]);
      return listing;
    }
  });

  // Like/unlike listing
  fastify.post('/api/listings/:id/like', {
    preHandler: validateAuth,
    handler: async (request) => {
      const db = getDb();
      const { id } = request.params;
      
      const existing = await db.get(
        'SELECT * FROM likes WHERE user_id = ? AND listing_id = ?',
        [request.user.id, id]
      );

      if (existing) {
        await db.run(
          'DELETE FROM likes WHERE user_id = ? AND listing_id = ?',
          [request.user.id, id]
        );
        return { liked: false };
      } else {
        await db.run(
          'INSERT INTO likes (user_id, listing_id) VALUES (?, ?)',
          [request.user.id, id]
        );
        return { liked: true };
      }
    }
  });

  // Delete listing
  fastify.delete('/api/listings/:id', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const db = getDb();
      const listing = await db.get(
        'SELECT * FROM listings WHERE id = ? AND user_id = ?',
        [request.params.id, request.user.id]
      );

      if (!listing) {
        return reply.code(404).send({ error: 'Listing not found or unauthorized' });
      }

      // Delete image
      if (listing.image_url) {
        const filename = path.basename(listing.image_url);
        const filepath = path.join(UPLOAD_DIR, filename);
        try {
          await fs.promises.unlink(filepath);
        } catch (err) {
          fastify.log.error('Error deleting image:', err);
        }
      }

      await db.run('DELETE FROM likes WHERE listing_id = ?', [listing.id]);
      await db.run('DELETE FROM listings WHERE id = ?', [listing.id]);

      return { success: true };
    }
  });
}