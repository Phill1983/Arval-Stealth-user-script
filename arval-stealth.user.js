// ==UserScript==
// @name         Arval Stealth — unified (menu hide + contract end dates)
// @namespace    https://github.com/Phill1983/Arval-Stealth-user-script
// @version      4.1.5
// @description  Автоматизація роботи з Service Flow (Arval) — приховування меню, дати контрактів тощо
// @author       Phill_Mass
// @match        https://serwisarval.pl/claims/insurancecase*
// @connect      serwisarval.pl
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Phill1983/Arval-Stealth-user-script
// @supportURL   https://github.com/Phill1983/Arval-Stealth-user-script/issues
// @downloadURL  https://raw.githubusercontent.com/Phill1983/Arval-Stealth-user-script/main/arval-stealth.user.js
// @updateURL    https://raw.githubusercontent.com/Phill1983/Arval-Stealth-user-script/main/arval-stealth.user.js
// ==/UserScript==



(function () {
  'use strict';

  /***************************************************************************
   * CONFIG
   ***************************************************************************/
  const CFG = {
    enableMenuHide: true,
    enableDateCol:  true,
    debounceMs: 150,
    // Zakresy do kolorów
    thresholds: { green: 30, yellow: 14 }, // ≥30 зелений, 14–29 жовтий, ≤13 червоний
  };

  /***************************************************************************
   * UTILS
   ***************************************************************************/
  const d = document, docEl = d.documentElement;
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const ce = (t, props) => Object.assign(d.createElement(t), props || {});
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const toAbsUrl = (href) => {
    if (!href) return null;
    try { return new URL(href, location.href).href; } catch {}
    try { const a = ce('a', { href }); return a.href || null; } catch { return null; }
  };

  /***************************************************************************
   * MODULE A: MENU HIDER (ze ckryptu 0.3.6)
   ***************************************************************************/

  const MenuHider = (() => {
    const SIDEBAR_SELECTORS = [
      '.left-column.large-2.medium-3.columns',
      '.left-column', '.sidebar', '#sidebar', '[data-role="sidebar"]'
    ];
    const MAIN_SELECTORS = [
      '.right-column.large-10.medium-9.columns',
      '.right-column', '.large-10.medium-9.columns', 'main', '.columns:not(.left-column)'
    ];
    const IDS  = { style: 'arval-collapsible-style', btn: 'arval-toggle-btn' };
    const ATTR = 'data-arval-collapsed';
    const LSK  = 'arvalCollapsed';

    function ensureStyle() {
      if ($('#' + IDS.style)) return;
      const css = [
        '[data-arval-left]{transition:transform .2s ease,width .2s ease,min-width .2s ease}',
        `:root[${ATTR}="1"] [data-arval-left]{transform:translateX(-100%);width:0!important;min-width:0!important;overflow:hidden!important;position:absolute!important;left:0;top:0;height:0!important;pointer-events:none!important;visibility:hidden!important}`,
        `:root[${ATTR}="1"] [data-arval-main].columns{float:none!important;display:block!important;width:100%!important;max-width:100%!important;flex:1 1 auto!important}`,
        `:root[${ATTR}="1"] [data-arval-left].columns{float:none!important;}`,
        `#${IDS.btn}{
        position:fixed;
        top:50%;
        left:10px;
        z-index:999;
        width:30px;
        height:30px;
        border-radius:15px;
        display:flex;
        align-items:center;
        justify-content:center;
        font:600 14px/1 system-ui,Segoe UI,Arial,sans-serif;
        background:#fff;
        border:1px solid rgba(0,0,0,.12);
        box-shadow:0 2px 10px rgba(0,0,0,.2);
        cursor:pointer;
        user-select:none}`,

        `#${IDS.btn}:hover{filter:brightness(.95)}`,
        `:root[${ATTR}="1"] #${IDS.btn}::after{content:"›"}`,
        `:root:not([${ATTR}="1"]) #${IDS.btn}::after{content:"‹"}`,
        `@media (prefers-color-scheme:dark){#${IDS.btn}{background:#1e1f22;color:#e5e5e5;border-color:#2f3033}}`,
        `@media screen and (min-width:64em){:root[${ATTR}="1"] [data-arval-main].large-10{width:100%!important}}`,
        `@media screen and (min-width:40em){:root[${ATTR}="1"] [data-arval-main].medium-9{width:100%!important}}`
      ].join('');
      const st = ce('style', { id: IDS.style, textContent: css });
      st.dataset.from = 'arval-safe';
      docEl.appendChild(st);
    }

    function findSidebar() {
      const marked = $('[data-arval-left]'); if (marked) return marked;
      for (const s of SIDEBAR_SELECTORS) { const el = $(s); if (el) { el.setAttribute('data-arval-left','1'); return el; } }
      return null;
    }
    function findMain(sidebar) {
      if (sidebar && sidebar.parentElement) {
        const cand = [...sidebar.parentElement.querySelectorAll('.columns')].find(c => c !== sidebar);
        if (cand) { cand.setAttribute('data-arval-main','1'); return cand; }
      }
      const marked = $('[data-arval-main]'); if (marked) return marked;
      for (const s of MAIN_SELECTORS) { const el = $(s); if (el) { el.setAttribute('data-arval-main','1'); return el; } }
      return null;
    }

    function ensureButton() {
      if ($('#' + IDS.btn)) return;
      const initial = load() === '1';
      const b = ce('button', {
        id: IDS.btn, title: 'Zchować/Pokazać menu', 'aria-label': 'Toggle sidebar',
        'aria-pressed': initial ? 'true' : 'false'
      });
      b.addEventListener('click', () => { const v = docEl.getAttribute(ATTR) === '1' ? '0' : '1'; apply(v); });
      docEl.appendChild(b);
    }

    function save(v){ try { localStorage.setItem(LSK, v); } catch {} }
    function load(){ try { return localStorage.getItem(LSK) || '0'; } catch { return '0'; } }
    function apply(v) {
      const val = (v === '1') ? '1' : '0';
      docEl.setAttribute(ATTR, val);
      const b = $('#'+IDS.btn); if (b) b.setAttribute('aria-pressed', val === '1' ? 'true' : 'false');
      save(val);
    }

    // SPA-підтримка
    let armed = false, lastUrl = location.href, rescanTO = null;

    function initOnce() {
      if (!CFG.enableMenuHide) return;
      ensureStyle();
      ensureButton();
      const sb = findSidebar();
      findMain(sb);
      apply(load());
    }
    function checkUrlChange() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => { initOnce(); DateCol.trigger(); }, 60);
      }
    }
    function rearm() {
      if (armed) return; armed = true;
      const ps = history.pushState, rs = history.replaceState;
      const ping = () => setTimeout(checkUrlChange, 0);
      history.pushState = function(){ const r = ps.apply(this, arguments); ping(); return r; };
      history.replaceState = function(){ const r = rs.apply(this, arguments); ping(); return r; };
      addEventListener('popstate', ping);
      new MutationObserver(() => { clearTimeout(rescanTO); rescanTO = setTimeout(() => initOnce(), 120); })
        .observe(d.documentElement, { childList: true, subtree: true });
    }

    return { initOnce, rearm };
  })();

  /***************************************************************************
   * MODULE B: DATE COLUMN (stabilna v4.0.1)
   ***************************************************************************/
  const DateCol = (() => {
    const PAGE_TITLE_TEXT = /Przeglądaj\s+sprawy\s+ubezpieczeniowe/i;
    const TABLE_MARK = 'data-arval-kolumny';
    const CELL_MARK = 'data-arval-kontrakt-cell';
    const ROW_MARK  = 'data-arval-kontrakt-done';
    const FILTER_KEY = 'arval_only_red_filter_v1';
    const MAX_ROWS_PER_RUN = 400;
    const RUN_DELAY_1 = 600;
    const RUN_DELAY_2 = 1500;

    const DATE_RES = [
      /\b\d{4}[\/.-]\d{2}[\/.-]\d{2}\b/,
      /\b\d{2}[\/.-]\d{2}[\/.-]\d{4}\b/
    ];
    const LABELS = [
      'data zakonczenia kontraktu',
      'data zakonczenia umowy',
      'koniec kontraktu',
      'koniec umowy'
    ];
    const norm = (t) =>
      (t || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').trim();
    const isLabelMatch = (text) => LABELS.some(l => norm(text).includes(l));

    // стилі підсвітки і тулбар/модалки
    function injectDateStylesOnce() {
      if ($('#arval-date-styles')) return;
      const style = ce('style', { id: 'arval-date-styles' });
      style.textContent = `
        .arv-date--green  { color: #00965E; font-weight: 600; }
        .arv-date--yellow { color: #9b7d00; font-weight: 600; }
        .arv-date--red    { color: #b50000; font-weight: 700; }
        .arv-overdue { text-decoration: underline dotted; text-underline-offset: 2px; }
        .arv-overdue-icon { cursor: help; }
        .arv-toolbar { display:flex; align-items:center; gap:10px; margin:10px 0 6px; }
        .arv-btn { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:4px; border:1px solid #c9c9c9; background:#f5f5f5; cursor:pointer; user-select:none; }
        .arv-btn:hover { background:#016f46; }
        .arv-btn--primary { background:#00965E; color:#fff; border-color:#016f46; }
        .arv-btn--primary:hover { filter:brightness(0.95); }
        .arv-btn--ghost { background:transparent; }
        .arv-btn--active { outline:2px solid #00965E; }
        .arv-muted { opacity:.75; font-size:12px; }
        .arv-modal { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:9999; display:flex; }
        .arv-modal__panel { margin:auto; width:min(1200px, 96vw); max-height:90vh; background:#fff; border-radius:6px; box-shadow:0 10px 30px rgba(0,0,0,.25); display:flex; flex-direction:column; }
        .arv-modal__head { padding:12px 16px; border-bottom:1px solid #e5e5e5; display:flex; align-items:center; gap:12px; }
        .arv-modal__body { padding:12px 16px; overflow:auto; }
        .arv-table { width:100%; border-collapse:collapse; }
        .arv-table th, .arv-table td { border-bottom:1px solid #eee; padding:6px 8px; white-space:nowrap; }
        .arv-badge { font-size:12px; padding:2px 6px; border-radius:10px; background:#eee; }
      `;
      d.head.appendChild(style);
    }

    function normalizeDate(s) {
      if (!s) return s;
      s = s.trim();
      let m = s.match(/^(\d{4})[\/.-](\d{2})[\/.-](\d{2})$/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return s;
    }
    function parseISODate(iso) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) return null;
      return new Date(+m[1], +m[2]-1, +m[3]);
    }
    function diffInDays(from, to) {
      const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      return Math.floor((b - a) / 86400000);
    }
    function clearDateClasses(td) {
      td.classList.remove('arv-date--green','arv-date--yellow','arv-date--red','arv-overdue');
    }
    function applyDateStyling(td, isoDate) {
      clearDateClasses(td);
      if (!isoDate) { td.textContent = '—'; return; }
      const d0 = parseISODate(isoDate); if (!d0) return;
      const days = diffInDays(new Date(), d0);
      td.textContent = isoDate;
      if (days >= CFG.thresholds.green) {
        td.classList.add('arv-date--green');
      } else if (days >= CFG.thresholds.yellow) {
        td.classList.add('arv-date--yellow');
      } else {
        td.classList.add('arv-date--red');
        if (days < 0) {
          td.classList.add('arv-overdue');
          const icon = ce('span', { textContent: ' ⚠️', className: 'arv-overdue-icon' });
          icon.title = 'Kontrakt już się skończył';
          icon.setAttribute('aria-label', 'Kontrakt już się skończył');
          td.appendChild(icon);
        }
      }
    }

    function qs(sel, root=document) { return root.querySelector(sel); }
    function qsa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

    function isClaimsListUrl(href) {
      try {
        const u = new URL(href, location.href);
        return u.pathname.startsWith('/claims/insurancecase');
      } catch { return false; }
    }
    function onListPage() {
      if (!isClaimsListUrl(location.href)) return false;
      const title = qs('.pageTitle');
      if (title && PAGE_TITLE_TEXT.test(title.textContent || '')) return true;
      return !!findListTable();
    }

    function findListTable() {
      const candidates = qsa('table').filter(t => t.querySelector('thead th') && t.querySelector('tbody tr'));
      return candidates.find(t =>
        /Numer\s+szkody|Nr\s+rej|Data\s+szkody|Data\s+zlecenia/i
          .test((t.tHead?.innerText || t.innerText))
      ) || null;
    }
    function findListTableInDoc(doc) {
      const candidates = Array.from(doc.querySelectorAll('table'))
        .filter(t => t.querySelector('thead th') && t.querySelector('tbody tr'));
      return candidates.find(t =>
        /Numer\s+szkody|Nr\s+rej|Data\s+szkody|Data\s+zlecenia/i
          .test((t.tHead?.innerText || t.innerText || ''))
      ) || null;
    }

    function injectFilterUIOnce(table) {
      if (!table || $('#arv-toolbar')) return;
      const bar = ce('div', { id: 'arv-toolbar', className: 'arv-toolbar' });

      const onlyRedBtn = ce('button', {
        type: 'button', className: 'arv-btn arv-btn--ghost',
        innerHTML: 'Pokaż krytyczne daty <span class="arv-muted">(≤13 dni lub przeterminowane)</span>'
      });
      if (isOnlyRedEnabled()) onlyRedBtn.classList.add('arv-btn--active');
      onlyRedBtn.addEventListener('click', () => {
        const next = !isOnlyRedEnabled();
        setOnlyRedEnabled(next);
        onlyRedBtn.classList.toggle('arv-btn--active', next);
        applyFilterToAllRows();
      });

      const allRedBtn = ce('button', { type: 'button', className: 'arv-btn arv-btn--primary', textContent: 'Wszystkie krytyczne daty' });
      allRedBtn.addEventListener('click', () => showAllRedsModal());

      bar.appendChild(onlyRedBtn);
      bar.appendChild(allRedBtn);
      table.parentNode.insertBefore(bar, table);
    }

    function getPaginationUrls() {
      const links = new Set();
      $$('a[href*="/claims/insurancecase"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (/\/index\/page\/\d+/.test(href)) {
          const abs = toAbsUrl(href);
          if (abs) links.add(abs);
        }
      });
      links.add(location.href);
      return Array.from(links);
    }

    async function fetchListPage(url) {
      const abs = toAbsUrl(url); if (!abs) return [];
      const res = await fetch(abs, { credentials:'include', cache:'no-store', mode:'same-origin', headers:{ Accept:'text/html' } });
      if (!res.ok) return [];
      const html = await res.text();
      let doc; try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch { return []; }
      const table = findListTableInDoc(doc); if (!table) return [];
      const rows = Array.from(table.querySelectorAll('tbody tr')).filter(tr => tr.querySelector('td'));
      return rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => (td.textContent || '').trim());
        const linkEl = tr.querySelector('a[href*="/claims/insurancecase"]');
        const href = linkEl ? toAbsUrl(linkEl.getAttribute('href')) : null;
        let id = null;
        if (href) {
          const m1 = href.match(/\/id\/(\d+)/);
          const m2 = href.match(/[?&]id=(\d+)/);
          const m3 = href.match(/\/(\d+)(?:[#/?]|$)/);
          if (m1) id = m1[1]; else if (m2) id = m2[1]; else if (m3) id = m3[1];
        }
        return { id, href, cells };
      });
    }

    const LS_KEY = 'arval_contract_end_cache_v2';
    const cache = (function loadCache() {
      try { return new Map(Object.entries(JSON.parse(localStorage.getItem(LS_KEY) || '{}'))); }
      catch { return new Map(); }
    })();
    function saveCache() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(cache.entries()))); } catch {}
    }

    async function fetchContractEnd(detailsUrl) {
      try {
        const res = await fetch(detailsUrl, { credentials: 'include', cache: 'no-store', headers: { Accept: 'text/html' } });
        if (!res.ok) return null;
        const html = await res.text();
        return extractDateFromDetailsHTML(html); // {value,_src} або null
      } catch { return null; }
    }

    function extractDateFromDetailsHTML(html) {
      const emptyMarks = [/^\s*[–—-]\s*$/i, /^\s*brak\s*$/i, /^\s*$/];
      const clean = (s) => (s || '').replace(/\u00a0/g,' ').trim();

      // 1) JSON-like
      {
        const re = /"(?:koniec|zakonczen\w*|contractEnd|contract_end|endDate|end_date)"\s*:\s*"([^"]*)"/ig;
        let m;
        while ((m = re.exec(html)) !== null) {
          const raw = clean(m[1]);
          if (emptyMarks.some(rx => rx.test(raw))) return null;
          const n = normalizeDate(raw);
          if (DATE_RES.some(re2 => re2.test(n))) return { value:n, _src:'json-like' };
        }
      }

      // 2) Labeled cells
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table, .details, table.details, .table, .infoTable'));
      for (const table of tables) {
        const labels = Array.from(table.querySelectorAll('th, td.label, th.label, .label'));
        for (const th of labels) {
          if (!isLabelMatch(th.textContent)) continue;
          const valCell = th.nextElementSibling; if (!valCell) continue;
          const raw = clean(valCell.textContent);
          if (emptyMarks.some(rx => rx.test(raw))) return null;
          for (const re of DATE_RES) {
            const hit = raw.match(re);
            if (hit) return { value: normalizeDate(hit[0]), _src:'labeled-cell' };
          }
        }
      }

      // 3) Без фолбека "перша дата в документі"
      return null;
    }

    function ensureHeader(table) {
      const thead = table.tHead || table.createTHead();
      const row = thead.rows[0] || thead.insertRow();
      const exists = Array.from(row.cells).some(th => /koniec\s+kontraktu/i.test(th.textContent));
      if (!exists) {
        const th = ce('th', { textContent: 'Koniec kontraktu' });
        th.style.whiteSpace = 'nowrap';
        row.appendChild(th);
      }
      table.setAttribute(TABLE_MARK, '1');
    }
    function ensureCell(tr) {
      let td = tr.querySelector(`td[${CELL_MARK}]`);
      if (!td) {
        td = ce('td'); td.setAttribute(CELL_MARK, '1'); td.style.whiteSpace = 'nowrap'; td.textContent = '…';
        tr.appendChild(td);
      }
      return td;
    }

    const CASE_LINK_SELECTOR = 'a[href*="/claims/insurancecase/"]';
    function getClaimLinkAndId(tr) {
      const links = qsa(CASE_LINK_SELECTOR, tr);
      const a = links.find(x => {
        const h = (x.getAttribute('href') || '').toLowerCase();
        return /(\/info\/|\/details\/|\/view\/|\/show\/)/.test(h) || /id\/\d+/.test(h) || /[\?&]id=\d+/.test(h);
      }) || links[0];
      if (!a) return null;
      const href = toAbsUrl(a.getAttribute('href') || ''); if (!href) return null;
      let id = null;
      const m1 = href.match(/(?:^|\/)id\/(\d+)(?:[/?#]|$)/i);
      const m2 = href.match(/[?&]id=(\d+)/i);
      const m3 = new URL(href).pathname.split('/').reverse().find(seg => /^\d+$/.test(seg));
      if (m1) id = m1[1]; else if (m2) id = m2[1]; else if (m3) id = m3;
      return id ? { href, id } : null;
    }

    function parseISODateSafe(s){ try { return parseISODate(s); } catch { return null; } }
    function isDateRed(isoDate) {
      if (!isoDate) return false;
      const d0 = parseISODateSafe(isoDate); if (!d0) return false;
      const days = diffInDays(new Date(), d0);
      return days < CFG.thresholds.yellow; // ≤13 (і минуле) — "червоні"
    }

    function isOnlyRedEnabled(){ try { return localStorage.getItem(FILTER_KEY) === '1'; } catch { return false; } }
    function setOnlyRedEnabled(v){ try { localStorage.setItem(FILTER_KEY, v ? '1' : '0'); } catch {} }

    function getContractCell(tr) { return tr.querySelector(`td[${CELL_MARK}]`); }
    function isRowRed(tr) {
      const td = getContractCell(tr); return !!(td && td.classList.contains('arv-date--red'));
    }
    function applyRowVisibility(tr) {
      tr.style.display = isOnlyRedEnabled() ? (isRowRed(tr) ? '' : 'none') : '';
    }
    function applyFilterToAllRows() {
      const table = findListTable(); if (!table) return;
      const rows = Array.from(table.querySelectorAll('tbody tr')).filter(tr => tr.querySelector('td'));
      rows.forEach(applyRowVisibility);
    }

    async function ensureDateForCase(item) {
      if (!item.id || !item.href) return null;
      if (cache.has(item.id)) return cache.get(item.id);
      const out = await fetchContractEnd(item.href);
      let date = null;
      if (out && typeof out === 'object') date = out.value || null;
      else if (typeof out === 'string') date = normalizeDate(out);
      cache.set(item.id, date); saveCache();
      return date;
    }

    async function gatherAllRedCases() {
      const urls = getPaginationUrls();
      const out = [];
      for (const url of urls) {
        const items = await fetchListPage(url);
        for (const it of items) {
          const date = await ensureDateForCase(it);
          if (isDateRed(date)) out.push({ ...it, date });
        }
      }
      return out;
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

   function buildRedsTable(rows) {
  const wrap = ce('table', { className: 'arv-table' });
  wrap.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Sprawa</th>
        <th>Nr rej</th>
        <th>Dane auta</th>
        <th>Etap</th>
        <th>Koniec kontraktu</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tb = $('tbody', wrap);

  rows.forEach((it, i) => {
    const tr = ce('tr');
    const cells = it.cells;

    const nrSzkody = (cells[2] || '');
    const nrRej    = ''; // Поки що немає — можна додати, якщо буде в інших колонках
    const daneAuta = (cells[3] || '');
    const etap     = (cells[4] || '');
    const linkHtml = it.href ? `<a href="${it.href}" target="_blank">Otwórz</a>` : '-';

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(nrSzkody)}</td>
      <td>${escapeHtml(nrRej)}</td>
      <td>${escapeHtml(daneAuta)}</td>
      <td><span class="arv-badge">${escapeHtml(etap)}</span></td>
      <td class="arv-date--red" title="Kontrakt jest przeterminowany/≤13д">${it.date}</td>
      <td>${linkHtml}</td>
    `;
    tb.appendChild(tr);
  });

  return wrap;
}




    async function showAllRedsModal() {
      const modal = ce('div', { className:'arv-modal' });
      modal.innerHTML = `
        <div class="arv-modal__panel">
          <div class="arv-modal__head">
            <strong>Czerwone kontrakty — ze wszystkich stron</strong>
            <span class="arv-muted" id="arv-progress">Zbieram... Przyszłły Loader</span>
            <div style="margin-left:auto"></div>
            <button class="arv-btn" id="arv-close">Zamknąć</button>
          </div>
          <div class="arv-modal__body" id="arv-body"></div>
        </div>
      `;
      d.body.appendChild(modal);
      $('#arv-close', modal).addEventListener('click', () => modal.remove());

      const reds = await gatherAllRedCases();
      const body = $('#arv-body', modal);
      const progress = $('#arv-progress', modal);
      progress.textContent = `Znaleziono: ${reds.length}`;

      if (!reds.length) {
        body.innerHTML = '<div class="arv-muted">Brak "czerwonych" dat na dostępbych stronach.</div>';
        return;
      }
      body.appendChild(buildRedsTable(reds));
    }

    function ensureHeaderAndCells(table) {
      ensureHeader(table);
      const rows = qsa('tbody tr', table).filter(tr => tr.querySelector('td')).slice(0, MAX_ROWS_PER_RUN);
      for (const tr of rows) { if (!tr.hasAttribute(ROW_MARK)) ensureCell(tr); }
    }

    let isRunning = false;
    async function processTableOnce() {
      if (isRunning || !CFG.enableDateCol) return;
      isRunning = true;
      try {
        if (!onListPage()) return;
        const table = findListTable(); if (!table) return;

        ensureHeaderAndCells(table);

        const rows = qsa('tbody tr', table).filter(tr => tr.querySelector('td')).slice(0, MAX_ROWS_PER_RUN);
        for (const tr of rows) {
          if (tr.hasAttribute(ROW_MARK)) continue;
          const td = ensureCell(tr);
          const info = getClaimLinkAndId(tr);

          if (!info) {
            td.textContent = '—'; td.style.opacity = '0.6'; tr.setAttribute(ROW_MARK, '1');
            continue;
          }

          if (cache.has(info.id)) {
            const val = cache.get(info.id);
            td.textContent = val || '—';
            td.style.opacity = val ? '1' : '0.6';
            applyDateStyling(td, val);
            applyRowVisibility(tr);
            tr.setAttribute(ROW_MARK, '1');
            continue;
          }

          td.textContent = '…'; td.style.opacity = '0.6';
          const out = await fetchContractEnd(info.href);
          let date = null, src = null;
          if (out && typeof out === 'object') { date = out.value || null; src = out._src || null; }
          else if (typeof out === 'string') { date = normalizeDate(out); }

          cache.set(info.id, date); saveCache();
          td.textContent = date || '—';
          td.style.opacity = date ? '1' : '0.6';
          applyDateStyling(td, date);
          if (src) td.setAttribute('data-arval-src', src);
          applyRowVisibility(tr);
          tr.setAttribute(ROW_MARK, '1');
        }
      } finally {
        applyFilterToAllRows();
        isRunning = false;
      }
    }

    const runAfterNav = () => {
      setTimeout(processTableOnce, RUN_DELAY_1);
      setTimeout(processTableOnce, RUN_DELAY_2);
      setTimeout(applyFilterToAllRows, RUN_DELAY_2 + 200);
    };

    function hookNavigation() {
      d.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]'); if (!a) return;
        if (isClaimsListUrl(a.getAttribute('href') || '')) runAfterNav();
      }, true);

      d.addEventListener('submit', (e) => {
        const form = e.target;
        const action = (form && (form.getAttribute('action') || location.href)) || '';
        if (isClaimsListUrl(action)) runAfterNav();
      }, true);

      addEventListener('popstate', runAfterNav, true);
    }

    function hookTableObserver() {
      const table = findListTable();
      const tbody = table?.querySelector('tbody'); if (!tbody) return;
      const obs = new MutationObserver(debounce(() => {
        processTableOnce();
        injectFilterUIOnce(table);
        applyFilterToAllRows();
      }, CFG.debounceMs));
      obs.observe(tbody, { childList: true, subtree: true });
    }

    function ensureHeaderToolbar() {
      const table = findListTable();
      if (!table) return;
      injectFilterUIOnce(table);
    }

    function init() {
      if (!CFG.enableDateCol) return;
      if (!onListPage()) return;
      injectDateStylesOnce();
      ensureHeaderToolbar();
      hookNavigation();
      hookTableObserver();
      processTableOnce();
      runAfterNav();
    }

    // publiczny trygier do SPA
    const trigger = () => init();

    return { init, trigger };
  })();

  /***************************************************************************
   * BOOT
   ***************************************************************************/
  // Wyświetla menu bez mrugnięcia
  MenuHider.initOnce();
  MenuHider.rearm();

  // Daty - gdy DOM zgenerowany (za każdym razem przy SPA-nawigacji przez trigger)
  const bootDates = () => DateCol.init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootDates, { once: true });
  } else {
    bootDates();
  }
})();
