const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = '/Users/xfajarr/Hackathon/trivo/trivo-frontend';

const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'venv', '.venv', '__pycache__', 'dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo', 'target', 'obj', '.idea', '.vscode']);
const SKIP_EXTS = new Set(['.lock', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.zip', '.tar', '.gz', '.min.js', '.min.css', '.map']);
const SKIP_BASENAMES = new Set(['LICENSE', '.gitignore', '.editorconfig', '.prettierrc', '.prettierignore', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const SKIP_DIST_DIRS = new Set(['dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo', 'target', 'obj']);

const LANG_MAP = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
  '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
  '.json': 'json', '.jsonc': 'jsonc', '.toml': 'toml',
  '.yaml': 'yaml', '.yml': 'yaml',
};

const CAT_MAP = {
  '.json': 'config', '.jsonc': 'config', '.toml': 'config',
  '.yaml': 'config', '.yml': 'config',
  '.css': 'markup', '.scss': 'markup', '.sass': 'markup', '.less': 'markup',
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

// Discover files using find
const srcFiles = execSync('find src -type f', { cwd: PROJECT_ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const rootFiles = execSync('find . -maxdepth 1 -type f', { cwd: PROJECT_ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).map(f => f.replace(/^\.\//, ''));

const allFiles = [];
for (const f of [...srcFiles, ...rootFiles]) {
  const full = path.join(PROJECT_ROOT, f);
  if (!isExcluded(full)) allFiles.push(f);
}
allFiles.sort();

// Count lines
const lineCounts = {};
for (const f of allFiles) {
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, f), 'utf8');
    lineCounts[f] = content.split('\n').length;
  } catch {
    lineCounts[f] = 0;
  }
}

const extRe = /\.[^.]+$/;
const files = allFiles.map(f => ({
  path: f,
  language: getLanguage(f),
  sizeLines: lineCounts[f] || 0,
  fileCategory: getCategory(f),
}));

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

const languages = [...new Set(files.map(r => r.language))].filter(Boolean).sort();

// Build import map
const fileSet = new Set(files.map(f => f.path));

// tsconfig paths for @ alias resolution
let tsconfigPaths = {};
let tsconfigBaseUrl = '.';
try {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8');
  // Strip comments for JSONC
  const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const tsconfig = JSON.parse(cleaned);
  if (tsconfig.compilerOptions?.paths) {
    tsconfigPaths = tsconfig.compilerOptions.paths;
    tsconfigBaseUrl = tsconfig.compilerOptions.baseUrl || '.';
  }
} catch {}

function resolveAlias(importPath) {
  for (const [alias, targets] of Object.entries(tsconfigPaths)) {
    const aliasPattern = alias.replace(/\/\*$/, '');
    if (importPath === aliasPattern || importPath.startsWith(aliasPattern + '/')) {
      const suffix = importPath.slice(aliasPattern.length);
      for (const target of targets) {
        const resolved = path.resolve(PROJECT_ROOT, tsconfigBaseUrl, target.replace(/\/\*$/, '') + suffix);
        const probeExts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.tsx', '/index.jsx'];
        for (const pext of probeExts) {
          const probe = resolved + pext;
          const rel = path.relative(PROJECT_ROOT, probe).replace(/\\/g, '/');
          if (fileSet.has(rel)) return rel;
        }
      }
    }
  }
  return null;
}

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

const importMap = {};
let totalImports = 0;
let totalResolved = 0;

for (const f of files) {
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
  // TypeScript import pattern
  const re = /\bimport\s+(?:(?:{[\w\s,]*}\s+from\s+|[\w]+\s+from\s+|type\s+)?['"]([^'"]+)['"])\s*;?/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const imp = m[1];
    if (!imp || imp.startsWith('http') || imp.startsWith('#') || imp.startsWith('node:')) continue;
    totalImports++;
    if (imp.startsWith('.')) {
      const resolved = resolveRelative(imp, f.path);
      if (resolved && resolved !== f.path) { imports.add(resolved); totalResolved++; }
    } else if (imp.startsWith('@/')) {
      const resolved = resolveAlias(imp);
      if (resolved && resolved !== f.path) { imports.add(resolved); totalResolved++; }
    }
  }
  importMap[f.path] = [...imports].sort();
}

console.error(`Imports: ${totalImports} total, ${totalResolved} resolved across ${files.length} files`);

// Reverse adjacency
const adjacency = {};
for (const [file, imports] of Object.entries(importMap)) {
  for (const imp of imports) {
    if (!adjacency[imp]) adjacency[imp] = [];
    adjacency[imp].push(file);
  }
}

// ─── BUILD NODES ───
const summaryMap = {
  'src/start.ts': 'Cloudflare Pages SSR entry point. Sets up error middleware, normalizes catastrophic SSR errors (h3 swallows throws), wires TanStack Start server instance.',
  'src/server.ts': 'TanStack Start server entry — creates QueryClient + router via getRouter(), sets up error boundary, Cloudflare Pages fetch handler with branded error responses.',
  'src/router.tsx': 'TanStack Router factory — creates router with routeTree, QueryClient context, scrollRestoration, defaultPreloadStaleTime. Exported as getRouter() function.',
  'src/routeTree.gen.ts': 'Auto-generated route tree from TanStack Router file-based routing — defines all 7 routes (index, feed, discover, launch, my-agents, agent$id, root), their params and search schemas.',
  'src/lib/api.ts': 'Axios API client — auth interceptors (reads privy_token from localStorage), typed API methods for agents, positions, feed, copy trading, wallets, memory, strategy, backtest. Also exports WebSocket factory (createAgentSocket).',
  'src/lib/types.ts': 'Shared TypeScript interfaces exported alongside API methods: Agent, Position, FeedEvent, CopyRelation, MemoryEntry, ThinkingTrace, plus Venue, ModelProvider, AgentStatus, PositionStatus, HostingType.',
  'src/lib/constants.ts': 'App constants — API_BASE, WS_BASE, VENUES array, VENUE_LABEL, VENUE_EMOJI, MODEL_LABEL maps.',
  'src/lib/mock-data.ts': 'Mock data for development — AGENTS array (6 agents), POSITIONS array (10 positions), formatter functions (fmtUSD, fmtPct, timeAgo), VENUE_LABEL, helper functions (getAgent, positionsOf).',
  'src/lib/utils.ts': 'Utility functions — cn() (clsx + tailwind-merge), fmtUSD, fmtPct, timeAgo.',
  'src/lib/error-page.ts': 'SSR error page HTML template — renders branded 500 error page for caught exceptions.',
  'src/lib/error-capture.ts': 'Browser-side error capture for SSR — window.onerror and unhandledrejection capture, stores last error for server reporting.',
  'src/providers/AuthProvider.tsx': 'React context provider wrapping AuthContext — reads privy_token from localStorage, exposes login/logout/setUserId. Used in __root.tsx.',
  'src/hooks/useAuth.ts': 'Auth context consumer — createContext/useContext pattern, throws if used outside provider.',
  'src/hooks/useAgents.ts': 'TanStack Query hooks — useAgents (30s refetch), useAgent(id), useCreateAgent (mutation), useUpdateAgentStatus (mutation with auto-invalidation).',
  'src/hooks/useFeed.ts': 'TanStack Query hook — useFeed with venue filter state (useState), 15s refetch interval, filter param passed to API.',
  'src/hooks/usePositions.ts': 'TanStack Query hook — usePositions(agentId?) with 30s refetch, passes status: open to API.',
  'src/hooks/useWallet.ts': 'TanStack Query hook — useWallet with balance, walletAddress, createWallet mutation (auto-invalidates wallet query).',
  'src/hooks/useMemory.ts': 'TanStack Query hooks — useAgentMemory, useThinkingTraces (10s refetch for live reasoning traces).',
  'src/hooks/useWebSocket.ts': 'WebSocket hook — connects to agent socket on agentId change, parses JSON events, auto-closes on unmount.',
  'src/hooks/use-mobile.tsx': 'useIsMobile — matches window.matchMedia at 768px breakpoint, listens to resize events.',
  'src/routes/__root.tsx': 'Root route component — QueryClientProvider + AuthProvider + SidebarProvider wrapper. AppShell layout: collapsible sidebar, sticky header (with MarketTicker, + New Agent button), main outlet, MobileBottomNav, Toaster. 404 and error components.',
  'src/routes/index.tsx': 'Landing/marketing page at / — hero with gradient headline, feature cards, nav header, CTAs to /feed and /launch.',
  'src/routes/feed.tsx': 'Live feed at /feed — event list with venue filter buttons, top performers sidebar, launch CTA. Combines useFeed + useAgents hooks.',
  'src/routes/discover.tsx': 'Agent discovery at /discover — sortable table of all AGENTS sorted by AUM, showing venues, PnL, win rate, copiers.',
  'src/routes/launch.tsx': 'Agent launch wizard at /launch — 5-step form: Identity (name/strategy), Venues (venue selection), Strategy (signals + max positions + TP), Risk (style + budget + leverage + SL/TP + switches), Preview (mock position simulation). State-based stepper, deterministic mock PnL preview.',
  'src/routes/my-agents.tsx': 'User portfolio at /my-agents — summary tiles (AUM, PnL 24h, venues, copiers), agent cards with status badge, pause/open controls, strategy description.',
  'src/routes/agent.$id.tsx': 'Agent detail page at /agent/:id — hero banner with stats grid, position timeline/position cards tabs, copy-trading CTA.',
  'src/components/AppSidebar.tsx': 'Collapsible Radix sidebar — nav links (Feed, Discover, Launch, My Agents), wallet status footer with pulse dot.',
  'src/components/MarketTicker.tsx': 'Marquee ticker bar in header — aggregate TVL, active agents, copiers, avg PnL computed from useAgents.',
  'src/components/MobileBottomNav.tsx': 'Fixed bottom tab bar (mobile only, hidden on md+) — 5 tabs with primary CTA bubble for Launch.',
  'src/components/FeedItem.tsx': 'Feed event card component — agent avatar link, reasoning snippet, market/side/size display, Arcscan txHash link, Copy trade button.',
  'src/components/PositionsTimeline.tsx': 'Positions timeline component — chronological list with venue dots, PnL breakdown sidebar by venue with horizontal bars, total PnL summary.',
  'src/components/CopyTradeModal.tsx': 'Copy trade dialog — origin position summary, amount/leverage/SL-TP sliders, auto-exit toggle, mock projection with Sparkles.',
  'src/styles.css': 'Global stylesheet — CSS custom properties for design tokens (colors, spacing), font imports (Sora, Manrope, JetBrains Mono), Tailwind CSS v4 layers.',
  'vite.config.ts': 'Vite build config — Cloudflare Pages plugin, TanStack router plugin (with generated routeTree), Tailwind CSS v4 plugin.',
  'tsconfig.json': 'TypeScript configuration — path aliases (@/* → src/*), JSX preserve, strict mode, baseUrl.',
  'wrangler.jsonc': 'Cloudflare Pages configuration — build command (vite build), output directory, compatibility date.',
  'eslint.config.js': 'ESLint flat config — TypeScript/React rules, prettier integration.',
};

const tagMap = {
  'src/routes/': ['route', 'page'],
  'src/hooks/': ['hook', 'tanstack-query'],
  'src/components/': ['app-component'],
  'src/components/ui/': ['ui-component', 'shadcn'],
  'src/lib/': ['lib', 'module'],
  'src/providers/': ['provider', 'context'],
};

const nodes = files.map(f => {
  let tags = [f.fileCategory, f.language];
  for (const [prefix, ts] of Object.entries(tagMap)) {
    if (f.path.startsWith(prefix)) { tags = [...new Set([...tags, ...ts])]; break; }
  }
  if (f.path === 'src/routes/__root.tsx') tags.push('root-route', 'layout');
  if (f.path === 'src/start.ts') tags.push('entry-point', 'ssr');
  if (f.path === 'src/server.ts') tags.push('server-entry');
  if (f.path === 'src/router.tsx') tags.push('router-config');
  if (f.path === 'src/routeTree.gen.ts') tags.push('generated');
  if (f.path === 'src/lib/api.ts') tags.push('api-client', 'axios');
  if (f.path === 'src/providers/') tags.push('context-provider');
  if (f.path === 'src/lib/mock-data.ts') tags.push('mock-data');
  if (f.path === 'src/lib/types.ts') tags.push('types', 'interfaces');
  
  return {
    id: 'file:' + f.path,
    name: f.path.split('/').pop(),
    filePath: f.path,
    type: 'file',
    tags: [...new Set(tags)],
    summary: summaryMap[f.path] || `${f.fileCategory} file (${f.language})`,
    complexity: f.sizeLines < 50 ? 'simple' : f.sizeLines < 150 ? 'moderate' : 'complex',
  };
});

// ─── BUILD EDGES ───
const edgeSet = new Set();
const edges = [];

for (const [file, imports] of Object.entries(importMap)) {
  for (const imp of imports) {
    const key = `file:${file}||file:${imp}||imports`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: 'file:' + file, target: 'file:' + imp, type: 'imports', weight: 0.7 });
    }
  }
}

// ─── BUILD LAYERS ───
const uiComponents = files.filter(f => f.path.startsWith('src/components/ui/')).map(f => 'file:' + f.path);

const layers = [
  {
    id: 'layer:entry-config',
    name: 'Entry & Config',
    description: 'Project entry points (Cloudflare Pages SSR), routing configuration, build tooling, and TypeScript setup.',
    nodeIds: files.filter(f => ['src/start.ts','src/server.ts','src/router.tsx','src/routeTree.gen.ts','vite.config.ts','tsconfig.json','eslint.config.js','wrangler.jsonc','package.json','components.json','bunfig.toml'].includes(f.path)).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:routes',
    name: 'Routes & Pages',
    description: 'File-based route components (TanStack Router file routing). Each route maps to a URL path: /, /feed, /discover, /launch, /my-agents, /agent/:id.',
    nodeIds: files.filter(f => f.path.startsWith('src/routes/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:app-components',
    name: 'App Components',
    description: 'Custom UI components built for Trivo — AppSidebar, MarketTicker, MobileBottomNav, FeedItem, PositionsTimeline, CopyTradeModal.',
    nodeIds: files.filter(f => f.path.startsWith('src/components/') && !f.path.startsWith('src/components/ui/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:ui-primitives',
    name: 'UI Primitives (shadcn/ui)',
    description: 'Headless Radix UI components styled with Tailwind CSS. All from shadcn/ui — accordion, alert-dialog, button, card, dialog, form, input, label, select, slider, switch, tabs, textarea, tooltip, etc.',
    nodeIds: uiComponents,
  },
  {
    id: 'layer:hooks',
    name: 'Custom Hooks',
    description: 'React custom hooks wrapping TanStack Query (data fetching + caching) and WebSocket (real-time agent events).',
    nodeIds: files.filter(f => f.path.startsWith('src/hooks/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:lib',
    name: 'Lib & Utilities',
    description: 'API client (Axios + typed methods), TypeScript interfaces, constants, mock data, formatters (fmtUSD/fmtPct/timeAgo), error pages.',
    nodeIds: files.filter(f => f.path.startsWith('src/lib/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:providers',
    name: 'Context Providers',
    description: 'React context providers — AuthProvider (Privy wallet token from localStorage).',
    nodeIds: files.filter(f => f.path.startsWith('src/providers/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:styles',
    name: 'Styles',
    description: 'Global CSS with design tokens, font imports, and Tailwind layers.',
    nodeIds: ['file:src/styles.css'],
  },
];

// ─── BUILD TOUR ───
const tour = [
  { order: 1, title: 'Entry Point: Cloudflare Pages SSR', description: 'src/start.ts is the Cloudflare Pages fetch handler. It wires error middleware, normalizes catastrophic SSR errors from h3, and delegates to the TanStack Start server entry. This is where every request enters.', nodeIds: ['file:src/start.ts'] },
  { order: 2, title: 'Server Entry & Router Factory', description: 'src/server.ts and src/router.tsx — the router factory creates the TanStack Router with the generated routeTree and QueryClient context. scrollRestoration and defaultPreloadStaleTime are configured.', nodeIds: ['file:src/server.ts', 'file:src/router.tsx', 'file:src/routeTree.gen.ts'] },
  { order: 3, title: 'Root Route — App Shell Layout', description: '__root.tsx wraps the entire app with QueryClientProvider, AuthProvider, and SidebarProvider. It renders: collapsible AppSidebar, sticky header with MarketTicker, main Outlet, MobileBottomNav, and Toaster. Landing page (/ ) skips the sidebar.', nodeIds: ['file:src/routes/__root.tsx', 'file:src/components/AppSidebar.tsx', 'file:src/components/MarketTicker.tsx', 'file:src/components/MobileBottomNav.tsx'] },
  { order: 4, title: 'Landing Page', description: '/ is the public marketing page — gradient hero with CTA, feature grid (multi-venue, AI decisions, copy trading), nav header. Does not show the sidebar/app chrome.', nodeIds: ['file:src/routes/index.tsx'] },
  { order: 5, title: 'Live Feed (/feed)', description: 'Real-time agent position feed with venue filter buttons (ALL/PERP/PREDICTION/LP/YIELD/SPOT), top performers sidebar, and launch CTA. Uses useFeed (15s refetch) + useAgents (30s refetch). FeedItem component renders each event.', nodeIds: ['file:src/routes/feed.tsx', 'file:src/hooks/useFeed.ts', 'file:src/components/FeedItem.tsx'] },
  { order: 6, title: 'Agent Discovery (/discover)', description: 'Table view of all 6 mock agents sorted by AUM. Shows venues, PnL 24h/7d, win rate, copiers. Links to agent detail page.', nodeIds: ['file:src/routes/discover.tsx', 'file:src/lib/mock-data.ts'] },
  { order: 7, title: 'Launch Wizard (/launch)', description: '5-step agent creation form: (1) Identity — name + strategy description, (2) Venues — PERP/PREDICTION/LP/YIELD/SPOT toggles, (3) Strategy — signal sources + max positions + take profit, (4) Risk — style + budget + leverage + stop loss + autopost/copyable switches, (5) Preview — mock position simulation with deterministic PnL calculation.', nodeIds: ['file:src/routes/launch.tsx', 'file:src/lib/mock-data.ts'] },
  { order: 8, title: 'My Agents (/my-agents)', description: 'User portfolio showing their 2 deployed agents with AUM, PnL 24h, active venues, copiers tiles. Agent cards have status badge (LIVE/PAUSED), strategy description, pause/open controls, and link to agent detail.', nodeIds: ['file:src/routes/my-agents.tsx'] },
  { order: 9, title: 'Agent Detail (/agent/:id)', description: 'Agent profile page with hero banner (avatar, handle, strategy, venues), 6-stat grid (AUM, PnL 24h/7d, win rate, copiers, trades), and tabbed activity view (timeline vs card layout). CopyTradeModal triggered from CTA button.', nodeIds: ['file:src/routes/agent.$id.tsx', 'file:src/components/PositionsTimeline.tsx', 'file:src/components/CopyTradeModal.tsx'] },
  { order: 10, title: 'API Client Layer', description: 'src/lib/api.ts is the Axios-based API client. Auth interceptor reads privy_token from localStorage. All backend communication (32 endpoints) goes through typed methods: agentsApi, positionsApi, feedApi, copyApi, walletsApi, memoryApi, strategyApi, backtestApi. Also exports createAgentSocket for WebSocket.', nodeIds: ['file:src/lib/api.ts', 'file:src/lib/types.ts'] },
  { order: 11, title: 'TanStack Query Hooks', description: '7 custom hooks wrapping TanStack Query: useAgents (30s), useAgent, useCreateAgent, useUpdateAgentStatus (mutations), useFeed (15s), usePositions (30s), useWallet (30s + mutation), useAgentMemory, useThinkingTraces (10s), useWebSocket (real-time).', nodeIds: ['file:src/hooks/useAgents.ts', 'file:src/hooks/useFeed.ts', 'file:src/hooks/useWebSocket.ts', 'file:src/hooks/useWallet.ts', 'file:src/hooks/useMemory.ts'] },
  { order: 12, title: 'Auth & Context', description: 'AuthProvider reads Privy wallet token from localStorage on mount, exposes login/logout/setUserId through React context. useAuth hook consumes this context. No real Privy SDK integration yet — mock auth.', nodeIds: ['file:src/providers/AuthProvider.tsx', 'file:src/hooks/useAuth.ts'] },
];

// ─── ASSEMBLE ───
const graph = {
  version: '1.0.0',
  project: {
    name: 'trivo-frontend',
    languages,
    frameworks: [...frameworks].sort(),
    description: 'Trivo frontend — AI trading agent platform UI built with TanStack Start, React 19, TanStack Query, TanStack Router, Tailwind CSS v4, and Radix UI on Cloudflare Pages. Features: landing page, live agent feed with venue filters, agent discovery table, 5-step agent launch wizard, portfolio dashboard, agent detail with copy-trading, and mobile bottom nav.',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: 'e92c4f50204b43e79eb2e487b692c51f73001996',
  },
  nodes,
  edges,
  layers,
  tour,
};

const outPath = path.join(PROJECT_ROOT, '.understand-anything/intermediate/assembled-graph.json');
fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));
console.error('Written:', outPath);
console.error('Nodes:', nodes.length, 'Edges:', edges.length, 'Layers:', layers.length, 'Tour:', tour.length);
