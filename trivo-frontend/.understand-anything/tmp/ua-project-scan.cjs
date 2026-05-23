#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.argv[2];
const OUTPUT_PATH = process.argv[3];

const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'venv', '.venv', '__pycache__', 'dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo', 'target', 'obj', '.idea', '.vscode']);
const SKIP_EXTS = new Set(['.lock', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.zip', '.tar', '.gz', '.min.js', '.min.css', '.map']);
const SKIP_BASENAMES = new Set(['LICENSE', '.gitignore', '.editorconfig', '.prettierrc', '.prettierignore', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const SKIP_DIST_DIRS = new Set(['dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo', 'target', 'obj']);

const LANG_MAP = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin',
  '.php': 'php', '.vue': 'vue', '.svelte': 'svelte',
  '.sh': 'shell', '.bash': 'shell', '.ps1': 'powershell',
  '.md': 'markdown', '.rst': 'markdown', '.txt': 'markdown',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.json': 'json', '.jsonc': 'jsonc',
  '.toml': 'toml', '.xml': 'xml',
  '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'protobuf', '.tf': 'terraform', '.tfvars': 'terraform',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
  '.cfg': 'config', '.ini': 'config', '.env': 'config',
};

const CAT_MAP = {
  '.md': 'docs', '.rst': 'docs', '.txt': 'docs',
  '.yaml': 'config', '.yml': 'config', '.json': 'config', '.jsonc': 'config',
  '.toml': 'config', '.xml': 'config', '.cfg': 'config', '.ini': 'config', '.env': 'config',
  '.sql': 'data', '.graphql': 'data', '.gql': 'data', '.proto': 'data',
  '.sh': 'script', '.bash': 'script', '.ps1': 'script',
  '.html': 'markup', '.htm': 'markup', '.css': 'markup', '.scss': 'markup', '.sass': 'markup', '.less': 'markup',
};

function isExcluded(filePath) {
  const rel = path.relative(PROJECT_ROOT, filePath);
  const parts = rel.split(path.sep);
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return true;
  }
  for (const part of parts.slice(0, -1)) {
    if (SKIP_DIST_DIRS.has(part)) return true;
  }
  if (SKIP_BASENAMES.has(path.basename(filePath))) return true;
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTS.has(ext)) return true;
  return false;
}

function getLanguage(filePath) {
  const base = path.basename(filePath);
  if (base === 'Dockerfile' || base.startsWith('Dockerfile.')) return 'dockerfile';
  if (base === 'Makefile') return 'makefile';
  const ext = path.extname(filePath).toLowerCase();
  return LANG_MAP[ext] || (ext ? ext.slice(1) : 'unknown');
}

function getCategory(filePath) {
  const base = path.basename(filePath);
  if (base === 'Dockerfile' || base.startsWith('Dockerfile.')) return 'infra';
  if (base === 'docker-compose.yml' || base === 'docker-compose.yaml') return 'infra';
  if (base === 'Makefile') return 'infra';
  const ext = path.extname(filePath).toLowerCase();
  return CAT_MAP[ext] || 'code';
}

// Discover files via git ls-files
let files = [];
try {
  const output = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const rawFiles = output.trim().split('\n').filter(Boolean);
  for (const rel of rawFiles) {
    const full = path.join(PROJECT_ROOT, rel);
    try {
      if (fs.statSync(full).isFile() && !isExcluded(full)) {
        files.push(rel);
      }
    } catch {}
  }
} catch {}

// Count lines per file using wc -l with null-byte delimiter to handle special chars
const lineCounts = {};
for (const f of files) {
  try {
    const full = path.join(PROJECT_ROOT, f);
    const content = fs.readFileSync(full, 'utf8');
    lineCounts[f] = content.split('\n').length;
  } catch {
    lineCounts[f] = 0;
  }
}

const extRe = /\.[^.]+$/;
const result = [];
for (const f of files) {
  const ext = extRe.exec(f)?.[0] || '';
  result.push({
    path: f,
    language: getLanguage(f),
    sizeLines: lineCounts[f] || 0,
    fileCategory: getCategory(f),
  });
}

// Detect frameworks
const frameworks = new Set();
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps['react']) frameworks.add('React');
  if (deps['@tanstack/react-query']) frameworks.add('TanStack Query');
  if (deps['@tanstack/react-router']) frameworks.add('TanStack Router');
  if (deps['@tanstack/react-start']) frameworks.add('TanStack Start');
  if (deps['vite']) frameworks.add('Vite');
  if (deps['@vitejs/plugin-react']) frameworks.add('Vite');
  if (deps['tailwindcss'] || deps['@tailwindcss/vite']) frameworks.add('Tailwind CSS');
  if (deps['axios']) frameworks.add('Axios');
  if (deps['zod']) frameworks.add('Zod');
  if (deps['react-hook-form']) frameworks.add('React Hook Form');
  if (deps['@radix-ui/react-dialog']) frameworks.add('Radix UI');
  if (deps['lucide-react']) frameworks.add('Lucide');
  if (deps['date-fns']) frameworks.add('date-fns');
  if (deps['@cloudflare/vite-plugin']) frameworks.add('Cloudflare Pages');
  if (deps['wrangler']) frameworks.add('Wrangler');
  if (deps['clsx']) frameworks.add('clsx');
  if (deps['class-variance-authority']) frameworks.add('CVA');
} catch {}
if (fs.existsSync(path.join(PROJECT_ROOT, 'Dockerfile'))) frameworks.add('Docker');

