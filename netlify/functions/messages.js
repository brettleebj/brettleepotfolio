const { Datastore } = require('@netlify/dynamodb-store');

/**
 * Netlify environment:
 * - Uses Netlify Datastore (dynamo-store).
 * - Persists messages beyond ephemeral server filesystem.
 */
const datastore = new Datastore('messages', {
  // Uses Netlify Datastore environment variables automatically.
  // If running locally, ensure NETLIFY_DATSTORE_* env vars are set.
});

function json(statusCode, payload) {
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  };
}

function parseId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

exports.handler = async (event, context) => {
  try {
    const { httpMethod } = event;
    const path = event.path || '';

    if (httpMethod === 'GET' && path === '/api/messages') {
      const items = await datastore.getAll();
      // newest first (date descending) similar to server.js unshift
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return json(200, items);
    }

    if (httpMethod === 'POST' && path === '/api/messages') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { name, email, message } = body || {};

      if (!name || !email || !message) {
        return json(400, { error: 'Name, email, and message are required' });
      }

      const newMessage = {
        id: Date.now(),
        name: String(name).trim(),
        email: String(email).trim(),
        message: String(message).trim(),
        date: new Date().toISOString(),
        read: false,
      };

      await datastore.set(String(newMessage.id), newMessage);

      console.log(`New message received from ${newMessage.name} (${newMessage.email})`);
      return json(200, {
        success: true,
        message: 'Message sent successfully!',
      });
    }

    // PUT /api/messages/:id/read
    const readMatch = path.match(/^\/api\/messages\/(\d+)\/read$/);
    if (httpMethod === 'PUT' && readMatch) {
      const messageId = parseId(readMatch[1]);
      const existing = await datastore.get(String(messageId));
      if (!existing) return json(404, { error: 'Message not found' });

      existing.read = true;
      await datastore.set(String(messageId), existing);
      return json(200, { success: true });
    }

    // DELETE /api/messages/:id
    const deleteMatch = path.match(/^\/api\/messages\/(\d+)$/);
    if (httpMethod === 'DELETE' && deleteMatch) {
      const messageId = parseId(deleteMatch[1]);
      const existing = await datastore.get(String(messageId));
      if (!existing) return json(404, { error: 'Message not found' });

      await datastore.del(String(messageId));
      return json(200, { success: true });
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    console.error('Messages API error:', error);
    return json(500, { error: 'Failed to process request' });
  }
};
