/**
 * Refresh the data snapshot baked into index.html.
 *
 * The dashboard paints instantly from window.__PRECACHE__ before any network
 * call returns. That snapshot goes stale as time passes — the freshness bar
 * will say so honestly, but a first-time visitor still sees old numbers for a
 * moment. Run this whenever you deploy to reset it:
 *
 *     node rebake-snapshot.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');
const MARKER = 'window.__PRECACHE__';

// Read the dispatch endpoint straight out of index.html so this script can
// never drift from whatever URL the dashboard is actually using.
function readApiUrl(src) {
  const m = /const API_URL = '([^']+)'/.exec(src);
  if (!m) throw new Error('API_URL not found in index.html');
  return m[1];
}

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const url = readApiUrl(src);
  console.log('Fetching', url.slice(0, 60) + '…');

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const json = await resp.json();
  const rows = Array.isArray(json) ? json : (json.data || []);
  if (!rows.length) throw new Error('empty payload — refusing to bake');

  const lines = src.split(/\r?\n/);
  const idx = lines.findIndex(l => l.includes(MARKER));
  if (idx === -1) throw new Error('snapshot line not found');

  const ts = Date.now();
  lines[idx] = '  <script>window.__PRECACHE__ = ' + JSON.stringify(rows) +
    '; window.__PRECACHE_TS__ = ' + ts + ';<\/script>';

  fs.writeFileSync(FILE, lines.join('\n'), 'utf8');
  console.log('Baked ' + rows.length + ' rows · ' + new Date(ts).toLocaleString('en-IN'));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
