// Static site builder for granstech.com — no dependencies.
//
//   node tools/build.mjs
//
// Reads src/pages/**/*.html (front matter + body), wraps each page in
// src/layout.html with the shared header/footer partials, and writes the
// finished HTML to the project root using the same URL structure as the
// previous WordPress site (/about-us/, /products/, ...). Also writes
// sitemap.xml. Edit files in src/, then re-run this script.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const SITE_URL = 'https://granstech.com/';
const LASTMOD = new Date().toISOString().slice(0, 10);

const read = (p) => readFileSync(join(SRC, p), 'utf8');
// Real image dimensions (written by tools/optimize_images.py) keep width/height exact
const SIZES = JSON.parse(readFileSync(join(ROOT, 'assets/img/sizes.json'), 'utf8'));
const fixImageSizes = (html) =>
  html.replace(/<img[^>]*>/g, (tag) => {
    const m = tag.match(/src="[^"]*assets\/img\/([^"\/]+)"/);
    const size = m && SIZES[m[1]];
    if (!size) return tag;
    return tag.replace(/width="\d+"/, `width="${size[0]}"`).replace(/height="\d+"/, `height="${size[1]}"`);
  });
const layout = read('layout.html');
const partials = {
  header: read('partials/header.html'),
  footer: read('partials/footer.html'),
  icons: read('partials/icons.svg'),
  cta: read('partials/cta.html'),
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : [];
  });
}

function parse(file) {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter in ${file}`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function breadcrumbLd(meta, url) {
  if (!meta.crumb) return '';
  const items = [{ name: 'Home', item: SITE_URL }];
  if (meta.parent) {
    const [name, path] = meta.parent.split('|').map((s) => s.trim());
    items.push({ name, item: SITE_URL + path });
  }
  items.push({ name: meta.crumb, item: url });
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.item })),
  };
  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

function fill(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

const pages = walk(join(SRC, 'pages')).map((file) => {
  const { meta, body } = parse(file);
  const path = meta.path ?? '';
  const depth = path.split('/').filter(Boolean).length;
  // 404 pages are served from arbitrary URLs, so they set `root: /`
  const root = meta.root || (depth ? '../'.repeat(depth) : './');
  const url = SITE_URL + path;
  const isDoc = !path.endsWith('.html');

  let header = partials.header;
  // Mark the current section in both navigations
  if (meta.nav) {
    header = header.replace(new RegExp(`data-nav="${meta.nav}"`, 'g'), `data-nav="${meta.nav}" aria-current="page"`);
  }

  const vars = {
    root,
    title: esc(meta.title),
    description: esc(meta.description),
    canonical: url,
    robots: meta.robots || 'index, follow, max-image-preview:large',
    og_type: path === '' ? 'website' : 'article',
    head_extra: (meta.preload ? `<link rel="preload" as="image" href="${root}${meta.preload}" fetchpriority="high">` : '') + breadcrumbLd(meta, url),
    body_class: meta.body_class || '',
  };

  let html = fill(layout, {
    ...vars,
    icons: partials.icons,
    header: fill(header, vars),
    footer: fill(partials.footer, vars),
    content: fill(body.replace('<!-- @cta -->', partials.cta), vars),
  });

  const outFile = isDoc ? join(ROOT, path, 'index.html') : join(ROOT, path);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, fixImageSizes(html));
  console.log('built', relative(ROOT, outFile).split(sep).join('/'));
  return { url, meta, isDoc };
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => p.isDoc && !(p.meta.robots || '').includes('noindex'))
  .sort((a, b) => a.url.length - b.url.length)
  .map((p) => `  <url><loc>${p.url}</loc><lastmod>${LASTMOD}</lastmod><priority>${p.meta.priority || '0.7'}</priority></url>`)
  .join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap);
console.log('built sitemap.xml');
