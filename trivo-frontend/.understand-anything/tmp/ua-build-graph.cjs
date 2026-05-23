const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/xfajarr/Hackathon/trivo/trivo-frontend';
const scan = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.understand-anything/tmp/ua-scan-results.json'), 'utf8'));
const fileSet = new Set(scan.files.map(f => f.path));

// tsconfig paths
let tsconfigPaths = {};
let tsconfigBaseUrl = '.';
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8'));
  if (tsconfig.compilerOptions?.paths) {
    tsconfigPaths = tsconfig.compilerOptions.paths;
    tsconfigBaseUrl = tsconfig.compilerOptions.baseUrl || '.';
  }
} catch {}

// Resolve @ alias
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

// Parse imports from each file
const importMap = {};
let totalImports = 0;
let totalResolved = 0;

for (const f of scan.files) {
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

console.error(`Imports: ${totalImports} total, ${totalResolved} resolved across ${scan.files.length} files`);

// Build reverse adjacency
const adjacency = {};
for (const [file, imports] of Object.entries(importMap)) {
  for (const imp of imports) {
    if (!adjacency[imp]) adjacency[imp] = [];
    adjacency[imp].push(file);
  }
}

// Build nodes
const nodes = [];
for (const f of scan.files) {
  const summaryMap = {
    'src/start.ts': 'Cloudflare Pages SSR entry — sets up error middleware, normalizes catastrophic SSR errors, wires TanStack Start server.',
    'src/server.ts': 'TanStack Start server entry — creates router with QueryClient, sets up error boundary, Cloudflare Pages fetch handler.',
    'src/router.tsx': 'TanStack Router configuration — creates router with routeTree, QueryClient context, scrollRestoration, and defaultPreloadStaleTime.',
    'src/routeTree.gen.ts': 'Auto-generated route tree from file-based routing — defines all routes, their params, and search schemas.',
    'src/lib/api.ts': 'Axios API client — auth interceptors, typed API methods for agents, positions, feed, copy trading, wallets, memory, strategy, backtest, and WebSocket factory.',
    'src/lib/types.ts': 'Shared TypeScript interfaces — Agent, Position, FeedEvent, CopyRelation, MemoryEntry, ThinkingTrace, plus exported types for Venue, ModelProvider, AgentStatus.',
    'src/lib/mock-data.ts': 'Mock data and formatters — hardcoded AGENTS/POSITIONS arrays, formatters (fmtUSD, fmtPct, timeAgo), VENUE_LABEL map.',
    'src/lib/utils.ts': 'Utility functions — cn() (clsx+twMerge), fmtUSD, fmtPct, timeAgo.',
    'src/lib/constants.ts': 'App constants — VENUES, VENUE_LABEL, VENUE_EMOJI, MODEL_LABEL, API_BASE, WS_BASE.',
    'src/lib/error-page.ts': 'Error page renderer — HTML template for 500/SSR errors with branded design.',
    'src/lib/error-capture.ts': 'SSR error capture — window.onerror and unhandledrejection capture for server-side rendering.',
    'src/providers/AuthProvider.tsx': 'Auth context provider — wraps React context with login/logout, reads/writes privy_token from localStorage.',
    'src/hooks/useAuth.ts': 'Auth context hook — createContext/useContext pattern, exposes isAuthenticated, userId, login, logout.',
    'src/hooks/useAgents.ts': 'TanStack Query hooks — useAgents, useAgent(id), useCreateAgent, useUpdateAgentStatus with auto-invalidation.',
    'src/hooks/useFeed.ts': 'TanStack Query hook — useFeed with venue filter state, 15s refetch interval.',
    'src/hooks/usePositions.ts': 'TanStack Query hook — usePositions(agentId?) with 30s refetch.',
    'src/hooks/useWallet.ts': 'TanStack Query hook — useWallet with balance, createWallet mutation, 30s refetch.',
    'src/hooks/useMemory.ts': 'TanStack Query hooks — useAgentMemory, useThinkingTraces with 10s refetch.',
    'src/hooks/useWebSocket.ts': 'WebSocket hook — connects to agent socket, parses events, auto-reconnects on agentId change.',
    'src/hooks/use-mobile.tsx': 'useIsMobile hook — matches media query at 768px breakpoint, returns boolean.',
    'src/routes/__root.tsx': 'Root route — QueryClientProvider + AuthProvider + SidebarProvider wrapper, AppShell layout with sidebar, header, MarketTicker, MobileBottomNav, Toaster.',
    'src/routes/index.tsx': 'Landing page — hero, features grid, CTAs to /feed and /launch.',
    'src/routes/feed.tsx': 'Live feed — event list with venue filter, top performers sidebar, launch CTA.',
    'src/routes/discover.tsx': 'Agent discovery — sortable table of all agents ranked by AUM.',
    'src/routes/launch.tsx': 'Agent launch wizard — 5-step form: Identity, Venues, Strategy, Risk, Preview with mock position simulation.',
    'src/routes/my-agents.tsx': 'User portfolio — summary tiles, agent cards with status/pause/open controls.',
    'src/routes/agent.$id.tsx': 'Agent detail — hero banner with stats grid, activity tabs (timeline/cards), copy-trading CTA.',
    'src/components/AppSidebar.tsx': 'Collapsible sidebar — nav links (Feed, Discover, Launch, My Agents), wallet status footer.',
    'src/components/MarketTicker.tsx': 'Marquee ticker bar — aggregate TVL, active agents, copiers, avg PnL from useAgents.',
    'src/components/MobileBottomNav.tsx': 'Fixed bottom nav — 5 tabs (Home, Feed, Launch, Discover, Agents) with primary CTA bubble.',
    'src/components/FeedItem.tsx': 'Feed event card — agent avatar, reasoning, market/side/size, txHash link, Copy trade button.',
    'src/components/PositionsTimeline.tsx': 'Positions timeline — chronological list + PnL breakdown by venue with horizontal bars.',
    'src/components/CopyTradeModal.tsx': 'Copy trade dialog — origin position summary, amount/leverage/SL-TP sliders, mock projection display.',
    'src/styles.css': 'Global CSS — CSS variables for design tokens (colors, spacing), custom fonts (Sora, Manrope, JetBrains Mono), Tailwind layers.',
    'vite.config.ts': 'Vite config — Cloudflare Pages plugin, TanStack router plugin, Tailwind CSS plugin.',
    'tsconfig.json': 'TypeScript config — path aliases (@/ -> src/), JSX, strict mode settings.',
    'wrangler.jsonc': 'Cloudflare Pages config — pages directory, build command, compatibility date.',
    'eslint.config.js': 'ESLint flat config — TypeScript + React rules, prettier integration.',
  };
  
  const tagMap = {
    'src/routes/': ['route', 'page'],
    'src/hooks/': ['hook', 'tanstack-query'],
    'src/components/': ['component'],
    'src/components/ui/': ['ui-component', 'shadcn'],
    'src/lib/': ['util', 'module'],
    'src/providers/': ['provider', 'context'],
    'src/': ['entry', 'config'],
  };
  
  let tags = [f.fileCategory, f.language];
  for (const [prefix, ts] of Object.entries(tagMap)) {
    if (f.path.startsWith(prefix)) { tags = [...tags, ...ts]; break; }
  }
  if (f.path.startsWith('src/routes/')) tags.push('route');
  if (f.path === 'src/routes/__root.tsx') tags.push('root-route', 'layout');
  if (f.path === 'src/start.ts') tags.push('entry-point', 'ssr');
  if (f.path === 'src/server.ts') tags.push('server-entry');
  if (f.path === 'src/router.tsx') tags.push('router-config');
  if (f.path === 'src/routeTree.gen.ts') tags.push('generated');
  if (f.path === 'src/lib/api.ts') tags.push('api-client', 'axios');
  if (f.path === 'src/providers/') tags.push('context-provider');
  
  const node = {
    id: 'file:' + f.path,
    name: f.path.split('/').pop(),
    filePath: f.path,
    type: 'file',
    tags,
    summary: summaryMap[f.path] || `${f.fileCategory} file — ${f.language}`,
    complexity: f.sizeLines < 50 ? 'simple' : f.sizeLines < 150 ? 'moderate' : 'complex',
  };
  nodes.push(node);
}

// Build edges
const edges = [];
const edgeSet = new Set();
for (const [file, imports] of Object.entries(importMap)) {
  for (const imp of imports) {
    const key = `file:${file}||file:${imp}||imports`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: 'file:' + file, target: 'file:' + imp, type: 'imports', weight: 0.7 });
    }
  }
}

