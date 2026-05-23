const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/xfajarr/Hackathon/trivo/trivo-frontend';

// Load scan results
const scan = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.understand-anything/tmp/ua-scan-results.json'), 'utf8'));
const fileSet = new Set(scan.files.map(f => f.path));

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
  
  // Match import from '...' or import "..."
  const re = /import\s+(?:(?:{[\w\s,]*}\s+from\s+|[\w]+\s+from\s+)?['"]([^'"]+)['"])/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const imp = m[1];
    if (!imp || imp.startsWith('http') || imp.startsWith('#') || imp.startsWith('node:')) continue;
    if (imp.startsWith('.')) {
      const resolved = resolveRelative(imp, f.path);
      if (resolved && resolved !== f.path) { imports.add(resolved); totalImports++; }
    }
  }
  
  importMap[f.path] = [...imports].sort();
}

console.error(`Resolved ${totalImports} total imports across ${scan.files.length} files`);
scan.importMap = importMap;
fs.writeFileSync(path.join(PROJECT_ROOT, '.understand-anything/tmp/ua-scan-results.json'), JSON.stringify(scan, null, 2));

// Print sample
const nonEmpty = Object.entries(importMap).filter(([k,v]) => v.length > 0).slice(0, 5);
nonEmpty.forEach(([k,v]) => console.log(k, '->', v.join(', ')));
