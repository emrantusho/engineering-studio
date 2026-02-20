import { Hono } from 'hono';
import { stream } from 'hono/streaming'
import { zValidator } from '@hono/zod-validator';
import { Env } from './index';
import { CreateChatSchema, PostMessageSchema, CrossChatReferenceSchema, Message, Chat } from './types';

export const chatApp = new Hono<Env>();

// --- Get all chats for a user ---
chatApp.get('/', async (c) => {
    const user = c.get('user');
    const { results } = await c.env.DB.prepare(
        'SELECT id, title, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(user.id).all();
    return c.json(results);
});

// --- Create a new chat ---
chatApp.post('/', zValidator('json', CreateChatSchema), async (c) => {
    const user = c.get('user');
    const { title, message } = c.req.valid('json');
    
    const chatId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)')
            .bind(chatId, user.id, title),
        c.env.DB.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)')
            .bind(messageId, chatId, 'user', message)
    ]);
    
    const newChat = await c.env.DB.prepare('SELECT * FROM chats WHERE id = ?').bind(chatId).first();

    return c.json(newChat, 201);
});

// --- Get messages for a specific chat ---
chatApp.get('/:chatId/messages', async (c) => {
    const user = c.get('user');
    const chatId = c.req.param('chatId');

    // Verify user has access to this chat
    const chat = await c.env.DB.prepare('SELECT id FROM chats WHERE id = ? AND user_id = ?')
        .bind(chatId, user.id).first();

    if (!chat) {
        return c.json({ error: 'Chat not found or access denied' }, 404);
    }
    
    const { results } = await c.env.DB.prepare(
        'SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
    ).bind(chatId).all();

    return c.json(results);
});

// --- Post a new message and get a streamed response ---
chatApp.post('/:chatId/messages', zValidator('json', PostMessageSchema), async (c) => {
    const user = c.get('user');
    const chatId = c.req.param('chatId');
    const { content } = c.req.valid('json');

    const chat = await c.env.DB.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?')
        .bind(chatId, user.id).first<Chat>();
    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    const userMessageId = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)')
        .bind(userMessageId, chatId, 'user', content).run();

    const { results: recentMessages } = await c.env.DB.prepare(
        'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(chatId).all<Pick<Message, 'role' | 'content'>>();
    
    const messagesForLLM = recentMessages.reverse();

    let systemPrompt = "You are an expert full-stack engineer and Cloudflare architect.";
    if (chat.context_summary) {
        systemPrompt += `\n\n--- Project State & History Summary ---\n${chat.context_summary}\n--- End Summary ---`;
    }

    const aiResponseStream = await c.env.AI.run(
      '@cf/meta/llama-3-8b-instruct',
      {
        messages: [
            { role: 'system', content: systemPrompt },
            ...messagesForLLM,
            { role: 'user', content: content }
        ],
        stream: true,
      }
    );

    let fullResponse = "";
    return stream(c, async (stream) => {
        for await (const chunk of aiResponseStream) {
            const decodedChunk = new TextDecoder().decode(chunk);
            // Assuming the chunk is a JSON string like `data: {"response": "..."}\n\n`
            try {
                const lines = decodedChunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr.trim() === '[DONE]') {
                            continue;
                        }
                        const parsed = JSON.parse(jsonStr);
                        const token = parsed.response;
                        if (token) {
                            fullResponse += token;
                            await stream.write(token);
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing errors for incomplete chunks
            }
        }

        // After stream is complete, save assistant message
        const assistantMessageId = crypto.randomUUID();
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)')
                .bind(assistantMessageId, chatId, 'assistant', fullResponse),
            c.env.DB.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .bind(chatId)
        ]);
    });
});

// --- Search other chats for cross-referencing ---
chatApp.get('/search', zValidator('query', CrossChatReferenceSchema), async (c) => {
    const user = c.get('user');
    const { query } = c.req.valid('query');

    if (!query) {
        return c.json([]);
    }

    const { results } = await c.env.DB.prepare(
        `SELECT id, title FROM chats WHERE user_id = ? AND title LIKE ? LIMIT 10`
    ).bind(user.id, `%${query}%`).all();
    
    return c.json(results);
});
