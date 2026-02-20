import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Env } from './index';
import { SettingsUpdateSchema } from './types';
import { encrypt } from './crypto';

export const adminApp = new Hono<Env>();

// --- Settings Management (Non-sensitive) ---
adminApp.get('/settings', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT key, value FROM app_settings').all();
    const settings = (results as {key: string, value: string}[]).reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);
    return c.json(settings);
});

adminApp.put('/settings', zValidator('json', SettingsUpdateSchema), async (c) => {
    const { key, value } = c.req.valid('json');
    await c.env.DB.prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    ).bind(key, value).run();
    return c.json({ success: true, key, value });
});


// --- Secure Key Management ---
const KeyUpdateSchema = z.object({
    provider_id: z.string(),
    api_key: z.string(), // The plaintext key from the user
});

adminApp.get('/keys', async (c) => {
    // SECURITY: We only return the list of providers that have keys, not the keys themselves.
    const { results } = await c.env.DB.prepare('SELECT provider_id FROM secure_keys').all<{provider_id: string}>();
    // THE FIX IS HERE: Add an explicit type for 'r'
    return c.json(results.map((r: { provider_id: string }) => r.provider_id));
});

adminApp.put('/keys', zValidator('json', KeyUpdateSchema), async (c) => {
    const { provider_id, api_key } = c.req.valid('json');

    if (!c.env.SESSION_SECRET) {
        return c.json({ error: 'Server is missing SESSION_SECRET for encryption.' }, 500);
    }
    // If the user submits an empty key, delete it. Otherwise, encrypt and save.
    if (api_key === '') {
        await c.env.DB.prepare('DELETE FROM secure_keys WHERE provider_id = ?').bind(provider_id).run();
        return c.json({ success: true, message: `Key for ${provider_id} deleted.` });
    } else {
        const { encrypted_key_hex, iv_hex } = await encrypt(c.env.SESSION_SECRET, api_key);
        await c.env.DB.prepare(
            `INSERT INTO secure_keys (provider_id, encrypted_key_hex, iv_hex) VALUES (?, ?, ?)
             ON CONFLICT(provider_id) DO UPDATE SET encrypted_key_hex=excluded.encrypted_key_hex, iv_hex=excluded.iv_hex, updated_at=CURRENT_TIMESTAMP`
        ).bind(provider_id, encrypted_key_hex, iv_hex).run();
        return c.json({ success: true, message: `Key for ${provider_id} saved securely.` });
    }
});