const languages = [...new Set(result.map(r => r.language))].filter(Boolean).sort();
const complexity = result.length <= 30 ? 'small' : result.length <= 150 ? 'moderate' : 'large';

// Build import map for code files
const importMap = {};
const fileSet = new Set(files);

function resolveRelative(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, importPath);
  const ext = path.extname(resolved);
  const probeExts = ext ? [''] : ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.tsx', '/index.jsx', '.json'];
  for (const pext of probeExts) {
    const probe = resolved + pext;
    const rel = path.relative(PROJECT_ROOT, probe).replace(/\\/g, '/');
    if (fileSet.has(rel)) return rel;
  }
  return null;
}

for (const f of result) {
  if (f.fileCategory !== 'code') {
    importMap[f.path] = [];
    continue;
  }
  let content;
  try {
    content = fs.readFileSync(path.join(PROJECT_ROOT, f.path), 'utf8');
  } catch {
    importMap[f.path] = [];
    continue;
  }
  const imports = new Set();
  // Match import statements and require calls
  const re = /\b(?:import\s+(?:(?:[\w{}\s,*]+ from )?['"]([^'"]+)['"]|[\w]+)\s*;?|\brequire\s*\(['"]([^'"]+)['"]\))/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const imp = m[1] || m[2];
    if (!imp || imp.startsWith('http') || imp.startsWith('#')) continue;
    if (imp.startsWith('.')) {
      const resolved = resolveRelative(imp, f.path);
      if (resolved && resolved !== f.path) imports.add(resolved);
    }
  }
  importMap[f.path] = [...imports].sort();
}

// README head
let readmeHead = '';
try {
  readmeHead = fs.readFileSync(path.join(PROJECT_ROOT, 'README.md'), 'utf8').split('\n').slice(0, 10).join('\n');
} catch {}

const pkg = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')); }
  catch { return { name: path.basename(PROJECT_ROOT), description: '' }; }
})();

const output = {
  scriptCompleted: true,
  name: pkg.name || path.basename(PROJECT_ROOT),
  rawDescription: pkg.description || '',
  readmeHead,
  languages,
  frameworks: [...frameworks].sort(),
  files: result,
  totalFiles: result.length,
  filteredByIgnore: 0,
  estimatedComplexity: complexity,
  importMap,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.error('Scan complete: ' + result.length + ' files');
