#!/usr/bin/env node
/**
 * Scene Editor Dev Server
 * Super lightweight Node.js backend for saving scenes/scripts to disk.
 *
 * Usage:
 *   npm run dev
 *   # Opens http://localhost:3000/index-dev.html
 */

import { createServer } from 'http';
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

// Data directories
const SCENES_DIR = join(__dirname, 'scenes');
const ADVENTURES_DIR = join(__dirname, 'adventures');

// Ensure directories exist
await mkdir(SCENES_DIR, { recursive: true });
await mkdir(ADVENTURES_DIR, { recursive: true });

// MIME types for static files
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Helper: List folders that contain a specific JSON file
async function listFoldersWithJson(dir, jsonFileName) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const jsonPath = join(dir, entry.name, jsonFileName);
      if (existsSync(jsonPath)) {
        try {
          const data = await readFile(jsonPath, 'utf-8');
          const json = JSON.parse(data);
          results.push({
            id: entry.name,
            title: json.title || entry.name,
            description: json.description || '',
            folder: entry.name
          });
        } catch {
          results.push({ id: entry.name, folder: entry.name });
        }
      }
    }
  }
  return results;
}

// Simple router
const routes = {
  // ─────────────────────────────────────────────────────────────────────────────
  // SCENES API - folder structure: scenes/{scene-id}/scene.json
  // ─────────────────────────────────────────────────────────────────────────────

  // List all scenes
  'GET /api/scenes': async () => {
    return listFoldersWithJson(SCENES_DIR, 'scene.json');
  },

  // Get single scene
  'GET /api/scenes/:id': async (params) => {
    const filePath = join(SCENES_DIR, params.id, 'scene.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  },

  // Save scene
  'PUT /api/scenes/:id': async (params, body) => {
    const folderPath = join(SCENES_DIR, params.id);
    await mkdir(folderPath, { recursive: true });
    const filePath = join(folderPath, 'scene.json');
    await writeFile(filePath, JSON.stringify(body, null, 2));
    return { success: true, id: params.id };
  },

  // Delete scene
  'DELETE /api/scenes/:id': async (params) => {
    const filePath = join(SCENES_DIR, params.id, 'scene.json');
    await unlink(filePath);
    return { success: true };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVENTURES API - folder structure: adventures/{adventure-id}/adventure.json
  // ─────────────────────────────────────────────────────────────────────────────

  // List all adventures
  'GET /api/adventures': async () => {
    return listFoldersWithJson(ADVENTURES_DIR, 'adventure.json');
  },

  // Get single adventure
  'GET /api/adventures/:id': async (params) => {
    const filePath = join(ADVENTURES_DIR, params.id, 'adventure.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  },

  // Save adventure
  'PUT /api/adventures/:id': async (params, body) => {
    const folderPath = join(ADVENTURES_DIR, params.id);
    await mkdir(folderPath, { recursive: true });
    const filePath = join(folderPath, 'adventure.json');
    await writeFile(filePath, JSON.stringify(body, null, 2));
    return { success: true, id: params.id };
  },

  // Delete adventure
  'DELETE /api/adventures/:id': async (params) => {
    const filePath = join(ADVENTURES_DIR, params.id, 'adventure.json');
    await unlink(filePath);
    return { success: true };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVENTURE SCENES API - scenes embedded within an adventure
  // Structure: adventures/{adventure-id}/scenes/{scene-id}/scene.json
  // ─────────────────────────────────────────────────────────────────────────────

  // List scenes within an adventure
  'GET /api/adventures/:adventureId/scenes': async (params) => {
    const scenesDir = join(ADVENTURES_DIR, params.adventureId, 'scenes');
    return listFoldersWithJson(scenesDir, 'scene.json');
  },

  // Get single scene within an adventure
  'GET /api/adventures/:adventureId/scenes/:sceneId': async (params) => {
    const filePath = join(ADVENTURES_DIR, params.adventureId, 'scenes', params.sceneId, 'scene.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  },

  // Save scene within an adventure
  'PUT /api/adventures/:adventureId/scenes/:sceneId': async (params, body) => {
    const folderPath = join(ADVENTURES_DIR, params.adventureId, 'scenes', params.sceneId);
    await mkdir(folderPath, { recursive: true });
    const filePath = join(folderPath, 'scene.json');
    await writeFile(filePath, JSON.stringify(body, null, 2));
    return { success: true, adventureId: params.adventureId, sceneId: params.sceneId };
  },

  // Delete scene within an adventure
  'DELETE /api/adventures/:adventureId/scenes/:sceneId': async (params) => {
    const filePath = join(ADVENTURES_DIR, params.adventureId, 'scenes', params.sceneId, 'scene.json');
    await unlink(filePath);
    return { success: true };
  },
};

// Match route pattern like "GET /api/scenes/:id"
function matchRoute(method, pathname) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    if (method !== routeMethod) continue;

    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');
    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler, params };
  }
  return null;
}

// Read request body as JSON
async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Serve static files
async function serveStatic(pathname, res) {
  // Default to index-dev.html
  if (pathname === '/') pathname = '/index-dev.html';

  const filePath = join(__dirname, pathname);
  const ext = extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// Create server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS headers for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Try API routes
  if (pathname.startsWith('/api/')) {
    const route = matchRoute(method, pathname);
    if (route) {
      try {
        const body = await readBody(req);
        const result = await route.handler(route.params, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        const status = err.code === 'ENOENT' ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // Static files
  await serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`\n  Scene Editor running at http://localhost:${PORT}\n`);
  console.log(`  Editor:     http://localhost:${PORT}/index-dev.html`);
  console.log(`  Scenes:     ${SCENES_DIR}/{id}/scene.json`);
  console.log(`  Adventures: ${ADVENTURES_DIR}/{id}/adventure.json\n`);
});
