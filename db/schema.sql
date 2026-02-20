-- Engineering Studio Database Schema v1.1 (Secure Key Management)

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS secure_keys;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- General application settings (NON-SENSITIVE)
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing ENCRYPTED API keys
CREATE TABLE secure_keys (
    provider_id TEXT PRIMARY KEY, -- e.g., 'openai', 'anthropic', 'github'
    encrypted_key_hex TEXT NOT NULL,
    iv_hex TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    context_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK(status IN ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash) VALUES ('admin', 'admin');

-- Default settings
INSERT INTO app_settings (key, value) VALUES ('auto_dev_mode', 'false');
INSERT INTO app_settings (key, value) VALUES ('active_llm_provider', 'cloudflare'); -- Default to internal Cloudflare model
INSERT INTO app_settings (key, value) VALUES ('github_repo_url', 'https://github.com/user/repo');
INSERT INTO app_settings (key, value) VALUES ('r2_bucket_name', 'engineering-studio-r2');
INSERT INTO app_settings (key, value) VALUES ('google_drive_folder_id', '');
