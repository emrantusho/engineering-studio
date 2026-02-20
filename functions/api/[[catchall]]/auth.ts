import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { Env } from './index';
import { LoginSchema, User } from './types';

export const authApp = new Hono<Env>();

// --- Turnstile Verification ---
async function verifyTurnstile(token: string, secretKey: string, ip: string): Promise<boolean> {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: secretKey,
            response: token,
            remoteip: ip,
        }),
    });
    const data: { success: boolean } = await response.json();
    return data.success;
}

// --- Login Route ---
authApp.post('/login', zValidator('json', LoginSchema), async (c) => {
    const { username, password, turnstileToken } = c.req.valid('json');
    const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';

    const turnstileSuccess = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
    if (!turnstileSuccess) {
        return c.json({ error: 'Invalid Turnstile token' }, 400);
    }

    // IMPORTANT: This is a placeholder for demonstration.
    // In a real application, you MUST hash and salt passwords.
    // Use a library like `bcryptjs` or the Web Crypto API.
    const user = await c.env.DB.prepare(
        'SELECT id, username FROM users WHERE username = ? AND password_hash = ?'
    ).bind(username, password).first<User>();

    if (!user) {
        return c.json({ error: 'Invalid username or password' }, 401);
    }

    const sessionId = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7-day session

    await c.env.DB.prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, expires.toISOString()).run();

    setCookie(c, 'auth_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        expires: expires,
    });

    return c.json({ id: user.id, username: user.username });
});

// --- Logout Route ---
authApp.post('/logout', async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    if (sessionId) {
        await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    }
    deleteCookie(c, 'auth_session', { path: '/' });
    return c.json({ message: 'Logged out successfully' });
});

// --- Session Check Route ---
authApp.get('/session', async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    if (!sessionId) {
        return c.json({ user: null });
    }
    const { results } = await c.env.DB.prepare(
        `SELECT s.user_id, u.username FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > ?`
    ).bind(sessionId, new Date().toISOString()).all();

    if (results.length === 0) {
        deleteCookie(c, 'auth_session');
        return c.json({ user: null });
    }
    const session = results[0] as { user_id: number; username: string };
    return c.json({ user: { id: session.user_id, username: session.username } });
});
