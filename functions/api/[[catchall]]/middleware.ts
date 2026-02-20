import { createMiddleware } from 'hono/factory';
import { getCookie, deleteCookie } from 'hono/cookie';
import { Env } from './index';

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
    const sessionId = getCookie(c, 'auth_session');
    if (!sessionId) {
        return c.json({ error: 'Unauthorized: No session cookie' }, 401);
    }

    const { results } = await c.env.DB.prepare(
        `SELECT s.user_id, u.username, s.expires_at FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ?`
    ).bind(sessionId).all();

    if (results.length === 0) {
        deleteCookie(c, 'auth_session');
        return c.json({ error: 'Unauthorized: Invalid session' }, 401);
    }

    const session = results[0] as { user_id: number; username: string; expires_at: string; };
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < new Date()) {
        await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
        deleteCookie(c, 'auth_session');
        return c.json({ error: 'Unauthorized: Session expired' }, 401);
    }

    c.set('user', { id: session.user_id, username: session.username });
    await next();
});
