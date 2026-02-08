// ==UserScript==
// @name         Arval Stealth — unified (menu hide + contract end dates)
// @namespace    https://github.com/Phill1983/Arval-Stealth-user-script
// @version      4.2.3
// @description  Automatyzacja roboty z Arval
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
  "use strict";

  /***************************************************************************
   * CONFIG
   ***************************************************************************/
  const CFG = {
    enableMenuHide: true,
    enableDateCol: true,
    debounceMs: 150,
    // Zakresy do kolorów
    thresholds: { green: 30, yellow: 14 }, // ≥30 zielony, 14–29 żółty, ≤13 czerwony
  };

  /***************************************************************************
   * UTILS
   ***************************************************************************/
  const d = document,
    docEl = d.documentElement;
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const ce = (t, props) => Object.assign(d.createElement(t), props || {});
  const debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
  }

  const toAbsUrl = (href) => {
    if (!href) return null;
    try {
      return new URL(href, location.href).href;
    } catch {}
    try {
      const a = ce("a", { href });
      return a.href || null;
    } catch {
      return null;
    }
  };

  // ==== BNP Paribas Loader (всередині модалки) ====
  function showBNPLoader(container) {
    if (!container || container.querySelector("#bnp-loader")) return;

    const wrap = document.createElement("div");
    wrap.id = "bnp-loader";
    wrap.innerHTML = `
  <div class="bnp-square">
    <div class="bird"><div class="star"></div></div>
    <div class="bird"><div class="star"></div></div>
    <div class="bird"><div class="star"></div></div>
    <div class="bird"><div class="star"></div></div>
  </div>`;

    const style = document.createElement("style");
    style.id = "bnp-loader-style";
    style.textContent = `
  #bnp-loader {
    display:flex;
    align-items:center;
    justify-content:center;
    padding:40px 0;
  }

  /* контейнер для 3D */
.bnp-square{
  position:relative;
  width:120px;height:120px;border-radius:8px;overflow:hidden;
  background:linear-gradient(180deg,#01d284 20%,#00854b 100%);
  perspective: 300px;           /* додаємо перспективу для 3D */
}
.bnp-square::after{
  content:"";position:absolute;inset:4px;border:1.5px solid rgba(255,255,255,.9);
  border-radius:6px;pointer-events:none;box-sizing:border-box;
}

/* обгортка, яка летить по дузі й орієнтується вздовж маршруту */
.bird{
  position:absolute;opacity:0;
  offset-path: path("M 80 90 C 0 120, -7 45, 100 15"); /* піднята та округліша дуга */
  offset-rotate: auto;                                  /* вісі елемента уздовж траєкторії */
  animation: bnp-fly 3.5s ease-in-out infinite;
  transform-style: preserve-3d;                         /* щоб діти мали 3D */
}

/* власне зірка всередині: крутиться навколо локальної осі X (вздовж руху) */
.star{
  width:24px;height:14px;background:#fff;
  clip-path: polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
  filter: drop-shadow(0 0 2px #fff8) drop-shadow(0 0 4px #fff5);
  transform-origin: 50% 50%;
  animation: star-roll 10s ease-in-out infinite; /* окрема X-ротація */
}

/* зсув стартів */
.bird:nth-child(2){animation-delay:.35s}
.bird:nth-child(3){animation-delay:.7s}
.bird:nth-child(4){animation-delay:1.05s}

/* політ + масштаб + прозорість (обертання навколо осі руху ми даємо на .star) */
@keyframes bnp-fly{
  0%   { offset-distance:0%;   transform: scale(0.6) rotate(0deg);  opacity:0 }
  10%  {                       transform: scale(0.8) rotate(8deg);  opacity:.95 }
  40%  {                       transform: scale(1.2) rotate(18deg); opacity:1 }
  70%  {                       transform: scale(1.6) rotate(28deg); opacity:.9 }
  100% { offset-distance:100%; transform: scale(2.0) rotate(36deg); opacity:0 }
}

/* кручення навколо локальної осі X (вздовж траєкторії) */
/* 1) Посилена послідовна ротація: бурст між 35% і 65% */
@keyframes star-roll {
  0%   { transform: rotateX(0deg)    rotateZ(0deg); }
  20%  { transform: rotateX(216deg)  rotateZ(40deg); }
  35%  { transform: rotateX(360deg)  rotateZ(90deg); }   /* початок бурсту */
  50%  { transform: rotateX(540deg)  rotateZ(220deg); }  /* 🌬️ пік «вітру» */
  65%  { transform: rotateX(720deg)  rotateZ(300deg); }  /* кінець бурсту */
  80%  { transform: rotateX(864deg)  rotateZ(330deg); }
  100% { transform: rotateX(1080deg) rotateZ(360deg); }  /* 1 оберт Z за цикл */
}

/* 2) Зсув фази для кожної зірки — по черзі «крутить бурст» */
.bird:nth-child(1) .star { animation-delay: 0s; }          /* 0/4 циклу */
.bird:nth-child(2) .star { animation-delay: 0.875s; }      /* 1/4 від 3.5s */
.bird:nth-child(3) .star { animation-delay: 1.75s; }       /* 2/4 */
.bird:nth-child(4) .star { animation-delay: 2.625s; }      /* 3/4 */

/* якщо десь стояли інші затримки для .star — прибери їх.
   На самій .star має бути: animation: star-roll 3.5s ease-in-out infinite; */


/* fallback без offset-path */
@supports not (offset-path:path("M0,0 L10,10")){
  .bird{ animation: bnp-fly-fallback 3.5s ease-in-out infinite }
  @keyframes bnp-fly-fallback{
    0%   { transform: translate(0,0)    scale(0.6);  opacity:0 }
    50%  { transform: translate(-60px,-30px) scale(1.2); opacity:1 }
    100% { transform: translate(40px,-90px)  scale(2.0); opacity:0 }
  }
  /* X-обертання зірки лишається тим самим */
}


  /* fallback */
  @supports not (offset-path:path("M0,0 L10,10")) {
    .bird { animation:bnp-fly-fallback 3.2s linear infinite; }
    @keyframes bnp-fly-fallback {
      0%   { transform:translate(0,0) scale(.5) rotate(0deg);  opacity:0 }
      50%  { transform:translate(-60px,-20px) scale(1.1) rotate(25deg); opacity:1 }
      100% { transform:translate(40px,-90px) scale(1.7) rotate(45deg); opacity:0 }
    }
  }
`;

    document.head.appendChild(style);
    container.innerHTML = "";
    container.appendChild(wrap);
  }
  function hideBNPLoader(container) {
    container?.querySelector("#bnp-loader")?.remove();
    document.getElementById("bnp-loader-style")?.remove();
  }
  // ==== /BNP Loader ====

  /***************************************************************************
   * MODULE A: MENU HIDER (ze ckryptu 0.3.6)
   ***************************************************************************/

  const MenuHider = (() => {
    const SIDEBAR_SELECTORS = [
      ".left-column.large-2.medium-3.columns",
      ".left-column",
      ".sidebar",
      "#sidebar",
      '[data-role="sidebar"]',
    ];
    const MAIN_SELECTORS = [
      ".right-column.large-10.medium-9.columns",
      ".right-column",
      ".large-10.medium-9.columns",
      "main",
      ".columns:not(.left-column)",
    ];
    const IDS = { style: "arval-collapsible-style", btn: "arval-toggle-btn" };
    const ATTR = "data-arval-collapsed";
    const LSK = "arvalCollapsed";

    function ensureStyle() {
      if ($("#" + IDS.style)) return;
      const css = [
        "[data-arval-left]{transition:transform .2s ease,width .2s ease,min-width .2s ease}",
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
        `@media screen and (min-width:40em){:root[${ATTR}="1"] [data-arval-main].medium-9{width:100%!important}}`,
      ].join("");
      const st = ce("style", { id: IDS.style, textContent: css });
      st.dataset.from = "arval-safe";
      docEl.appendChild(st);
    }

    function findSidebar() {
      const marked = $("[data-arval-left]");
      if (marked) return marked;
      for (const s of SIDEBAR_SELECTORS) {
        const el = $(s);
        if (el) {
          el.setAttribute("data-arval-left", "1");
          return el;
        }
      }
      return null;
    }
    function findMain(sidebar) {
      if (sidebar && sidebar.parentElement) {
        const cand = [
          ...sidebar.parentElement.querySelectorAll(".columns"),
        ].find((c) => c !== sidebar);
        if (cand) {
          cand.setAttribute("data-arval-main", "1");
          return cand;
        }
      }
      const marked = $("[data-arval-main]");
      if (marked) return marked;
      for (const s of MAIN_SELECTORS) {
        const el = $(s);
        if (el) {
          el.setAttribute("data-arval-main", "1");
          return el;
        }
      }
      return null;
    }

    function ensureButton() {
      if ($("#" + IDS.btn)) return;
      const initial = load() === "1";
      const b = ce("button", {
        id: IDS.btn,
        title: "Zchować/Pokazać menu",
        "aria-label": "Toggle sidebar",
        "aria-pressed": initial ? "true" : "false",
      });
      b.addEventListener("click", () => {
        const v = docEl.getAttribute(ATTR) === "1" ? "0" : "1";
        apply(v);
      });
      docEl.appendChild(b);
    }

    function save(v) {
      try {
        localStorage.setItem(LSK, v);
      } catch {}
    }
    function load() {
      try {
        return localStorage.getItem(LSK) || "0";
      } catch {
        return "0";
      }
    }
    function apply(v) {
      const val = v === "1" ? "1" : "0";
      docEl.setAttribute(ATTR, val);
      const b = $("#" + IDS.btn);
      if (b) b.setAttribute("aria-pressed", val === "1" ? "true" : "false");
      save(val);
    }

    // SPA-FRIENDLY
    let armed = false,
      lastUrl = location.href,
      rescanTO = null;

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
        setTimeout(() => {
          initOnce();
          DateCol.trigger();
        }, 60);
      }
    }
    function rearm() {
      if (armed) return;
      armed = true;
      const ps = history.pushState,
        rs = history.replaceState;
      const ping = () => setTimeout(checkUrlChange, 0);
      history.pushState = function () {
        const r = ps.apply(this, arguments);
        ping();
        return r;
      };
      history.replaceState = function () {
        const r = rs.apply(this, arguments);
        ping();
        return r;
      };
      addEventListener("popstate", ping);
      new MutationObserver(() => {
        clearTimeout(rescanTO);
        rescanTO = setTimeout(() => initOnce(), 120);
      }).observe(d.documentElement, { childList: true, subtree: true });
    }

    return { initOnce, rearm };
  })();

  /***************************************************************************
   * MODULE B: DATE COLUMN (stabilna v4.0.1)
   ***************************************************************************/
  const DateCol = (() => {
    const PAGE_TITLE_TEXT = /Przeglądaj\s+sprawy\s+ubezpieczeniowe/i;
    const TABLE_MARK = "data-arval-kolumny";
    const CELL_MARK = "data-arval-kontrakt-cell";
    const ROW_MARK = "data-arval-kontrakt-done";
    const FILTER_KEY = "arval_only_red_filter_v1";
    const MAX_ROWS_PER_RUN = 400;
    const RUN_DELAY_1 = 600;
    const RUN_DELAY_2 = 1500;

    const DATE_RES = [
      /\b\d{4}[\/.-]\d{2}[\/.-]\d{2}\b/,
      /\b\d{2}[\/.-]\d{2}[\/.-]\d{4}\b/,
    ];
    const LABELS = [
      "data zakonczenia kontraktu",
      "data zakonczenia umowy",
      "koniec kontraktu",
      "koniec umowy",
    ];
    const norm = (t) =>
      (t || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const isLabelMatch = (text) => LABELS.some((l) => norm(text).includes(l));

    // стилі підсвітки і тулбар/модалки
    function injectDateStylesOnce() {
      if ($("#arval-date-styles")) return;
      const style = ce("style", { id: "arval-date-styles" });
      style.textContent = `
        .arv-date--green  { color: #00965E; font-weight: 600; }
        .arv-date--yellow { color: #9b7d00; font-weight: 600; }
        .arv-date--red    { color: #b50000; font-weight: 700; }
        .arv-overdue { text-decoration: underline dotted; text-underline-offset: 2px; }
        .arv-overdue-icon { cursor: help; }
        .arv-toolbar { display:flex; align-items:center; gap:10px; margin:10px 0 10px; }
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
        :root.arv-modal-open { overflow: hidden; }
        .arv-modal { overscroll-behavior: none; }
        .arv-modal__body { overflow: auto; overscroll-behavior: contain; }

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
      return new Date(+m[1], +m[2] - 1, +m[3]);
    }
    function diffInDays(from, to) {
      const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      return Math.floor((b - a) / 86400000);
    }
    function clearDateClasses(td) {
      td.classList.remove(
        "arv-date--green",
        "arv-date--yellow",
        "arv-date--red",
        "arv-overdue",
      );
    }
    function applyDateStyling(td, isoDate) {
      clearDateClasses(td);
      if (!isoDate) {
        td.textContent = "—";
        return;
      }
      const d0 = parseISODate(isoDate);
      if (!d0) return;
      const days = diffInDays(new Date(), d0);
      td.textContent = isoDate;
      if (days >= CFG.thresholds.green) {
        td.classList.add("arv-date--green");
      } else if (days >= CFG.thresholds.yellow) {
        td.classList.add("arv-date--yellow");
      } else {
        td.classList.add("arv-date--red");
        if (days < 0) {
          td.classList.add("arv-overdue");
          const icon = ce("span", {
            textContent: " ⚠️",
            className: "arv-overdue-icon",
          });
          icon.title = "Kontrakt już się skończył";
          icon.setAttribute("aria-label", "Kontrakt już się skończył");
          td.appendChild(icon);
        }
      }
    }

    function qs(sel, root = document) {
      return root.querySelector(sel);
    }
    function qsa(sel, root = document) {
      return Array.from(root.querySelectorAll(sel));
    }

    function isClaimsListUrl(href) {
      try {
        const u = new URL(href, location.href);
        return u.pathname.startsWith("/claims/insurancecase");
      } catch {
        return false;
      }
    }
    function onListPage() {
      if (!isClaimsListUrl(location.href)) return false;
      const title = qs(".pageTitle");
      if (title && PAGE_TITLE_TEXT.test(title.textContent || "")) return true;
      return !!findListTable();
    }

    function findListTable() {
      const candidates = qsa("table").filter(
        (t) => t.querySelector("thead th") && t.querySelector("tbody tr"),
      );
      return (
        candidates.find((t) =>
          /Numer\s+szkody|Nr\s+rej|Data\s+szkody|Data\s+zlecenia/i.test(
            t.tHead?.innerText || t.innerText,
          ),
        ) || null
      );
    }
    function findListTableInDoc(doc) {
      const candidates = Array.from(doc.querySelectorAll("table")).filter(
        (t) => t.querySelector("thead th") && t.querySelector("tbody tr"),
      );
      return (
        candidates.find((t) =>
          /Numer\s+szkody|Nr\s+rej|Data\s+szkody|Data\s+zlecenia/i.test(
            t.tHead?.innerText || t.innerText || "",
          ),
        ) || null
      );
    }

    function injectFilterUIOnce(table) {
      if (!table || $("#arv-toolbar")) return;
      const bar = ce("div", { id: "arv-toolbar", className: "arv-toolbar" });

      const onlyRedBtn = ce("button", {
        type: "button",
        className: "arv-btn arv-btn--ghost",
        innerHTML:
          'Pokaż krytyczne daty <span class="arv-muted">(≤13 dni lub przeterminowane)</span>',
      });
      if (isOnlyRedEnabled()) onlyRedBtn.classList.add("arv-btn--active");
      onlyRedBtn.addEventListener("click", () => {
        const next = !isOnlyRedEnabled();
        setOnlyRedEnabled(next);
        onlyRedBtn.classList.toggle("arv-btn--active", next);
        applyFilterToAllRows();
      });

      const allRedBtn = ce("button", {
        type: "button",
        className: "arv-btn arv-btn--primary",
        textContent: "Wszystkie krytyczne daty",
      });
      allRedBtn.addEventListener("click", () => showAllRedsModal());

      bar.appendChild(onlyRedBtn);
      bar.appendChild(allRedBtn);
      table.parentNode.insertBefore(bar, table);
    }

    function getPaginationUrls() {
      const links = new Set();

      $$('a[href*="/claims/insurancecase"]').forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (/\/index\/page\/\d+/.test(href)) {
          const abs = toAbsUrl(href);
          if (abs) links.add(abs);
        }
      });

      links.add(location.href);

      const cleaned = new Map();
      for (const link of links) {
        const m = link.match(/\/page\/(\d+)/);
        const pageNum = m ? m[1] : "1";
        cleaned.set(pageNum, link);
      }

      return Array.from(cleaned.values()).sort((a, b) => {
        const pa = +(a.match(/\/page\/(\d+)/)?.[1] || 1);
        const pb = +(b.match(/\/page\/(\d+)/)?.[1] || 1);
        return pa - pb;
      });
    }

    async function fetchListPage(url) {
      const abs = toAbsUrl(url);
      if (!abs) return [];

      const res = await fetch(abs, {
        credentials: "include",
        cache: "no-store",
        mode: "same-origin",
        headers: { Accept: "text/html" },
      });

      if (!res.ok) return [];

      const html = await res.text();
      let doc;
      try {
        doc = new DOMParser().parseFromString(html, "text/html");
      } catch {
        return [];
      }

      const table = findListTableInDoc(doc);
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll("tbody tr")).filter((tr) =>
        tr.querySelector("td"),
      );

      const seen = new Set();
      const uniqueRows = [];

      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
          (td.textContent || "").trim(),
        );
        const linkEl = tr.querySelector('a[href*="/claims/insurancecase"]');
        const href = linkEl ? toAbsUrl(linkEl.getAttribute("href")) : null;

        let id = null;
        if (href) {
          const m1 = href.match(/\/id\/(\d+)/);
          const m2 = href.match(/[?&]id=(\d+)/);
          const m3 = href.match(/\/(\d+)(?:[#/?]|$)/);
          if (m1) id = m1[1];
          else if (m2) id = m2[1];
          else if (m3) id = m3[1];
        }

        const key = id || href || JSON.stringify(cells);

        if (!seen.has(key)) {
          seen.add(key);
          uniqueRows.push({ id, href, cells });
        }
      }

      console.log(
        `✅ ${abs} → знайдено: ${rows.length}, унікальних: ${uniqueRows.length}`,
      );

      return uniqueRows;
    }

    const LS_KEY = "arval_contract_end_cache_v2";
    const cache = (function loadCache() {
      try {
        return new Map(
          Object.entries(JSON.parse(localStorage.getItem(LS_KEY) || "{}")),
        );
      } catch {
        return new Map();
      }
    })();
    function saveCache() {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify(Object.fromEntries(cache.entries())),
        );
      } catch {}
    }

    async function fetchContractEnd(detailsUrl) {
      try {
        const res = await fetch(detailsUrl, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "text/html" },
        });
        if (!res.ok) return null;
        const html = await res.text();
        return extractDateFromDetailsHTML(html);
      } catch {
        return null;
      }
    }

    function extractDateFromDetailsHTML(html) {
      const emptyMarks = [/^\s*[–—-]\s*$/i, /^\s*brak\s*$/i, /^\s*$/];
      const clean = (s) => (s || "").replace(/\u00a0/g, " ").trim();

      {
        const re =
          /"(?:koniec|zakonczen\w*|contractEnd|contract_end|endDate|end_date)"\s*:\s*"([^"]*)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
          const raw = clean(m[1]);
          if (emptyMarks.some((rx) => rx.test(raw))) return null;
          const n = normalizeDate(raw);
          if (DATE_RES.some((re2) => re2.test(n)))
            return { value: n, _src: "json-like" };
        }
      }

      const doc = new DOMParser().parseFromString(html, "text/html");
      const tables = Array.from(
        doc.querySelectorAll(
          "table, .details, table.details, .table, .infoTable",
        ),
      );
      for (const table of tables) {
        const labels = Array.from(
          table.querySelectorAll("th, td.label, th.label, .label"),
        );
        for (const th of labels) {
          if (!isLabelMatch(th.textContent)) continue;
          const valCell = th.nextElementSibling;
          if (!valCell) continue;
          const raw = clean(valCell.textContent);
          if (emptyMarks.some((rx) => rx.test(raw))) return null;
          for (const re of DATE_RES) {
            const hit = raw.match(re);
            if (hit)
              return { value: normalizeDate(hit[0]), _src: "labeled-cell" };
          }
        }
      }

      return null;
    }

    function ensureHeader(table) {
      const thead = table.tHead || table.createTHead();
      const row = thead.rows[0] || thead.insertRow();
      const exists = Array.from(row.cells).some((th) =>
        /koniec\s+kontraktu/i.test(th.textContent),
      );
      if (!exists) {
        const th = ce("th", { textContent: "Koniec kontraktu" });
        th.style.whiteSpace = "nowrap";
        row.appendChild(th);
      }
      table.setAttribute(TABLE_MARK, "1");
    }
    function ensureCell(tr) {
      let td = tr.querySelector(`td[${CELL_MARK}]`);
      if (!td) {
        td = ce("td");
        td.setAttribute(CELL_MARK, "1");
        td.style.whiteSpace = "nowrap";
        td.textContent = "…";
        tr.appendChild(td);
      }
      return td;
    }

    const CASE_LINK_SELECTOR = 'a[href*="/claims/insurancecase/"]';
    function getClaimLinkAndId(tr) {
      const links = qsa(CASE_LINK_SELECTOR, tr);
      const a =
        links.find((x) => {
          const h = (x.getAttribute("href") || "").toLowerCase();
          return (
            /(\/info\/|\/details\/|\/view\/|\/show\/)/.test(h) ||
            /id\/\d+/.test(h) ||
            /[\?&]id=\d+/.test(h)
          );
        }) || links[0];
      if (!a) return null;
      const href = toAbsUrl(a.getAttribute("href") || "");
      if (!href) return null;
      let id = null;
      const m1 = href.match(/(?:^|\/)id\/(\d+)(?:[/?#]|$)/i);
      const m2 = href.match(/[?&]id=(\d+)/i);
      const m3 = new URL(href).pathname
        .split("/")
        .reverse()
        .find((seg) => /^\d+$/.test(seg));
      if (m1) id = m1[1];
      else if (m2) id = m2[1];
      else if (m3) id = m3;
      return id ? { href, id } : null;
    }

    function parseISODateSafe(s) {
      try {
        return parseISODate(s);
      } catch {
        return null;
      }
    }
    function isDateRed(isoDate) {
      if (!isoDate) return false;
      const d0 = parseISODateSafe(isoDate);
      if (!d0) return false;
      const days = diffInDays(new Date(), d0);
      return days < CFG.thresholds.yellow;
    }

    function isOnlyRedEnabled() {
      try {
        return localStorage.getItem(FILTER_KEY) === "1";
      } catch {
        return false;
      }
    }
    function setOnlyRedEnabled(v) {
      try {
        localStorage.setItem(FILTER_KEY, v ? "1" : "0");
      } catch {}
    }

    function getContractCell(tr) {
      return tr.querySelector(`td[${CELL_MARK}]`);
    }
    function isRowRed(tr) {
      const td = getContractCell(tr);
      return !!(td && td.classList.contains("arv-date--red"));
    }
    function applyRowVisibility(tr) {
      tr.style.display = isOnlyRedEnabled() ? (isRowRed(tr) ? "" : "none") : "";
    }
    function applyFilterToAllRows() {
      const table = findListTable();
      if (!table) return;
      const rows = Array.from(table.querySelectorAll("tbody tr")).filter((tr) =>
        tr.querySelector("td"),
      );
      rows.forEach(applyRowVisibility);
    }

    async function ensureDateForCase(item) {
      if (!item.id || !item.href) return null;
      if (cache.has(item.id)) return cache.get(item.id);
      const out = await fetchContractEnd(item.href);
      let date = null;
      if (out && typeof out === "object") date = out.value || null;
      else if (typeof out === "string") date = normalizeDate(out);
      cache.set(item.id, date);
      saveCache();
      return date;
    }

    async function gatherAllRedCases() {
      try {
        localStorage.removeItem("arval_contract_end_cache_v1");
      } catch {}
      try {
        localStorage.removeItem("arval_contract_end_cache_v2");
      } catch {}

      const urls = getPaginationUrls();
      const out = [];
      const seen = new Set();

      for (const url of urls) {
        const items = await fetchListPage(url);
        for (const it of items) {
          if (!it.id) continue;
          if (seen.has(it.id)) continue;
          seen.add(it.id);

          const date = await ensureDateForCase(it);
          if (!date) continue;
          if (isDateRed(date)) out.push({ ...it, date });
        }
      }

      out.sort((a, b) => (a.date > b.date ? 1 : -1));
      return out;
    }

    async function showAllRedsModal() {
      const modal = ce("div", { className: "arv-modal" });
      modal.innerHTML = `
    <div class="arv-modal__panel">
      <div class="arv-modal__head">
        <strong>Czerwone kontrakty — ze wszystkich stron</strong>
        <div style="margin-left:auto"></div>
        <button class="arv-btn" id="arv-close">Zamknąć</button>
      </div>
      <div class="arv-modal__body" id="arv-body"></div>
    </div>`;
      d.body.appendChild(modal);
      document.documentElement.classList.add("arv-modal-open");

      $("#arv-close", modal).addEventListener("click", () => {
        modal.remove();
        document.documentElement.classList.remove("arv-modal-open");
      });

      const body = $("#arv-body", modal);
      showBNPLoader(body);

      try {
        const reds = await gatherAllRedCases();
        const filtered = reds.filter((it) => {
          const text = (it.cells || []).join(" ").toLowerCase();
          return !text.includes("zlecenie zamknięte");
        });

        hideBNPLoader(body);

        if (!filtered.length) {
          body.innerHTML =
            '<div class="arv-muted">Brak "czerwonych" dat na dostępnych stronach.</div>';
          return;
        }

        body.appendChild(buildRedsTable(filtered));
      } catch (err) {
        console.error("Wystąpił błąd filtracji spraw:", err);
        hideBNPLoader(body);
        body.innerHTML =
          '<div class="arv-muted">Wystąpił błąd podczas zbierania danych.</div>';
      }
    }

    // function escapeHtml(s) {
    //   return String(s || "").replace(
    //     /[&<>"']/g,
    //     (m) =>
    //       ({
    //         "&": "&amp;",
    //         "<": "&lt;",
    //         ">": "&gt;",
    //         '"': "&quot;",
    //         "'": "&#39;",
    //       })[m],
    //   );
    // }

    function buildRedsTable(rows) {
      const wrap = ce("table", { className: "arv-table" });
      wrap.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Sprawa</th>
        <th>Nr rej</th>
        <th>Klient</th>
        <th>Etap</th>
        <th>Pracownik warsztatu</th>
        <th>Koniec kontraktu</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

      const tb = $("tbody", wrap);

      const shorten = (text, maxLen = 30) => {
        if (!text) return "";
        text = text.trim();
        return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
      };

      rows.forEach((it, i) => {
        try {
          const tr = ce("tr");
          const cells = it.cells || [];

          const nrSzkody = shorten(cells[2] || cells[1] || "");
          const nrRej = shorten(cells[3] || "");
          const klient = shorten(cells[4] || cells[5] || "");
          const etap = shorten(cells[11] || cells[10] || cells[9] || "");
          const pracownik = shorten(
            cells[15] || cells[14] || cells[cells.length - 3] || "",
          );

          const linkHtml = it.href
            ? `<a href="${escapeAttr(it.href)}" target="_blank" rel="noopener noreferrer">Otwórz</a>`
            : "-";

          tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(nrSzkody)}</td>
        <td title="${escapeHtml(cells[3] || "")}">${escapeHtml(nrRej)}</td>
        <td title="${escapeHtml(cells[4] || "")}">${escapeHtml(klient)}</td>
        <td><span class="arv-badge">${escapeHtml(etap)}</span></td>
        <td>${escapeHtml(pracownik)}</td>
        <td class="arv-date--red" title="Kontrakt jest przeterminowany/≤13 dni">${it.date}</td>
        <td>${linkHtml}</td>
      `;

          tb.appendChild(tr);
        } catch (err) {
          console.warn("⚠️ buildRedsTable error for row:", it, err);
        }
      });

      return wrap;
    }

    function ensureHeaderAndCells(table) {
      ensureHeader(table);
      const rows = qsa("tbody tr", table)
        .filter((tr) => tr.querySelector("td"))
        .slice(0, MAX_ROWS_PER_RUN);
      for (const tr of rows) {
        if (!tr.hasAttribute(ROW_MARK)) ensureCell(tr);
      }
    }

    let isRunning = false;
    async function processTableOnce() {
      if (isRunning || !CFG.enableDateCol) return;
      isRunning = true;
      try {
        if (!onListPage()) return;
        const table = findListTable();
        if (!table) return;

        ensureHeaderAndCells(table);

        const rows = qsa("tbody tr", table)
          .filter((tr) => tr.querySelector("td"))
          .slice(0, MAX_ROWS_PER_RUN);
        for (const tr of rows) {
          if (tr.hasAttribute(ROW_MARK)) continue;
          const td = ensureCell(tr);
          const info = getClaimLinkAndId(tr);

          if (!info) {
            td.textContent = "—";
            td.style.opacity = "0.6";
            tr.setAttribute(ROW_MARK, "1");
            continue;
          }

          if (cache.has(info.id)) {
            const val = cache.get(info.id);
            td.textContent = val || "—";
            td.style.opacity = val ? "1" : "0.6";
            applyDateStyling(td, val);
            applyRowVisibility(tr);
            tr.setAttribute(ROW_MARK, "1");
            continue;
          }

          td.textContent = "…";
          td.style.opacity = "0.6";
          const out = await fetchContractEnd(info.href);
          let date = null,
            src = null;
          if (out && typeof out === "object") {
            date = out.value || null;
            src = out._src || null;
          } else if (typeof out === "string") {
            date = normalizeDate(out);
          }

          cache.set(info.id, date);
          saveCache();
          td.textContent = date || "—";
          td.style.opacity = date ? "1" : "0.6";
          applyDateStyling(td, date);
          if (src) td.setAttribute("data-arval-src", src);
          applyRowVisibility(tr);
          tr.setAttribute(ROW_MARK, "1");
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
      d.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest("a[href]");
          if (!a) return;
          if (isClaimsListUrl(a.getAttribute("href") || "")) runAfterNav();
        },
        true,
      );

      d.addEventListener(
        "submit",
        (e) => {
          const form = e.target;
          const action =
            (form && (form.getAttribute("action") || location.href)) || "";
          if (isClaimsListUrl(action)) runAfterNav();
        },
        true,
      );

      addEventListener("popstate", runAfterNav, true);
    }

    function hookTableObserver() {
      const table = findListTable();
      const tbody = table?.querySelector("tbody");
      if (!tbody) return;
      const obs = new MutationObserver(
        debounce(() => {
          processTableOnce();
          injectFilterUIOnce(table);
          applyFilterToAllRows();
        }, CFG.debounceMs),
      );
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

    const trigger = () => init();

    return { init, trigger };
  })();

  /***************************************************************************
   * MODULE C: CHAT TOOLS — стабільна версія з polling
   ***************************************************************************/
  const ChatTools = (() => {
    const BTN_ID = "arval-chat-auto-archive-btn";

    function findModal() {
      const modals = document.querySelectorAll(".reveal.small");
      for (const modal of modals) {
        const header = modal.querySelector("h3, h2, h1, .ui-draggable-handle");
        if (!header) continue;

        const txt = (header.textContent || "").trim().toLowerCase();
        if (txt.includes("komunikator")) return modal;
      }
      return null;
    }

    function getCaseId(modal) {
      if (!modal) return null;

      const form = modal.querySelector(
        'form[action*="/claims/insurancecase/chat/"]',
      );
      if (form) {
        const action = form.getAttribute("action") || "";
        const m = action.match(/\/id\/(\d+)/);
        if (m) return m[1];
      }
      return null;
    }

    function getPlateFromModal(modal) {
      if (!modal) return null;

      const header = modal.querySelector("h3, h2, h1, .ui-draggable-handle");
      const txt = (header?.textContent || "").trim();

      const m = txt.match(/\b[A-Z0-9]{5,10}\b/);
      return m ? m[0] : null;
    }

    function extractNotifPreviewFromTr(tr) {
      const tds = Array.from(tr.querySelectorAll("td"));
      const text = (tds[1]?.textContent || tr.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      const date = (tds[2]?.textContent || "").replace(/\s+/g, " ").trim();
      return { text, date };
    }

    function hideOriginalArchiveButton(modal) {
      const btn = Array.from(
        modal.querySelectorAll("a.button.small.secondary"),
      ).find(
        (a) =>
          (a.textContent || "").trim().toLowerCase() ===
          "archiwizuj powiadomienia dot. tej sprawy",
      );

      if (btn) {
        btn.style.display = "none";
        console.log(
          "%c[Arval Stealth] Сховав оригінальну кнопку архівації",
          "color:orange",
        );
      }
    }

    function injectButton(modal) {
      if (!modal) return;

      const footer = modal.querySelector(".button-group");
      if (!footer) return;

      if (footer.querySelector("#" + BTN_ID)) return;

      const btn = document.createElement("button");
      btn.id = BTN_ID;
      btn.type = "button";
      btn.className = "button small success";
      btn.textContent = "Auto-archiwizacja";

      btn.addEventListener("click", async () => {
        const id = getCaseId(modal);
        if (!id) {
          alert("Nie mogę odczytać ID sprawy.");
          return;
        }

        await autoArchiveNotifications(id, modal);
      });

      footer.appendChild(btn);
      console.log("%c[Arval Stealth] Кнопка вставлена", "color:lime");
    }

    function init() {
      console.log("%c[Arval Stealth] ChatTools v3 запущeno", "color:cyan");

      setInterval(() => {
        const modal = findModal();
        if (!modal) return;

        injectButton(modal);
        hideOriginalArchiveButton(modal);
      }, 300);
    }

    function normalizePlate(s) {
      return (s || "").toUpperCase().replace(/\s+/g, "").trim();
    }

    function extractPlateFromNotificationText(text) {
      const t = String(text || "")
        .replace(/\s+/g, " ")
        .trim();

      let m = t.match(/\bSzkoda\s+([A-Z0-9]{5,12})\b/i);
      if (m && m[1] && /[A-Z]/i.test(m[1]) && /\d/.test(m[1])) {
        return normalizePlate(m[1]);
      }

      m = t.match(/\bpojazdu\s+o\s+numerze:\s*([A-Z0-9]{5,12})\b/i);
      if (m && m[1] && /[A-Z]/i.test(m[1]) && /\d/.test(m[1])) {
        return normalizePlate(m[1]);
      }

      m = t.match(/\bnumerze:\s*([A-Z0-9]{5,12})\b/i);
      if (m && m[1]) {
        const token = normalizePlate(m[1]);
        if (token !== "DODANONOWY" && /[A-Z]/.test(token) && /\d/.test(token)) {
          return token;
        }
      }

      return null;
    }

    async function autoArchiveNotifications(caseId, modal) {
      console.log("[Arval Stealth] Archiwizacja: start. caseId=", caseId);

      const url = "/common/notification";

      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        alert("Błąd podczas pobierania powiadomień.");
        return;
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const rows = Array.from(doc.querySelectorAll("tr")).filter((tr) =>
        tr.querySelector('a[href*="/common/notification/setread/"]'),
      );

      const byCase = rows.filter((tr) => {
        const link = tr.querySelector(
          'a[href*="/claims/insurancecase/info/id/"]',
        );
        const href = link?.getAttribute("href") || "";
        return href.includes("/id/" + caseId);
      });

      let plate = getPlateFromModal(modal);

      if (!plate && byCase.length) {
        const prev = extractNotifPreviewFromTr(byCase[0]);
        plate = extractPlateFromNotificationText(prev.text);
      }

      const plateUpper = plate ? plate.toUpperCase() : null;

      let byPlate = [];
      if (plateUpper) {
        byPlate = rows.filter((tr) =>
          (tr.textContent || "").toUpperCase().includes(plateUpper),
        );
      }

      const uniq = new Map();

      const addRow = (tr) => {
        const a = tr.querySelector('a[href*="/common/notification/setread/"]');
        if (!a) return;

        const href = a.getAttribute("href");
        const m = href.match(/\/setread\/id\/(\d+)/);
        const key = m ? m[1] : href;

        if (!uniq.has(key)) {
          const prev = extractNotifPreviewFromTr(tr);
          uniq.set(key, { href, ...prev });
        }
      };

      byCase.forEach(addRow);
      byPlate.forEach(addRow);

      const all = Array.from(uniq.values());

      if (!all.length) {
        alert("Brak powiadomień do archiwizacji.");
        return;
      }

      const list = all
        .slice(0, 30)
        .map((x, i) => `${i + 1}. [${x.date || "—"}] ${x.text.slice(0, 120)}`)
        .join("\n");

      const more = all.length > 30 ? `\n… +${all.length - 30} więcej` : "";

      const ok = confirm(
        `Według N.R. ${plateUpper || "—"},\n\n` +
          `znaleziono powiadomień: ${all.length}\n\n` +
          list +
          more +
          "\n\n" +
          "Archiwizować wszystko?",
      );

      if (!ok) return;

      let done = 0;
      for (const item of all) {
        try {
          await fetch(item.href, { credentials: "include", cache: "no-store" });
          done++;
          await new Promise((r) => setTimeout(r, 150));
        } catch (e) {
          console.warn("Błąd archiwizacji:", e);
        }
      }

      alert(`Zaarchiwizowano ${done}/${all.length} powiadomień.`);
    }

    return { init };
  })();

  /***************************************************************************
   * MODULE D: TOAST SCANNER — scan all cases (open + closed) for new chat msgs
   ***************************************************************************/
  const ToastScanner = (() => {
    let autoTimer = null;
    let isScanning = false;
    let nextOpenAt = 0;
    let nextClosedAt = 0;

    const LS_KEY = "arv_toast_scanner_settings_v1";
    const LS_ALERTS = "arv_toast_alerts_v1";
    const LS_META = "arv_toast_meta_v1";

    // 10 хв “сесія” — в цей час НЕ даємо повторно стартувати скану
    const SCAN_COOLDOWN_MS = 10 * 60 * 1000;

    const CFG_TS = {
      baseListUrl:
        "https://serwisarval.pl/claims/insurancecase/index/page/1?claim_number=&contract_plate_number=&claim_number_insurance_company=&client_name=&claim_date_from=&claim_date_to=&type=&case_closed=0&special_care=&gaps_filled=&resetFilterForm=Kasuj+wszystkie+filtry",

      scanClosedToo: true,
      requestDelayMs: 250,

      // UI
      panelWidthPx: 350,
      panelHeightVh: 50,

      maxPagesHardLimit: 300,

      autoScanEnabled: true,
      openEveryMin: 10,
      closedEveryMin: 360,
      jitterMs: 15000,
    };

    const TS_IDS = {
      panel: "arv-toast-panel",
      style: "arv-toast-style",
      btn: "arv-toast-scan-btn",
      badge: "arv-toast-scan-badge",
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function ensureStylesOnce() {
      if (document.getElementById(TS_IDS.style)) return;

      const st = document.createElement("style");
      st.id = TS_IDS.style;

      // ✅ ВАРІАНТ 2: панель зліва “під меню” (fallback), але лишається в body
      // top зробив 72px, щоб не перекривати верхній бар/кнопки
      st.textContent = `
      #${TS_IDS.panel}{
        /* ✅ тепер це елемент всередині меню */
        position: relative;
        top: auto;
        left: auto;
        right: auto;

        width: 100%;
        max-width: ${CFG_TS.panelWidthPx}px;  /* 350 */
        height: ${CFG_TS.panelHeightVh}vh;    /* 50vh */
        max-height: 50vh;

        margin-top: 10px;
        padding: 10px;

        overflow: auto;

        background: rgba(255,255,255,.98);
        border: 1px solid rgba(0,0,0,.12);
        box-shadow: 0 8px 28px rgba(0,0,0,.12);
        border-radius: 0px;

        display: flex;
        flex-direction: column;
        gap: 10px;

        z-index: auto;
        }
        /* ✅ ховаємо scrollbar, але скрол залишається */
        #${TS_IDS.panel}{
        -ms-overflow-style: none;   /* IE/Edge legacy */
        scrollbar-width: none;      /* Firefox */
        }
        #${TS_IDS.panel}::-webkit-scrollbar{
        width: 0;
        height: 0;
        }



      .arv-toast{
        border:1px solid rgba(0,0,0,.12);
        border-left:6px solid #00965E;
        border-radius:5px;
        padding:10px 12px;
        background:#fff;
        box-shadow:0 2px 10px rgba(0,0,0,.08);
        font:14px/1.35 system-ui,Segoe UI,Arial,sans-serif;
      }
      .arv-toast__title{ font-weight:800; margin-bottom:6px; }
      .arv-toast__row{ margin:2px 0; }
      .arv-toast__btns{ margin-top:8px; display:flex; gap:8px; }
      .arv-toast__btn{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:7px 10px;
        border-radius:4px;
        border:1px solid rgba(0,0,0,.14);
        background:#f5f5f5;
        cursor:pointer;
        text-decoration:none;
        color:#111;
        user-select:none;
        font-weight:600;
      }
      .arv-toast__btn:hover{ filter:brightness(.95); }

      .arv-toast__muted{ opacity:.8; font-size:12px; }

      #${TS_IDS.btn}{
        margin-left:8px;
      }
      #${TS_IDS.badge}{
        margin-left:8px;
        font-size:12px;
        opacity:.8;
      }
    `;
      document.head.appendChild(st);
    }

    function ensurePanelOnce() {
      if (document.getElementById(TS_IDS.panel)) return;

      const panel = document.createElement("div");
      panel.id = TS_IDS.panel;
      panel.style.display = "none";

      const menu = document.getElementById("mext-menu");
      if (menu) {
        // ✅ вставляємо в самий низ меню
        menu.appendChild(panel);
      } else {
        // fallback (якщо раптом меню ще не в DOM)
        document.body.appendChild(panel);
      }
    }

    function setPanelVisible(v) {
      const p = document.getElementById(TS_IDS.panel);
      if (!p) return;
      p.style.display = v ? "flex" : "none";
    }

    function clearPanel() {
      const p = document.getElementById(TS_IDS.panel);
      if (!p) return;
      p.innerHTML = "";
    }

    function showPanelLoader() {
      ensurePanelOnce();
      const p = document.getElementById(TS_IDS.panel);
      if (!p) return;

      // щоб лоудер не губився — панель показуємо
      setPanelVisible(true);

      // чистимо і показуємо BNP loader
      p.innerHTML = "";
      showBNPLoader(p);
    }

    function hidePanelLoader() {
      const p = document.getElementById(TS_IDS.panel);
      if (!p) return;
      hideBNPLoader(p);
    }

    function addToast(item) {
      const panel = document.getElementById(TS_IDS.panel);
      if (!panel) return;

      const plate = (item?.plate || "—").trim() || "—";
      const consultant = (item?.consultant || "—").trim() || "—";
      const stage = (item?.stage || "—").trim() || "—";

      const isClosed = item?.isClosed === true;
      const caseTypeLabel = isClosed ? "Zamknięta" : "Aktywna";

      const openUrl = item?.openUrl || null;

      const toast = document.createElement("div");
      toast.className = "arv-toast";

      toast.innerHTML = `
    <div class="arv-toast__title">Nowa wiadomość</div>

    <div class="arv-toast__row">
      <span class="arv-toast__label">Auto:</span>
      <span class="arv-toast__value">${escapeHtml(plate)}</span>
    </div>

    <div class="arv-toast__row">
      <span class="arv-toast__label">Konsultant:</span>
      <span class="arv-toast__value">${escapeHtml(consultant)}</span>
    </div>

    <div class="arv-toast__row">
      <span class="arv-toast__label">Sprawa:</span>
      <span class="arv-toast__badge ${isClosed ? "is-closed" : "is-open"}">${caseTypeLabel}</span>
    </div>

    <div class="arv-toast__row">
      <span class="arv-toast__label">Etap:</span>
      <span class="arv-toast__value">${escapeHtml(stage)}</span>
    </div>

    <div class="arv-toast__actions">
      <button type="button" class="arv-toast__btn js-open-case">Otwórz sprawę</button>
    </div>
  `;

      const btn = toast.querySelector(".js-open-case");
      btn?.addEventListener("click", () => {
        // ✅ миттєво прибираємо тост локально
        markCaseReadLocal(item?.caseId || item?.key, "toast-open");

        if (!openUrl) return;
        window.open(openUrl, "_blank", "noopener,noreferrer");
      });

      panel.appendChild(toast);
    }

    function ensureSettingsBox() {
      if (document.getElementById("arv-toast-settings")) return;

      const box = document.createElement("div");
      box.id = "arv-toast-settings";
      box.style.cssText = `
        width:100%;
        max-width:${CFG_TS.panelWidthPx}px; /* 350 */
        background:rgba(255,255,255,.98);
        border:1px solid rgba(0,0,0,.12);
        box-shadow:0 8px 28px rgba(0,0,0,.12);
        border-radius:10px;
        padding:10px;
        font:13px/1.3 system-ui,Segoe UI,Arial,sans-serif;
        margin-top:10px;`;

      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <b>Toast Scanner</b>
        <label style="display:flex;gap:6px;align-items:center;cursor:pointer;">
            <input id="arv-as-enabled" type="checkbox" />
            AUTO
        </label>
        </div>

        <div style="display:grid;grid-template-columns:1fr 90px;gap:8px;align-items:center;">
        <div>Open interval (min)</div>
        <input id="arv-as-open" type="number" min="1" max="120" style="width:90px;" />

        <div>Closed interval (min)</div>
        <input id="arv-as-closed" type="number" min="30" max="10080" style="width:90px;" />
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
        <button id="arv-as-apply" type="button" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.14);background:#f5f5f5;cursor:pointer;font-weight:600;">
            Apply
        </button>
        <button id="arv-as-scan-open" type="button" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.14);background:#f5f5f5;cursor:pointer;font-weight:600;">
            Scan open now
        </button>
        </div>

        <div style="margin-top:8px;opacity:.75;font-size:12px;">
        Tip: closed 360 = 6h, 1440 = 24h
        </div>`;

      // ✅ ВСТАВЛЯЄМО ПІД ПАНЕЛЬ ТОСТІВ
      const panel = document.getElementById(TS_IDS.panel);
      if (panel && panel.parentElement) {
        // якщо panel всередині ul — краще обгорнути в li
        const parentIsUl = panel.parentElement.tagName === "UL";
        if (parentIsUl) {
          const li = document.createElement("li");
          li.style.listStyle = "none";
          li.style.margin = "0";
          li.appendChild(box);
          panel.parentElement.insertBefore(li, panel.nextSibling);
        } else {
          panel.insertAdjacentElement("afterend", box);
        }
      } else {
        document.body.appendChild(box);
      }

      // init values
      const elEnabled = box.querySelector("#arv-as-enabled");
      const elOpen = box.querySelector("#arv-as-open");
      const elClosed = box.querySelector("#arv-as-closed");

      elEnabled.checked = !!CFG_TS.autoScanEnabled;
      elOpen.value = String(CFG_TS.openEveryMin);
      elClosed.value = String(CFG_TS.closedEveryMin);

      box.querySelector("#arv-as-apply").addEventListener("click", () => {
        CFG_TS.autoScanEnabled = elEnabled.checked;
        CFG_TS.openEveryMin = clamp(elOpen.value, 1, 120);
        CFG_TS.closedEveryMin = clamp(elClosed.value, 30, 10080);

        saveSettings();
        nextOpenAt = 0;
        nextClosedAt = 0;

        setBadge(`Auto: ${CFG_TS.autoScanEnabled ? "ON" : "OFF"}`);
      });

      box.querySelector("#arv-as-scan-open").addEventListener("click", () => {
        runScan({ mode: "open", force: true });
      });
    }
    // NOTE: using global escapeHtml/escapeAttr from UTILS
    // function escapeAttr(s) {
    //   return String(s ?? "").replace(/"/g, "&quot;");
    // }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);

        if (typeof s.autoScanEnabled === "boolean")
          CFG_TS.autoScanEnabled = s.autoScanEnabled;
        if (Number.isFinite(s.openEveryMin))
          CFG_TS.openEveryMin = clamp(s.openEveryMin, 1, 120);
        if (Number.isFinite(s.closedEveryMin))
          CFG_TS.closedEveryMin = clamp(s.closedEveryMin, 30, 10080);
      } catch {}
    }

    function saveSettings() {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            autoScanEnabled: CFG_TS.autoScanEnabled,
            openEveryMin: CFG_TS.openEveryMin,
            closedEveryMin: CFG_TS.closedEveryMin,
          }),
        );
      } catch {}
    }

    function loadMeta() {
      try {
        return JSON.parse(localStorage.getItem(LS_META) || "{}");
      } catch {
        return {};
      }
    }
    function saveMeta(meta) {
      try {
        localStorage.setItem(LS_META, JSON.stringify(meta || {}));
      } catch {}
    }

    function loadAlertsState() {
      try {
        return JSON.parse(localStorage.getItem(LS_ALERTS) || "{}");
      } catch {
        return {};
      }
    }
    function saveAlertsState(state) {
      try {
        localStorage.setItem(LS_ALERTS, JSON.stringify(state || {}));
      } catch {}
    }

    // ✅ швидкий рендер з localStorage
    function renderFromStorage() {
      ensurePanelOnce();
      const state = loadAlertsState();
      const items = Object.values(state).filter((x) => x && x.active);

      if (!items.length) {
        clearPanel();
        setPanelVisible(false);
        setBadge("0 alerts");
        return;
      }

      clearPanel();
      setPanelVisible(true);

      // можеш сортувати за lastSeen (нові зверху)
      items.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

      for (const item of items) addToast(item);

      setBadge(`${items.length} alerts (cache)`);
    }

    // =========================
    // MARK AS READ — LOCAL ONLY
    // =========================

    function extractCaseIdFromHref(href) {
      if (!href) return null;
      const s = String(href);
      // /id/12345
      let m = s.match(/\/id\/(\d+)(?:[/?#]|$)/i);
      if (m) return m[1];

      // ?id=12345
      m = s.match(/[?&]id=(\d+)(?:[&#]|$)/i);
      if (m) return m[1];

      return null;
    }

    function isCasePageUrl(href) {
      try {
        const u = new URL(href, location.href);
        return u.pathname.includes("/claims/insurancecase/");
      } catch {
        // якщо це відносний href — теж ок
        return String(href).includes("/claims/insurancecase/");
      }
    }

    function markCaseReadLocal(caseId, reason = "unknown") {
      const id = String(caseId || "").trim();
      if (!id) return false;

      const state = loadAlertsState();
      const item = state[id];
      if (!item) return false;

      // якщо і так inactive — просто не шумимо
      if (item.active === false) return true;

      state[id] = {
        ...item,
        active: false,
        lastSeen: Date.now(),
        _clearedBy: reason, // debug-поле (не обовʼязково, але корисно)
      };

      saveAlertsState(state);
      renderFromStorage();
      return true;
    }

    function mergeScanResultsToStorage(all, scope = "both") {
      const now = Date.now();
      const prev = loadAlertsState(); // key=caseId
      const next = { ...prev };

      const keysNow = new Set(
        (all || []).map((x) => String(x?.key || "").trim()).filter(Boolean),
      );

      const scopeBuckets =
        scope === "open"
          ? new Set(["open"])
          : scope === "closed"
            ? new Set(["closed"])
            : new Set(["open", "closed"]); // both / all

      // 1) Апдейт того, що ми знайшли зараз
      for (const x of all || []) {
        const key = String(x?.key || "").trim();
        if (!key) continue;

        const prevItem = prev[key];

        // bucket: якщо в нових даних нема — лишаємо попередній
        const bucket = x.bucket || prevItem?.bucket || "open";

        // ✅ sticky: якщо колись було isClosed=true — не даємо стати false
        const isClosed = prevItem?.isClosed === true ? true : !!x.isClosed;

        next[key] = {
          key,
          caseId: x.caseId || key,
          plate: x.plate || prevItem?.plate || "—",
          consultant: x.consultant || prevItem?.consultant || "—",
          stage: x.stage || prevItem?.stage || "—",
          openUrl: x.openUrl || prevItem?.openUrl || null,

          bucket, // ✅ технічне
          isClosed, // ✅ істина (з Etap)

          active: true,
          lastSeen: now,
        };
      }

      // 2) Деактивуємо ТІЛЬКИ в bucket-ах, які реально сканили
      for (const k of Object.keys(next)) {
        const item = next[k];
        if (!item) continue;

        const bucket = item.bucket || "open";
        if (!scopeBuckets.has(bucket)) continue;

        if (!keysNow.has(k)) {
          next[k] = {
            ...item,
            active: false,
            lastSeen: item.lastSeen || now,
          };
        }
      }

      saveAlertsState(next);
    }

    function clamp(n, a, b) {
      n = Number(n);
      if (!Number.isFinite(n)) return a;
      return Math.max(a, Math.min(b, n));
    }

    function findClaimsListTableInDoc(doc) {
      const t = doc.querySelector("table.mextTable");
      if (t && t.querySelector("tbody tr")) return t;

      const candidates = Array.from(doc.querySelectorAll("table")).filter(
        (x) => x.querySelector("thead th") && x.querySelector("tbody tr"),
      );
      return (
        candidates.find((x) =>
          /Numer\s+szkody|Nr\s+rej|Etap/i.test(
            x.innerText || x.textContent || "",
          ),
        ) || null
      );
    }

    function headerIndexMap(table) {
      const map = {};
      const ths = Array.from(table.querySelectorAll("thead th"));
      ths.forEach((th, idx) => {
        const t = (th.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        if (t.includes("nr rej")) map.nrRej = idx;
        if (t.includes("pracownik warsztatu")) map.pracW = idx;
        if (t.includes("opcje")) map.opcje = idx;
        if (t.includes("etap")) map.stage = idx;
      });
      return map;
    }

    function extractPlateFromCellText(text) {
      const s = String(text || "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();

      const m = s.match(/\b[A-Z]{1,3}\d[A-Z0-9]{2,8}\b/);
      return m ? m[0] : null;
    }

    function extractOpenUrlFromRow(tr) {
      const aInfo = tr.querySelector('a[href*="/claims/insurancecase/info/"]');
      if (aInfo) return toAbsUrl(aInfo.getAttribute("href"));

      const aChat = tr.querySelector('a[href*="/claims/insurancecase/chat/"]');
      if (aChat) return toAbsUrl(aChat.getAttribute("href"));

      const aAny = tr.querySelector('a[href*="/claims/insurancecase/"]');
      return aAny ? toAbsUrl(aAny.getAttribute("href")) : null;
    }

    function hasNewMessageAlert(tr) {
      const a = tr.querySelector("a.button.table-option.alert");
      if (a) return true;

      const a2 = tr.querySelector(
        'a.button.table-option[title*="nowa wiadomo"]',
      );
      return !!a2;
    }
    // NOTE: using global toAbsUrl from UTILS

    function buildListUrl({ page, closed }) {
      const u = new URL(CFG_TS.baseListUrl);
      u.pathname = u.pathname.replace(/\/page\/\d+/, `/page/${page}`);
      u.searchParams.set("case_closed", closed ? "1" : "0");
      return u.toString();
    }

    function parseMaxPageFromDoc(doc) {
      const links = Array.from(
        doc.querySelectorAll('a[href*="/claims/insurancecase/index/page/"]'),
      );
      let max = 1;
      for (const a of links) {
        const href = a.getAttribute("href") || "";
        const m = href.match(/\/page\/(\d+)/);
        if (m) max = Math.max(max, Number(m[1]));
      }
      return max || 1;
    }

    async function fetchDoc(url, timeoutMs = 15000) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "text/html" },
          signal: ctrl.signal,
        });
        if (!res.ok) return null;

        const html = await res.text();
        return new DOMParser().parseFromString(html, "text/html");
      } catch (e) {
        console.warn("[ToastScanner] fetchDoc failed:", url, e);
        return null;
      } finally {
        clearTimeout(t);
      }
    }

    async function scanOneMode({ closed }) {
      const results = [];
      const seen = new Set();

      const bucket = closed ? "closed" : "open";

      let page = 1;
      let maxPage = 1;

      for (let guard = 0; guard < CFG_TS.maxPagesHardLimit; guard++) {
        const url = buildListUrl({ page, closed });
        if (page === 1) {
          console.log("[ToastScanner] LIST URL:", url, "closedMode=", closed);
        }

        const doc = await fetchDoc(url);
        if (!doc) break;

        if (page === 1) {
          maxPage = parseMaxPageFromDoc(doc);
        }

        setBadge(`Scanning… ${bucket} p${page}/${maxPage}`);

        const table = findClaimsListTableInDoc(doc);
        if (!table) break;

        const idx = headerIndexMap(table);
        const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
          (tr) => tr.querySelector("td"),
        );
        if (!rows.length) break;

        for (const tr of rows) {
          if (!hasNewMessageAlert(tr)) continue;

          const tds = Array.from(tr.querySelectorAll("td"));

          // --- plate ---
          const plateCell = idx.nrRej != null ? tds[idx.nrRej] : tds[3];
          const plate =
            (plateCell?.querySelector?.("span")?.textContent || "").trim() ||
            extractPlateFromCellText(plateCell?.textContent || "") ||
            "—";

          // --- consultant ---
          const consCell =
            idx.pracW != null ? tds[idx.pracW] : tds[tds.length - 2];
          const consultantRaw = (consCell?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          const consultant = consultantRaw || "—";

          // --- stage (Etap) ---
          // якщо idx.stage не знайдено — буде "—" (і isClosed тоді false)
          const stageCell = idx.stage != null ? tds[idx.stage] : null;
          const stageRaw = (stageCell?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          const stage = stageRaw || "—";

          // ✅ істина про “закрита/відкрита” тільки з Etap
          const isClosedByStage =
            /zamkni|zamknię|zlecenie\s+zamkni|zlecenie\s+zamknię/i.test(
              stageRaw || "",
            );

          // --- caseId (KEY!) ---
          const caseId =
            String(
              tr.querySelector(".js_refreshAlert")?.getAttribute("rel") || "",
            ).trim() ||
            String(
              tr.querySelector(".js_openTasksDialog")?.getAttribute("rel") ||
                "",
            ).trim() ||
            String(extractCaseIdFromRow(tr) || "").trim();

          if (!caseId) continue;

          const key = caseId;

          // --- openUrl ---
          let openUrl = extractOpenUrlFromRow(tr);
          if (!openUrl) {
            openUrl = toAbsUrl(
              `/claims/insurancecase/info/page/${page}/id/${caseId}`,
            );
          }

          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              key,
              caseId,
              plate,
              consultant,
              stage,
              openUrl,

              // ✅ нова модель
              bucket, // технічне: звідки бачили
              isClosed: isClosedByStage, // істина: тільки з Etap

              // (опційно) для дебагу можна лишити:
              // listClosed: !!closed,
            });
          }
        }

        if (page >= maxPage) break;
        page += 1;
        await sleep(CFG_TS.requestDelayMs);
      }

      return results;
    }

    // helper (додай нижче, якщо в тебе такого ще нема)
    function extractCaseIdFromRow(tr) {
      const a =
        tr.querySelector('a[href*="/claims/insurancecase/"][href*="/id/"]') ||
        tr.querySelector(
          'a[href*="/claims/insurancecase/info/"][href*="/id/"]',
        ) ||
        tr.querySelector(
          'a[href*="/claims/insurancecase/chat/"][href*="/id/"]',
        );

      const href = a?.getAttribute("href") || "";
      const m = href.match(/\/id\/(\d+)/);
      return m ? m[1] : null;
    }

    async function runScan({ mode = "both", force = false } = {}) {
      if (isScanning) return;
      isScanning = true;

      ensureStylesOnce();
      ensurePanelOnce();

      // ✅ показуємо лоудер одразу, щоб було видно що “живе”
      showPanelLoader();

      try {
        const meta = loadMeta();
        const last = meta.lastFullScanAt || 0;
        const meta2 = loadMeta();
        meta2.lastFullScanAt = Date.now();
        saveMeta(meta2);

        // ✅ cooldown: не сканимо — просто рендер з localStorage
        if (!force && Date.now() - last < SCAN_COOLDOWN_MS) {
          hidePanelLoader();
          renderFromStorage();
          return;
        }

        setBadge("Scanning…");

        const all = [];

        if (mode === "open" || mode === "both") {
          const openRes = await scanOneMode({ closed: false });
          all.push(...openRes);
        }

        if (CFG_TS.scanClosedToo && (mode === "closed" || mode === "both")) {
          const closedRes = await scanOneMode({ closed: true });
          all.push(...closedRes);
        }

        // ✅ пишемо результат скану в localStorage (і цим же прибираємо зниклі)
        mergeScanResultsToStorage(all, mode);

        // ✅ рендеримо ТІЛЬКИ з localStorage (швидко, стабільно)
        hidePanelLoader();
        renderFromStorage();
      } catch (e) {
        console.error("[ToastScanner] runScan error:", e);
        setBadge("ERROR (console)");
        hidePanelLoader();
        clearPanel();
        setPanelVisible(false);
      } finally {
        isScanning = false;
      }
    }

    function jitter(ms) {
      const j = CFG_TS.jitterMs || 0;
      if (!j) return ms;
      const delta = (Math.random() * 2 - 1) * j;
      return Math.max(0, ms + delta);
    }

    function scheduleNextTick() {
      if (autoTimer) clearTimeout(autoTimer);

      autoTimer = setTimeout(async () => {
        autoTimer = null;
        await autoTick();
        scheduleNextTick();
      }, jitter(5000));
    }

    async function autoTick() {
      if (!CFG_TS.autoScanEnabled) return;

      const now = Date.now();
      if (!nextOpenAt) nextOpenAt = now + CFG_TS.openEveryMin * 60_000;
      if (!nextClosedAt) nextClosedAt = now + CFG_TS.closedEveryMin * 60_000;

      if (now >= nextOpenAt) {
        await runScan({ mode: "open" });
        nextOpenAt = Date.now() + CFG_TS.openEveryMin * 60_000;
        return;
      }

      if (CFG_TS.scanClosedToo && now >= nextClosedAt) {
        await runScan({ mode: "closed" });
        nextClosedAt = Date.now() + CFG_TS.closedEveryMin * 60_000;
        return;
      }
    }

    function startAuto() {
      loadSettings();
      if (!nextOpenAt) nextOpenAt = 0;
      if (!nextClosedAt) nextClosedAt = 0;
      scheduleNextTick();
    }

    function setBadge(text) {
      const b = document.getElementById(TS_IDS.badge);
      if (b) b.textContent = text || "";
    }

    function ensureScanButton() {
      const toolbar = document.getElementById("arv-toolbar");

      if (document.getElementById(TS_IDS.btn)) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "arv-btn arv-btn--primary";
      btn.id = TS_IDS.btn;
      btn.textContent = "Scan: nowe wiadomości";

      const badge = document.createElement("span");
      badge.id = TS_IDS.badge;
      badge.textContent = "";
      badge.style.marginLeft = "8px";

      btn.addEventListener("click", () =>
        runScan({ mode: "both", force: true }).catch(console.error),
      );

      if (toolbar) {
        toolbar.appendChild(btn);
        toolbar.appendChild(badge);
      } else {
        btn.style.position = "fixed";
        btn.style.top = "12px";
        btn.style.left = "60px";
        btn.style.zIndex = "999999";
        document.body.appendChild(btn);

        badge.style.position = "fixed";
        badge.style.top = "18px";
        badge.style.left = "260px";
        badge.style.zIndex = "999999";
        document.body.appendChild(badge);
      }
    }

    function hookManualOpenClicksOnce() {
      if (window.__arvToastHookClicks) return;
      window.__arvToastHookClicks = true;

      document.addEventListener(
        "click",
        (e) => {
          const a = e.target?.closest?.("a[href]");
          if (!a) return;

          const href = a.getAttribute("href") || "";
          if (!href) return;

          // цікавлять тільки переходи в справу/чат
          if (!isCasePageUrl(href)) return;

          const id = extractCaseIdFromHref(href);
          if (!id) return;

          // ✅ прибираємо локально без скану
          markCaseReadLocal(id, "manual-click");
        },
        true, // capture=true, щоб спрацювати максимально рано
      );
    }

    function hookUrlCaseDetectionOnce() {
      if (window.__arvToastHookUrl) return;
      window.__arvToastHookUrl = true;

      let lastHref = location.href;

      const check = () => {
        const nowHref = location.href;
        if (nowHref === lastHref) return;
        lastHref = nowHref;

        if (!isCasePageUrl(nowHref)) return;
        const id = extractCaseIdFromHref(nowHref);
        if (!id) return;

        markCaseReadLocal(id, "url-change");
      };

      const ps = history.pushState;
      const rs = history.replaceState;

      history.pushState = function () {
        const r = ps.apply(this, arguments);
        setTimeout(check, 0);
        return r;
      };

      history.replaceState = function () {
        const r = rs.apply(this, arguments);
        setTimeout(check, 0);
        return r;
      };

      addEventListener("popstate", () => setTimeout(check, 0));
    }

    function init() {
      if (window.__arvToastScannerInited) return;
      window.__arvToastScannerInited = true;

      ensureStylesOnce();
      ensurePanelOnce();
      ensureScanButton();
      loadSettings();
      ensureSettingsBox();

      hookManualOpenClicksOnce();
      hookUrlCaseDetectionOnce();

      // ✅ 1) миттєво показуємо те, що вже є в localStorage
      renderFromStorage();

      // ✅ 2) запускаємо таймери як і було
      startAuto();

      // ✅ 3) робимо стартовий скан, але НЕ force
      // якщо cooldown ще не минув — runScan просто зробить renderFromStorage і вийде
      runScan({ mode: "both", force: false });
    }

    return { init, runScan };
  })();

  /***************************************************************************
   * BOOT
   ***************************************************************************/
  MenuHider.initOnce();
  MenuHider.rearm();

  const bootDates = () => DateCol.init();
  const bootChat = () => ChatTools.init();
  const bootToasts = () => ToastScanner.init();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        bootDates();
        bootChat();
        bootToasts();
      },
      { once: true },
    );
  } else {
    bootDates();
    bootChat();
    bootToasts();
  }
})();