// Add reverse edges (imported-by)
for (const [file, importers] of Object.entries(adjacency)) {
  for (const imp of importers) {
    const key = `file:${file}||file:${imp}||imported_by`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: 'file:' + file, target: 'file:' + imp, type: 'imported_by', weight: 0.3 });
    }
  }
}

// Build layers based on directory structure
const layers = [
  {
    id: 'layer:entry',
    name: 'Entry & Config',
    description: 'Project entry points, routing configuration, and build tooling.',
    nodeIds: ['file:src/start.ts', 'file:src/server.ts', 'file:src/router.tsx', 'file:src/routeTree.gen.ts', 'file:vite.config.ts', 'file:tsconfig.json', 'file:eslint.config.js', 'file:wrangler.jsonc', 'file:package.json', 'file:components.json', 'file:bunfig.toml', 'file:.prettierrc', 'file:.prettierignore'],
  },
  {
    id: 'layer:routes',
    name: 'Routes & Pages',
    description: 'File-based route components (TanStack Router) — each maps to a URL path and renders the page UI.',
    nodeIds: ['file:src/routes/__root.tsx', 'file:src/routes/index.tsx', 'file:src/routes/feed.tsx', 'file:src/routes/discover.tsx', 'file:src/routes/launch.tsx', 'file:src/routes/my-agents.tsx', 'file:src/routes/agent.$id.tsx'],
  },
  {
    id: 'layer:components',
    name: 'App Components',
    description: 'Reusable UI components specific to the Trivo trading agent app — not generic shadcn primitives.',
    nodeIds: ['file:src/components/AppSidebar.tsx', 'file:src/components/MarketTicker.tsx', 'file:src/components/MobileBottomNav.tsx', 'file:src/components/FeedItem.tsx', 'file:src/components/PositionsTimeline.tsx', 'file:src/components/CopyTradeModal.tsx'],
  },
  {
    id: 'layer:ui-components',
    name: 'UI Primitives (shadcn)',
    description: 'Headless UI component library — Radix UI primitives styled with Tailwind. All from shadcn/ui.',
    nodeIds: scan.files.filter(f => f.path.startsWith('src/components/ui/')).map(f => 'file:' + f.path),
  },
  {
    id: 'layer:hooks',
    name: 'Custom Hooks',
    description: 'React custom hooks wrapping TanStack Query (data fetching) and WebSocket (real-time events).',
    nodeIds: ['file:src/hooks/useAuth.ts', 'file:src/hooks/useAgents.ts', 'file:src/hooks/useFeed.ts', 'file:src/hooks/usePositions.ts', 'file:src/hooks/useWallet.ts', 'file:src/hooks/useMemory.ts', 'file:src/hooks/useWebSocket.ts', 'file:src/hooks/use-mobile.tsx'],
  },
  {
    id: 'layer:lib',
    name: 'Lib & Utilities',
    description: 'API client, types, constants, mock data, formatters, and error pages.',
    nodeIds: ['file:src/lib/api.ts', 'file:src/lib/types.ts', 'file:src/lib/utils.ts', 'file:src/lib/constants.ts', 'file:src/lib/mock-data.ts', 'file:src/lib/error-page.ts', 'file:src/lib/error-capture.ts'],
  },
  {
    id: 'layer:providers',
    name: 'Providers',
    description: 'React context providers — Auth context (Privy wallet auth state).',
    nodeIds: ['file:src/providers/AuthProvider.tsx'],
  },
];

