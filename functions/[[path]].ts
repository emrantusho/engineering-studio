// This file is a convention for Cloudflare Pages Functions to catch all routes.
// We will simply import and export the main Hono app handler from our API router.
import { onRequest } from './api/[[catchall]]/index';
export { onRequest };
