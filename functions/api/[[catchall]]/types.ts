import { z } from 'zod';

// --- Auth Schemas ---
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  turnstileToken: z.string().min(1, 'Turnstile token is required'),
});

// --- Admin Schemas ---
export const SettingsUpdateSchema = z.object({
  key: z.string(),
  value: z.string(),
});

// --- Chat Schemas ---
export const CreateChatSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Initial message is required'),
});

export const PostMessageSchema = z.object({
    chatId: z.string(),
    content: z.string().min(1, 'Message content is required'),
});

export const CrossChatReferenceSchema = z.object({
    query: z.string().optional(),
});


// --- RAG Schemas ---
export const InitiateUploadSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
});

export const CompleteUploadSchema = z.object({
  fileName: z.string(),
  uploadId: z.string(),
  parts: z.array(z.object({
    partNumber: z.number(),
    etag: z.string(),
  })),
});

export const IngestDocumentSchema = z.object({
    r2Key: z.string(),
});

// --- GitHub Schemas ---
export const ReadFileSchema = z.object({
    path: z.string(),
});

export const CommitChangesSchema = z.object({
    branch: z.string(),
    commitMessage: z.string(),
    changes: z.array(z.object({
        path: z.string(),
        content: z.string(), // base64 encoded content
    }))
});

export const CreatePRSchema = z.object({
    head: z.string(),
    base: z.string(),
    title: z.string(),
    body: z.string(),
});

// --- Database Types (for reference) ---
export interface User {
    id: number;
    username: string;
    created_at: string;
}

export interface Chat {
    id: string;
    user_id: number;
    title: string;
    context_summary: string | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}
