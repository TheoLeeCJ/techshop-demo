// chat.js
import { getDb, validateAuth } from './system.js';

export function setupChatRoutes(fastify) {
  // Create chat schema in database initialization
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      chat_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chats_listing ON chats(listing_id);
    CREATE INDEX IF NOT EXISTS idx_chats_buyer ON chats(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_chats_seller ON chats(seller_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
  `);

  // Start a chat or get existing chat
  fastify.post('/api/chat/start/:listingId', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const { listingId } = request.params;
      const buyerId = request.user.id;

      // Get listing and verify it exists
      const listing = await db.get(
        'SELECT user_id as seller_id FROM listings WHERE id = ?',
        [listingId]
      );

      if (!listing) {
        return reply.code(404).send({ error: 'Listing not found' });
      }

      if (listing.seller_id === buyerId) {
        return reply.code(400).send({ error: 'Cannot start chat with yourself' });
      }

      // Check for existing chat
      let chat = await db.get(
        `SELECT id FROM chats 
         WHERE listing_id = ? AND buyer_id = ? AND seller_id = ?`,
        [listingId, buyerId, listing.seller_id]
      );

      if (!chat) {
        // Create new chat
        const result = await db.run(
          `INSERT INTO chats (listing_id, buyer_id, seller_id)
           VALUES (?, ?, ?)`,
          [listingId, buyerId, listing.seller_id]
        );
        chat = { id: result.lastID };
      }

      return { chatId: chat.id };
    }
  });

  // Get user's chats
  fastify.get('/api/chats', {
    preHandler: validateAuth,
    handler: async (request) => {
      const userId = request.user.id;
      
      const chats = await db.all(
        `SELECT 
          c.*,
          l.title as listing_title,
          l.image_url as listing_image,
          l.price as listing_price,
          b.username as buyer_username,
          s.username as seller_username,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.chat_id = c.id 
            AND m.read_at IS NULL 
            AND m.sender_id != ?
          ) as unread_count,
          (
            SELECT m.message
            FROM messages m
            WHERE m.chat_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT m.created_at
            FROM messages m
            WHERE m.chat_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_at
        FROM chats c
        JOIN listings l ON c.listing_id = l.id
        JOIN users b ON c.buyer_id = b.id
        JOIN users s ON c.seller_id = s.id
        WHERE c.buyer_id = ? OR c.seller_id = ?
        ORDER BY last_message_at DESC NULLS LAST`,
        [userId, userId, userId]
      );

      return chats;
    }
  });

  // Get chat messages
  fastify.get('/api/chats/:chatId/messages', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const { chatId } = request.params;
      const userId = request.user.id;

      // Verify chat participant
      const chat = await db.get(
        'SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
        [chatId, userId, userId]
      );

      if (!chat) {
        return reply.code(404).send({ error: 'Chat not found' });
      }

      // Mark messages as read
      await db.run(
        `UPDATE messages 
         SET read_at = CURRENT_TIMESTAMP 
         WHERE chat_id = ? AND sender_id != ? AND read_at IS NULL`,
        [chatId, userId]
      );

      // Get messages
      const messages = await db.all(
        `SELECT 
          m.*,
          u.username as sender_username
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.chat_id = ?
         ORDER BY m.created_at ASC`,
        [chatId]
      );

      return messages;
    }
  });

  // Send message
  fastify.post('/api/chats/:chatId/messages', {
    preHandler: validateAuth,
    handler: async (request, reply) => {
      const { chatId } = request.params;
      const { message } = request.body;
      const senderId = request.user.id;

      // Verify chat participant
      const chat = await db.get(
        'SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
        [chatId, senderId, senderId]
      );

      if (!chat) {
        return reply.code(404).send({ error: 'Chat not found' });
      }

      // Create message
      const result = await db.run(
        'INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)',
        [chatId, senderId, message]
      );

      const newMessage = await db.get(
        `SELECT m.*, u.username as sender_username
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [result.lastID]
      );

      return newMessage;
    }
  });
}