import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authApp } from './auth';
import { adminApp } from './admin';
import { chatApp } from './chat';
import { ragApp } from './rag';
import { githubApp } from './github';
import { authMiddleware } from './middleware';
import { HTTPException } from 'hono/http-exception'
import type { D1Database, R2Bucket, VectorizeIndex, Ai } from '@cloudflare/workers-types'; // <-- CORRECTED 'Ai'

export type Env = {
    Bindings: {
        DB: D1Database;
        R2_BUCKET: R2Bucket;
        VECTORIZE_INDEX: VectorizeIndex;
        AI: Ai; // <-- CORRECTED 'Ai'
        SESSION_SECRET: string;
        TURNSTILE_SECRET_KEY: string;
        GITHUB_TOKEN: string;
        // The following are now managed in the DB, but we keep them for potential future use or context
        ANTHROPIC_API_KEY: string;
        OPENAI_API_KEY: string;
        DEEPSEEK_API_KEY: string;
        GEMINI_API_KEY: string;
    };
    Variables: {
        user: { id: number; username: string };
    }
};

const app = new Hono<Env>();

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());

// Public routes
app.route('/api/auth', authApp);

// Authenticated routes
app.use('/api/admin/*', authMiddleware);
app.use('/api/chat/*', authMiddleware);
app.use('/api/rag/*', authMiddleware);
app.use('/api/github/*', authMiddleware);

// API v1 grouping
const api = new Hono<Env>();
api.route('/admin', adminApp);
api.route('/chat', chatApp);
api.route('/rag', ragApp);
api.route('/github', githubApp);

app.route('/api', api);

// Custom error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
});


// Note: Next-on-pages handles serving the static assets.
// We only need to define the API routes here.

export const onRequest = app.fetch;
