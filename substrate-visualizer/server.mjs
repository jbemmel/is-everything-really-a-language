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
import { readdir, readFile, writeFile, unlink, mkdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

// Data directories
const SCENES_DIR = join(__dirname, 'scenes');
const ADVENTURES_DIR = join(__dirname, 'adventures');
const PUBLISHED_DIR = join(__dirname, 'published-adventures');
const VIDEOS_DIR = join(__dirname, 'videos');

// Ensure directories exist
await mkdir(SCENES_DIR, { recursive: true });
await mkdir(ADVENTURES_DIR, { recursive: true });
await mkdir(PUBLISHED_DIR, { recursive: true });
await mkdir(VIDEOS_DIR, { recursive: true });

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
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLISH API - Save published HTML to server for video recording
  // ─────────────────────────────────────────────────────────────────────────────

  // Save published HTML to server
  'POST /api/publish/:adventureId': async (params, body) => {
    const adventureId = params.adventureId;
    const html = body?.html;

    if (!html) {
      throw new Error('Missing HTML content in request body');
    }

    // Create dated filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}-${adventureId}.html`;
    const filePath = join(PUBLISHED_DIR, filename);

    await writeFile(filePath, html);
    console.log(`Published: ${filename}`);

    return { success: true, filename, path: filePath };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ADVENTURE DURATION CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

// Calculate the duration of a single timeline step
function calculateStepDuration(step) {
  // Handle parallel actions - take the max duration
  if (step.par && Array.isArray(step.par)) {
    const durations = step.par.map(s => calculateStepDuration(s));
    return Math.max(...durations, 0);
  }

  const action = step.do;
  const args = step.args || {};

  switch (action) {
    case 'wait':
      return args.duration ?? 1;

    case 'fadeIn':
    case 'fadeOut':
      return args.duration ?? 0.4;

    case 'moveTo':
      return args.duration ?? 0.8;

    case 'pose':
      return args.duration ?? 0.3;

    case 'setHead':
    case 'clearCode':
    case 'clearBoard':
    case 'setTitle':
    case 'resetSvgAnimation':
    case 'setSvgState':
      return 0; // Instant actions

    case 'bubbleSay': {
      const text = args.text ?? '';
      const hold = args.hold ?? Math.max(1.5, Math.min(4, text.length / 15));
      return 0.15 + hold + 0.15; // fade in + hold + fade out
    }

    case 'chatSay':
      return args.pause ?? 0.3;

    case 'typeCode': {
      const text = args.text ?? '';
      const speedCps = args.speedCps ?? 18;
      const cursorHold = args.cursorHold ?? 0.5;
      return (text.length / speedCps) + cursorHold;
    }

    case 'writeBoard': {
      const text = args.text ?? '';
      const speedCps = args.speedCps ?? 12;
      const hold = args.hold ?? 0.3;
      return (text.length / speedCps) + hold;
    }

    case 'eraseLines': {
      // Estimate: assume ~20 chars per line erased at 20 cps
      const lines = args.lines ?? 1;
      const speedCps = args.speedCps ?? 20;
      const charsPerLine = 20;
      const hold = args.hold ?? 0.2;
      return (lines * charsPerLine / speedCps) + (lines * 0.1) + hold;
    }

    case 'crossOut': {
      const duration = args.duration ?? 1;
      const hold = args.hold ?? 0.3;
      return duration + hold;
    }

    case 'submitFile':
    case 'downloadFile':
      return 0.1;

    case 'showSvgElement':
    case 'hideSvgElement':
      return args.duration ?? 0.3;

    case 'stepSvgAnimation':
      // These can vary; use a reasonable default
      return args.duration ?? 0.5;

    case 'playSvgAnimation':
      // This runs multiple steps; estimate based on typical animations
      return args.estimatedDuration ?? 3;

    default:
      // Unknown action - assume a small duration
      return args.duration ?? 0.3;
  }
}

// Calculate total duration of a scene timeline
function calculateTimelineDuration(timeline) {
  if (!timeline || !Array.isArray(timeline)) return 0;
  return timeline.reduce((total, step) => total + calculateStepDuration(step), 0);
}

// Load a scene from disk (checking adventure-local then global scenes)
async function loadScene(adventureId, sceneRef) {
  // Try adventure-local scene first
  const localPath = join(ADVENTURES_DIR, adventureId, 'scenes', sceneRef, 'scene.json');
  if (existsSync(localPath)) {
    const data = await readFile(localPath, 'utf-8');
    return JSON.parse(data);
  }

  // Try global scenes
  const globalPath = join(SCENES_DIR, sceneRef, 'scene.json');
  if (existsSync(globalPath)) {
    const data = await readFile(globalPath, 'utf-8');
    return JSON.parse(data);
  }

  console.warn(`Scene not found: ${sceneRef}`);
  return null;
}

// Calculate total duration of an adventure
async function calculateAdventureDuration(adventureId) {
  const adventurePath = join(ADVENTURES_DIR, adventureId, 'adventure.json');
  const adventureData = await readFile(adventurePath, 'utf-8');
  const adventure = JSON.parse(adventureData);

  let totalDuration = 0;

  for (const item of adventure.scenes || []) {
    if (item.type === 'scene' && item.sceneRef) {
      const scene = await loadScene(adventureId, item.sceneRef);
      if (scene && scene.timeline) {
        totalDuration += calculateTimelineDuration(scene.timeline);
      }
    } else if (item.type === 'end') {
      // End screen typically displays for a few seconds
      totalDuration += 3;
    }
  }

  // Add a buffer for loading time and transitions
  const buffer = 2;
  return Math.ceil(totalDuration + buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO RECORDING - Uses Puppeteer to record published adventure as MP4/WebM
// ─────────────────────────────────────────────────────────────────────────────

async function recordAdventureVideo(adventureId, duration = null) {
  // Check for ffmpeg first - Puppeteer's screencast requires it
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    throw new Error('ffmpeg is required for video recording. Please install it:\n  macOS: brew install ffmpeg\n  Ubuntu: sudo apt install ffmpeg\n  Windows: choco install ffmpeg');
  }

  // Calculate duration automatically if not provided
  if (duration === null) {
    try {
      duration = await calculateAdventureDuration(adventureId);
      console.log(`Calculated adventure duration: ${duration} seconds`);
    } catch (err) {
      console.warn(`Could not calculate duration (${err.message}), using default of 30 seconds`);
      duration = 30;
    }
  }

  // Dynamic import of puppeteer
  const puppeteer = await import('puppeteer');

  // Find the most recent published HTML for this adventure
  const files = await readdir(PUBLISHED_DIR);
  const matchingFiles = files
    .filter(f => f.endsWith('.html') && f.includes(adventureId))
    .sort()
    .reverse();

  if (matchingFiles.length === 0) {
    throw new Error(`No published HTML found for adventure: ${adventureId}. Please publish first.`);
  }

  const htmlFile = matchingFiles[0];
  const htmlPath = join(PUBLISHED_DIR, htmlFile);
  const timestamp = Date.now();
  const webmPath = join(VIDEOS_DIR, `${adventureId}-${timestamp}.webm`);
  const mp4Path = join(VIDEOS_DIR, `${adventureId}-${timestamp}.mp4`);

  console.log(`Recording ${htmlFile} for ${duration} seconds...`);

  // Launch browser
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 540 });

    // Navigate to the published HTML first
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Start recording using screencast (always outputs WebM)
    const recorder = await page.screencast({
      path: webmPath,
      format: 'webm',
    });

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));

    // Stop recording
    await recorder.stop();
    console.log(`WebM recorded: ${webmPath}`);

    // Close browser before conversion
    await browser.close();

    // Check if WebM file has content
    const webmStats = await stat(webmPath);
    if (webmStats.size === 0) {
      await unlink(webmPath);
      throw new Error(`Recording produced empty file. This may happen if the page has no visual content or failed to render. Try opening the HTML file in a browser to verify it displays correctly.`);
    }

    // Convert WebM to MP4 (H.264) for QuickTime compatibility
    console.log('Converting to MP4...');
    await convertToMp4(webmPath, mp4Path);

    // Clean up WebM
    await unlink(webmPath);
    console.log(`MP4 saved: ${mp4Path}`);

    return { path: mp4Path, format: 'mp4' };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// Check if ffmpeg is available
function checkFfmpeg() {
  return new Promise(resolve => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', code => resolve(code === 0));
  });
}

// Convert WebM to MP4 using ffmpeg (H.264 for QuickTime compatibility)
function convertToMp4(webmPath, mp4Path) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i', webmPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',  // Required for QuickTime compatibility
      '-y',
      mp4Path
    ]);
    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Special handler for video recording (returns file, not JSON)
  const videoMatch = pathname.match(/^\/api\/record-video\/(.+)$/);
  if (videoMatch && method === 'POST') {
    const adventureId = decodeURIComponent(videoMatch[1]);
    try {
      const body = await readBody(req);
      // Use provided duration or null to auto-calculate from adventure
      const duration = body?.duration ?? null;

      console.log(`Starting video recording for adventure: ${adventureId}`);
      const result = await recordAdventureVideo(adventureId, duration);

      // Read and send the video file
      const videoData = await readFile(result.path);
      const contentType = result.format === 'mp4' ? 'video/mp4' : 'video/webm';
      const filename = basename(result.path);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': videoData.length
      });
      res.end(videoData);

      // Clean up video file after sending
      await unlink(result.path).catch(() => {});
    } catch (err) {
      console.error('Video recording error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
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
