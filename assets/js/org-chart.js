/*
 * GransTech — organisation chart
 * Reads rows (ID, Name, Role, Reports_To, Department, Experience, Photo_URL, Order)
 * from ORG_DATA_SOURCE in org-source.js: a public Google Sheet link, a CSV file,
 * or an .xlsx file. Falls back to org-hierarchy.csv if the source cannot be read.
 * Placeholder values ("Name Placeholder", "Years of Exp") are hidden from visitors.
 */
(function () {
  'use strict';

  const ROOT = window.GT_ROOT || './';
  const container = document.getElementById('orgTree');
  if (!container) return;

  const DEFAULT_AVATAR = ROOT + 'assets/img/avatar.webp';
  const FALLBACK_CSV = ROOT + 'org-hierarchy.csv';
  const PLACEHOLDER_NAMES = ['name placeholder', 'name', 'tbd', 'tba', '-'];
  const PLACEHOLDER_EXP = ['years of exp', 'experience', 'exp', '-'];
  let lastHash = '';

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const key = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [head, ...body] = rows.filter((r) => r.some((v) => v.trim()));
    if (!head) return [];
    return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }

  function photoUrl(raw) {
    const src = String(raw || '').trim();
    if (!src || /profile_avatar/i.test(src)) return DEFAULT_AVATAR;
    const drive = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
    if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w200`;
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
    return ROOT + src.replace(/^\.?\//, '');
  }

  function buildTree(rawRows) {
    const rows = rawRows.map((item, idx) => {
      const n = {};
      for (const k in item) n[key(k)] = item[k];
      const name = String(n.name || '').trim();
      const exp = String(n.experience || n.exp || '').trim();
      return {
        id: String(n.id || `node_${idx + 1}`).trim(),
        name: PLACEHOLDER_NAMES.includes(name.toLowerCase()) ? '' : name,
        role: String(n.role || n.title || n.designation || 'Team member').trim(),
        reportsTo: String(n.reportsto || n.reportsunder || n.parentid || n.manager || '').trim(),
        exp: PLACEHOLDER_EXP.includes(exp.toLowerCase()) ? '' : exp,
        photo: photoUrl(n.photourl || n.photo || n.image || n.avatar),
        order: Number(n.order || n.sort) || idx + 1,
        children: [],
      };
    });

    const byId = new Map(rows.map((r) => [r.id.toLowerCase(), r]));
    const byRole = new Map(rows.map((r) => [r.role.toLowerCase(), r]));
    const roots = [];
    rows.forEach((r) => {
      const rep = r.reportsTo.toLowerCase();
      const parent = rep && rep !== r.id.toLowerCase() ? byId.get(rep) || byRole.get(rep) : null;
      (parent && parent !== r ? parent.children : roots).push(r);
    });
    const sort = (list) => {
      list.sort((a, b) => a.order - b.order || a.role.localeCompare(b.role));
      list.forEach((n) => sort(n.children));
    };
    sort(roots);
    return roots;
  }

  const clock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/></svg>';

  function card(node, lvl) {
    return `<div class="org-card lvl-${lvl}">
      <img class="org-avatar" src="${esc(node.photo)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
      <div>
        <div class="org-role">${esc(node.role)}</div>
        ${node.name ? `<div class="org-name">${esc(node.name)}</div>` : ''}
        ${node.exp ? `<div class="org-exp">${clock}${esc(node.exp)}</div>` : ''}
      </div>
    </div>`;
  }

  function subs(nodes) {
    if (!nodes.length) return '';
    return `<div class="org-subs">${nodes.map((n) => card(n, 3) + subs(n.children)).join('')}</div>`;
  }

  function branches(nodes) {
    const n = nodes.length;
    const edge = `calc((100% - ${(n - 1) * 14}px) / ${2 * n})`;
    return `<div class="org-branches" style="--line-start:${edge};--line-end:${edge}">
      ${nodes.map((c) => `<div class="org-branch">${card(c, 2)}${subs(c.children)}</div>`).join('')}
    </div>`;
  }

  function stem(node, lvl) {
    let html = `<div class="org-node">${card(node, Math.min(lvl, 1))}`;
    if (node.children.length === 1 && lvl < 1) {
      html += '<div class="org-line"></div>' + stem(node.children[0], lvl + 1);
    } else if (node.children.length) {
      html += '<div class="org-line"></div>' + branches(node.children);
    }
    return html + '</div>';
  }

  function render(rows) {
    if (!rows || !rows.length) return false;
    const hash = JSON.stringify(rows);
    if (hash === lastHash) return true;
    lastHash = hash;
    container.innerHTML = buildTree(rows).map((r) => stem(r, 0)).join('');
    return true;
  }

  function resolve(src) {
    const gs = String(src).match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
    if (!gs) return src;
    if (/\/pub\?.*output=csv/.test(src)) return src;
    const gid = (src.match(/[?&#]gid=(\d+)/) || [])[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${gs[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }

  function loadXlsxLib() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = ROOT + 'xlsx.full.min.js';
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function fetchRows(src) {
    const url = resolve(src);
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (/\.xlsx?($|\?)/i.test(src)) {
      await loadXlsxLib();
      const wb = window.XLSX.read(await res.arrayBuffer(), { type: 'array' });
      return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    }
    return parseCsv(await res.text());
  }

  async function sync() {
    const configured = typeof ORG_DATA_SOURCE !== 'undefined' && ORG_DATA_SOURCE ? ORG_DATA_SOURCE : FALLBACK_CSV;
    const src = /^(https?:)?\/\//.test(configured) ? configured : ROOT + configured.replace(/^\.?\//, '');
    try {
      if (render(await fetchRows(src))) return;
      throw new Error('empty sheet');
    } catch (err) {
      if (lastHash) return; // keep the chart already on screen
      try {
        if (render(await fetchRows(FALLBACK_CSV))) return;
      } catch (_) { /* fall through */ }
      container.innerHTML = '<p class="org-loading">The organisation chart is being updated. Please check back shortly.</p>';
    }
  }

  sync();
  const every = typeof ORG_REFRESH_INTERVAL !== 'undefined' ? Number(ORG_REFRESH_INTERVAL) : 0;
  if (every > 0) {
    setInterval(() => { if (document.visibilityState === 'visible') sync(); }, every * 1000);
  }
})();
