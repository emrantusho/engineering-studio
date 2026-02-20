import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env } from './index';
import { ReadFileSchema, CommitChangesSchema, CreatePRSchema } from './types';

export const githubApp = new Hono<Env>();

const GITHUB_API_BASE = 'https://api.github.com';

// Helper to get repo owner and name from URL
function parseRepoUrl(url: string) {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace('.git', '') };
}

async function githubFetch(token: string, path: string, options: RequestInit = {}) {
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Engineering-Studio-Worker',
        ...options.headers,
    };
    const response = await fetch(`${GITHUB_API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API Error (${response.status} on ${path}): ${errorText}`);
    }
    return response.json();
}

// --- Get repository tree ---
githubApp.get('/tree', async (c) => {
    const settings = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'github_repo_url'").first<{value: string}>();
    if (!settings) return c.json({ error: 'GitHub repo URL not configured' }, 400);

    const repoInfo = parseRepoUrl(settings.value);
    if (!repoInfo) return c.json({ error: 'Invalid GitHub repo URL format' }, 400);

    const mainBranch = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${repoInfo.owner}/${repoInfo.repo}/branches/main`);
    const treeSha = (mainBranch as any).commit.commit.tree.sha;

    const tree = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${treeSha}?recursive=1`);
    return c.json(tree);
});


// --- Read a file's content ---
githubApp.post('/read', zValidator('json', ReadFileSchema), async (c) => {
    const { path } = c.req.valid('json');
    const settings = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'github_repo_url'").first<{value: string}>();
    const repoInfo = parseRepoUrl(settings!.value);

    const fileData = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${repoInfo!.owner}/${repoInfo!.repo}/contents/${path}`);
    return c.json(fileData); // content is base64 encoded
});

// --- Commit changes and create a PR ---
githubApp.post('/commit', zValidator('json', CommitChangesSchema), async (c) => {
    const { branch, commitMessage, changes } = c.req.valid('json');
    const settings = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'github_repo_url'").first<{value: string}>();
    const repoInfo = parseRepoUrl(settings!.value);
    const { owner, repo } = repoInfo!;

    const mainRef = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/refs/heads/main`);
    const mainSha = (mainRef as any).object.sha;

    await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: mainSha,
        }),
    });

    const baseCommit = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/commits/${mainSha}`);
    const baseTreeSha = (baseCommit as any).tree.sha;

    const treeChanges = await Promise.all(changes.map(async (change) => {
        const blob = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({
                content: change.content,
                encoding: 'base64',
            }),
        });
        return {
            path: change.path,
            mode: '100644',
            type: 'blob',
            sha: (blob as any).sha,
        };
    }));

    const newTree = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeChanges,
        }),
    });
    const newTreeSha = (newTree as any).sha;

    const newCommit = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
            message: commitMessage,
            tree: newTreeSha,
            parents: [mainSha],
        }),
    });
    const newCommitSha = (newCommit as any).sha;

    await githubFetch(c.env.GITHUB_TOKEN, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({
            sha: newCommitSha,
        }),
    });

    return c.json({ success: true, commitSha: newCommitSha, branch });
});

// --- Create a Pull Request ---
githubApp.post('/pr', zValidator('json', CreatePRSchema), async (c) => {
    const { head, base, title, body } = c.req.valid('json');
    const settings = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'github_repo_url'").first<{value: string}>();
    const repoInfo = parseRepoUrl(settings!.value);
    
    const pr = await githubFetch(c.env.GITHUB_TOKEN, `/repos/${repoInfo!.owner}/${repoInfo!.repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({ title, head, base, body }),
    });

    return c.json(pr);
});