// Build tour
const tour = [
  { order: 1, title: 'Entry Point: Cloudflare Pages SSR', description: 'src/start.ts is the Cloudflare Pages fetch handler. It wires error middleware, normalizes catastrophic SSR errors, and delegates to the TanStack Start server entry.', nodeIds: ['file:src/start.ts'] },
  { order: 2, title: 'Router Configuration', description: 'src/router.tsx creates the TanStack Router with the generated route tree, QueryClient context, scrollRestoration, and defaultPreloadStaleTime.', nodeIds: ['file:src/router.tsx', 'file:src/routeTree.gen.ts'] },
  { order: 3, title: 'Root Route — App Shell', description: '__root.tsx wraps the entire app in QueryClientProvider, AuthProvider, and SidebarProvider. It renders the sidebar, header with MarketTicker, main content outlet, and MobileBottomNav.', nodeIds: ['file:src/routes/__root.tsx', 'file:src/components/AppSidebar.tsx', 'file:src/components/MarketTicker.tsx', 'file:src/components/MobileBottomNav.tsx'] },
  { order: 4, title: 'Landing Page', description: '/ is the marketing landing page with hero section, feature cards, and CTAs to launch the app.', nodeIds: ['file:src/routes/index.tsx'] },
  { order: 5, title: 'Live Feed (/feed)', description: 'Real-time agent position feed with venue filter buttons, top performers sidebar, and agent launch CTA. Uses useFeed + useAgents hooks.', nodeIds: ['file:src/routes/feed.tsx', 'file:src/hooks/useFeed.ts', 'file:src/components/FeedItem.tsx'] },
  { order: 6, title: 'Agent Discovery (/discover)', description: 'Table view of all agents sorted by AUM, showing venues, PnL, win rate, copiers.', nodeIds: ['file:src/routes/discover.tsx'] },
  { order: 7, title: 'Launch Wizard (/launch)', description: '5-step agent creation wizard: Identity → Venues → Strategy → Risk → Preview. Generates mock position simulation from inputs.', nodeIds: ['file:src/routes/launch.tsx'] },
  { order: 8, title: 'My Agents (/my-agents)', description: 'User portfolio dashboard showing their deployed agents with AUM, PnL tiles, status controls (pause/open), and links to agent detail.', nodeIds: ['file:src/routes/my-agents.tsx'] },
  { order: 9, title: 'Agent Detail (/agent/:id)', description: 'Agent profile with stats grid, activity timeline, position cards, and copy-trading CTA. Links to FeedItem for each position.', nodeIds: ['file:src/routes/agent.$id.tsx', 'file:src/components/PositionsTimeline.tsx', 'file:src/components/CopyTradeModal.tsx'] },
  { order: 10, title: 'API Client Layer', description: 'src/lib/api.ts is the Axios-based API client with auth interceptors (reads privy_token from localStorage). All backend communication goes through typed methods here.', nodeIds: ['file:src/lib/api.ts', 'file:src/lib/types.ts'] },
  { order: 11, title: 'TanStack Query Hooks', description: 'Custom hooks (useAgents, useFeed, usePositions, useWallet, useMemory, useWebSocket) wrap TanStack Query with auto-refetch intervals and query key management.', nodeIds: ['file:src/hooks/useAgents.ts', 'file:src/hooks/useFeed.ts', 'file:src/hooks/useWebSocket.ts'] },
  { order: 12, title: 'Auth & Providers', description: 'AuthProvider reads Privy wallet token from localStorage and exposes login/logout/userId through React context. useAuth hook accesses this.', nodeIds: ['file:src/providers/AuthProvider.tsx', 'file:src/hooks/useAuth.ts'] },
];

// Assemble graph
const graph = {
  version: '1.0.0',
  project: {
    name: 'trivo-frontend',
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: 'Trivo frontend — AI trading agent platform UI built with TanStack Start, React 19, and Tailwind CSS on Cloudflare Pages. Features live feed, agent discovery, copy trading, and an agent launch wizard.',
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
