// ==UserScript==
// @name         Arval Stealth — unified (menu hide + contract end dates)
// @namespace    https://github.com/Phill1983/Arval-Stealth-user-script
// @version      4.2.5
// @description  Automatyzacja roboty z Arval
// @author       Phill_Mass
// @match        https://serwisarval.pl/claims/insurancecase*
// @match        https://system.serviceflow.pl/dmg_case/management/view/*
// @match        https://system.serviceflow.pl/dmg_cases/rents*
// @connect      serwisarval.pl
// @connect      system.serviceflow.pl
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

      // авто-клік «Auto-archiwizacja» після переходу в справу (з картки або зі списку)
      if (!window.__arvAutoArchiveAlreadyTriggered) {
        const caseId = getCaseId(modal);
        const fromStorage = (() => {
          try {
            return sessionStorage.getItem("arv_auto_archive_case");
          } catch (e) {
            return null;
          }
        })();
        const fromUrl = (() => {
          try {
            return new URL(location.href).searchParams.get("arv_auto_archive");
          } catch (e) {
            return null;
          }
        })();
        if ((fromStorage && fromStorage === caseId) || fromUrl) {
          window.__arvAutoArchiveAlreadyTriggered = true;
          try {
            sessionStorage.removeItem("arv_auto_archive_case");
          } catch (e) {}
          try {
            const u = new URL(location.href);
            u.searchParams.delete("arv_auto_archive");
            history.replaceState(null, "", u.toString());
          } catch (e) {}
          setTimeout(() => btn.click(), 800);
        }
      }

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
    let nextScanAt = 0;

    const LS_KEY = "arv_toast_scanner_settings_v1";
    const LS_ALERTS = "arv_toast_alerts_v1";
    const LS_META = "arv_toast_meta_v1";

    // 10 хв “сесія” — в цей час НЕ даємо повторно стартувати скану
    const SCAN_COOLDOWN_MS = 10 * 60 * 1000;

    const CFG_TS = {
      mode: "inbox", // 'inbox' | list (open+closed)
      baseListUrl:
        "https://serwisarval.pl/claims/insurancecase/index/page/1?claim_number=&contract_plate_number=&claim_number_insurance_company=&client_name=&claim_date_from=&claim_date_to=&type=&case_closed=0&special_care=&gaps_filled=&resetFilterForm=Kasuj+wszystkie+filtry",

      requestDelayMs: 250,

      panelWidthPx: 350,
      panelHeightVh: 50,
      maxPagesHardLimit: 300,

      autoScanEnabled: true,
      scanEveryMin: 10, // один інтервал: кожні N хв скануємо ВСІ справи (open + closed)
      jitterMs: 15000,
    };

    const TS_IDS = {
      panel: "arv-toast-panel",
      style: "arv-toast-style",
      btn: "arv-toast-scan-btn",
      badge: "arv-toast-scan-badge",
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // INBOX helper: parse a <tr> into { plate, consultant, stage }
    // Works for both open/closed tables (3 or 4 buttons – does not matter)
    function extractClaimRowDataFromTableRow(tr) {
      try {
        if (!tr) return {};
        const table = tr.closest("table");
        const tds = Array.from(tr.querySelectorAll("td"));
        if (!table || !tds.length) return {};

        // Reuse your existing helpers if present:
        // - headerIndexMap(table)
        // - findColIdxByHeaderRegex(table, regex)
        // - extractPlateFromCellText(text)

        const idx = headerIndexMap(table);

        // Nr rej / Marka i model (usually col 3, but we also try idx map)
        const plateCell = idx.nrRej != null ? tds[idx.nrRej] : tds[3];
        const plate =
          (plateCell?.querySelector?.("span")?.textContent || "").trim() ||
          extractPlateFromCellText(plateCell?.textContent || "") ||
          "—";

        // Etap
        const stageCell = idx.stage != null ? tds[idx.stage] : null;
        const stage =
          (stageCell?.textContent || "").replace(/\s+/g, " ").trim() || "—";

        // Prefer "Pracownik warsztatu" (СТО), fallback "Pracownik Arval"
        let consIdx =
          idx.pracW ?? findColIdxByHeaderRegex(table, /pracownik\s+warsztatu/i);
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /pracownik\s+arval/i);
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /pracownik/i);

        const consultantCell = consIdx != null ? tds[consIdx] : null;
        const consultant =
          (consultantCell?.textContent || "").replace(/\s+/g, " ").trim() ||
          "—";

        return { plate, consultant, stage };
      } catch (e) {
        console.warn(
          "[ToastScanner] extractClaimRowDataFromTableRow failed:",
          e,
        );
        return {};
      }
    }

    // Backward-compat alias (IF your code uses makeAbsUrl somewhere)
    function makeAbsUrl(href) {
      return toAbsUrl(href);
    }

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
        padding:0px 0px 10px;;
        background:#fff;
        box-shadow:0 2px 10px rgba(0,0,0,.08);
        font:14px/1.35 system-ui,Segoe UI,Arial,sans-serif;
      }
      .arv-toast__value{ font-weight:600; font-size:15px; }
      .arv-toast__title{ font-weight:800; margin-bottom:6px; background:linear-gradient(90deg,#00965E,#007A4F); color:#fff; padding:4px 8px; border-radius:0px 4px 4px 0px; font-size:15px; text-align:center; }
      .arv-toast__row{ margin:2px 0 0 8px; }
      .arv-toast__btns{ margin-top:8px; display:flex; gap:8px; }
      .arv-toast__btn{
        margin: 8px;
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
        markCaseReadLocal(item?.caseId || item?.key, "toast-open");

        if (!openUrl) return;
        const urlWithFlag =
          openUrl + (openUrl.includes("?") ? "&" : "?") + "arv_auto_archive=1";
        window.open(urlWithFlag, "_blank", "noopener,noreferrer");
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
        <div>Interval (min)</div>
        <input id="arv-as-interval" type="number" min="1" max="120" style="width:90px;" />
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
        <button id="arv-as-apply" type="button" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.14);background:#f5f5f5;cursor:pointer;font-weight:600;">
            Apply
        </button>
        <button id="arv-as-scan-now" type="button" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.14);background:#f5f5f5;cursor:pointer;font-weight:600;">
            Scan now
        </button>
        <span id="arv-toast-scan-badge" style="margin-left:8px;"></span>
        </div>

        <div style="margin-top:8px;opacity:.75;font-size:12px;">
        AUTO: кожні N хв скануємо всі справи (open + closed). Apply зберігає налаштування.
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

      const elEnabled = box.querySelector("#arv-as-enabled");
      const elInterval = box.querySelector("#arv-as-interval");

      elEnabled.checked = !!CFG_TS.autoScanEnabled;
      elInterval.value = String(CFG_TS.scanEveryMin);

      box.querySelector("#arv-as-apply").addEventListener("click", () => {
        CFG_TS.autoScanEnabled = elEnabled.checked;
        CFG_TS.scanEveryMin = clamp(elInterval.value, 1, 120);
        saveSettings();
        nextScanAt = 0;
        setBadge(`Auto: ${CFG_TS.autoScanEnabled ? "ON" : "OFF"}`);
      });

      box.querySelector("#arv-as-scan-now").addEventListener("click", () => {
        runScan({ mode: "both", force: true });
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
        if (Number.isFinite(s.scanEveryMin)) {
          CFG_TS.scanEveryMin = clamp(s.scanEveryMin, 1, 120);
        } else if (Number.isFinite(s.openEveryMin)) {
          CFG_TS.scanEveryMin = clamp(s.openEveryMin, 1, 120);
        }
      } catch {}
    }

    function saveSettings() {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            autoScanEnabled: CFG_TS.autoScanEnabled,
            scanEveryMin: CFG_TS.scanEveryMin,
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

      // порядок як у списку справ: перша з алертом — зверху стовпчика карток
      items.sort((a, b) => {
        const oa = typeof a.listOrder === "number" ? a.listOrder : 1e9;
        const ob = typeof b.listOrder === "number" ? b.listOrder : 1e9;
        if (oa !== ob) return oa - ob;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });

      for (const item of items) addToast(item);

      setBadge(`${items.length} alerts`);
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

    /** Чи зараз відкрита сторінка списку справ (не деталі справи) */
    function isListPageUrl() {
      try {
        const p = (location.pathname || "").toLowerCase();
        if (!p.includes("/claims/insurancecase")) return false;
        if (
          /\/info\/|\/chat\/|\/details\/|\/proceed\/|\/assign\/|\/assignserviceuser\//i.test(
            p,
          )
        )
          return false;
        if (/\/insurancecase\/\d+/.test(p)) return false;
        return true;
      } catch (e) {
        return false;
      }
    }

    function markCaseReadLocal(caseId, reason = "unknown") {
      const id = String(caseId || "").trim();
      if (!id) return false;

      const state = loadAlertsState();
      const item = state[id];
      if (!item) return false;

      // видаляємо ключ з LS (прочитано = картка більше не показується)
      delete state[id];
      saveAlertsState(state);
      renderFromStorage();

      // прапорець для авто-кліку кнопки архівації на сторінці справи (відкрито зі списку / зміна URL)
      if (reason === "manual-click" || reason === "url-change") {
        try {
          sessionStorage.setItem("arv_auto_archive_case", id);
        } catch (e) {}
      }
      return true;
    }

    function mergeScanResultsToStorage(all, scope = "both") {
      const now = Date.now();
      const prev = loadAlertsState(); // key=caseId
      const next = { ...prev };

      const scopeBuckets =
        scope === "open"
          ? new Set(["open"])
          : scope === "closed"
            ? new Set(["closed"])
            : new Set(["open", "closed"]); // both / all

      // keysNow — тільки ті keys, які ми реально побачили в цьому скані
      const keysNow = new Set(
        (all || []).map((x) => String(x?.key || "").trim()).filter(Boolean),
      );

      // 1) Апдейт того, що ми знайшли зараз (порядок = порядок у списку справ зверху вниз)
      const list = Array.isArray(all) ? all : [];
      for (let i = 0; i < list.length; i++) {
        const x = list[i];
        const key = String(x?.key || "").trim();
        if (!key) continue;

        const prevItem = prev[key];

        // bucket: якщо в нових даних нема — лишаємо попередній (але зазвичай він є)
        const bucket = x.bucket || prevItem?.bucket || "open";

        // ✅ sticky: якщо колись було isClosed=true — не даємо стати false
        const isClosed = prevItem?.isClosed === true ? true : !!x.isClosed;

        // ✅ анти-дубль: беремо з результатів скану, або з prev (якщо було), або дефолт
        const occurrences = Number.isFinite(x.occurrences)
          ? x.occurrences
          : Number.isFinite(prevItem?.occurrences)
            ? prevItem.occurrences
            : 1;

        const seenIn = Array.isArray(x.seenIn)
          ? x.seenIn
          : Array.isArray(prevItem?.seenIn)
            ? prevItem.seenIn
            : [];

        next[key] = {
          key,
          caseId: x.caseId || key,
          plate: x.plate || prevItem?.plate || "—",
          consultant: x.consultant || prevItem?.consultant || "—",
          stage: x.stage || prevItem?.stage || "—",
          openUrl: x.openUrl || prevItem?.openUrl || null,

          bucket, // технічне: де бачили
          isClosed, // істина: тільки з Etap

          // ✅ порядок як у списку справ (перша з алертом = зверху стовпчика карток)
          listOrder: i,

          // ✅ нове: анти-дубль та спостережуваність
          occurrences,
          seenIn,

          active: true,
          lastSeen: now,

          // якщо було погашено раніше — при повторному знаходженні знімаємо маркери
          _clearedBy: undefined,
          _clearedAt: undefined,
        };
      }

      // 2) Деактивуємо ТІЛЬКИ в bucket-ах, які реально сканили
      for (const k of Object.keys(next)) {
        const item = next[k];
        if (!item) continue;

        const bucket = item.bucket || "open";
        if (!scopeBuckets.has(bucket)) continue;

        // якщо key не зустрівся в цьому скані — деактивуємо
        if (!keysNow.has(k)) {
          next[k] = {
            ...item,
            active: false,
            lastSeen: item.lastSeen || now,
            _clearedBy: item._clearedBy || "bucket-miss",
            _clearedAt: item._clearedAt || now,
          };
        }
      }

      saveAlertsState(next);
    }

    // =========================
    // INBOX SCAN MERGE (title-based unread)
    // =========================
    function mergeInboxResultsToStorage(unreadRows, opts = {}) {
      const now = Date.now();
      const pruneOthers = opts.pruneOthers !== false; // default true

      const prev = loadAlertsState();
      const next = { ...prev };

      const keysNow = new Set(
        (unreadRows || [])
          .map((x) => String(x?.caseId || x?.key || "").trim())
          .filter(Boolean),
      );

      const rows = Array.isArray(unreadRows) ? unreadRows : [];
      for (let i = 0; i < rows.length; i++) {
        const x = rows[i];
        const key = String(x?.caseId || x?.key || "").trim();
        if (!key) continue;
        const prevItem = prev[key];

        next[key] = {
          key,
          caseId: key,
          plate: x.plate || prevItem?.plate || "—",
          consultant: x.consultant || prevItem?.consultant || "—",
          stage: x.stage || prevItem?.stage || "—",
          openUrl: x.openUrl || prevItem?.openUrl || x.href || null,
          bucket: "notif",
          isClosed: prevItem?.isClosed === true ? true : !!x.isClosed,
          occurrences: 1,
          seenIn: ["inbox"],
          listOrder: i,
          active: true,
          lastSeen: now,
          _clearedBy: undefined,
          _clearedAt: undefined,
        };
      }

      for (const k of Object.keys(next)) {
        const it = next[k];
        if (!it) continue;
        if (
          it.bucket === "notif" &&
          it.active === true &&
          !keysNow.has(String(k))
        ) {
          next[k] = {
            ...it,
            active: false,
            lastSeen: it.lastSeen || now,
            _clearedBy: it._clearedBy || "notif-miss",
            _clearedAt: it._clearedAt || now,
          };
        }
      }

      if (pruneOthers) {
        for (const k of Object.keys(next)) {
          const it = next[k];
          if (!it) continue;
          if (it.bucket !== "notif" && it.active === true) {
            next[k] = {
              ...it,
              active: false,
              lastSeen: it.lastSeen || now,
              _clearedBy: it._clearedBy || "inbox-mode-prune",
              _clearedAt: it._clearedAt || now,
            };
          }
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

    // Одна перевірка для обох режимів (scanOneMode + scanInboxMode)
    function titleIndicatesNewMessage(title) {
      return /nowa\s+wiadomo/i.test(String(title || ""));
    }

    function hasNewMessageAlert(tr) {
      if (!tr) return false;

      // 1) Основний маркер: title типу "Szczegóły (nowa wiadomość w komunikatorze)"
      const detailEl = tr.querySelector(
        'a.button.table-option[title*="Szczegóły"]',
      );

      if (
        detailEl &&
        titleIndicatesNewMessage(detailEl.getAttribute("title"))
      ) {
        return true;
      }

      // 2) Фолбек: alert-клас (старий механізм)
      const legacyAlert = tr.querySelector("a.button.table-option.alert");
      if (legacyAlert) return true;

      return false;
    }

    // NOTE: using global toAbsUrl from UTILS

    function buildListUrl({ page, closed }) {
      const u = new URL(CFG_TS.baseListUrl);
      u.pathname = u.pathname.replace(/\/page\/\d+/, `/page/${page}`);
      u.searchParams.set("case_closed", closed ? "1" : "0");
      return u.toString();
    }

    function buildInboxUrl({ page }) {
      let base;
      try {
        base = new URL(location.href);
      } catch {
        base = new URL(CFG_TS.baseListUrl);
      }

      const mm = base.pathname.match(
        /^(.*\/claims\/insurancecase\/index)\/page\/\d+/i,
      );
      if (mm) base.pathname = `${mm[1]}/page/${page}`;
      else base.pathname = `/claims/insurancecase/index/page/${page}`;

      base.searchParams.set("case_closed", "");
      return base.toString();
    }

    function parseMaxPageFromDoc(doc) {
      let max = 1;
      const selector =
        'a[href*="/claims/insurancecase/index/page/"], a[href*="/insurancecase/"][href*="/page/"]';
      const links = Array.from(doc.querySelectorAll(selector));
      for (const a of links) {
        const href = a.getAttribute("href") || "";
        const m = href.match(/\/page\/(\d+)(?:[/?#]|$)/);
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

    function findColIdxByHeaderRegex(table, re) {
      const ths = Array.from(table.querySelectorAll("thead th"));
      for (let i = 0; i < ths.length; i++) {
        const txt = (ths[i].textContent || "").replace(/\s+/g, " ").trim();
        if (re.test(txt)) return i;
      }
      return null;
    }

    // =========================
    // INBOX MODE: scan ALL claims pages and detect unread via title
    // "Szczegóły (nowa wiadomość w komunikatorze)"
    // =========================
    async function scanInboxMode() {
      const results = [];
      let page = 1;
      let maxPage = 1;

      for (let guard = 0; guard < CFG_TS.maxPagesHardLimit; guard++) {
        const url = buildInboxUrl({ page });
        const doc = await fetchDoc(url);
        if (!doc) break;

        // Оновлюємо maxPage на кожній сторінці: на п.1 часто є лише "1 2", без посилання на 3+
        maxPage = Math.max(maxPage, parseMaxPageFromDoc(doc));
        setBadge(`Scanning… inbox p${page}/${maxPage}`);

        const table = findClaimsListTableInDoc(doc);
        if (!table) break;

        for (const row of Array.from(table.querySelectorAll("tbody tr"))) {
          const details = row.querySelector('a[title*="Szczegóły"]');
          if (!details) continue;

          const title = details.getAttribute("title") || "";
          if (!titleIndicatesNewMessage(title)) continue;

          const href = details.getAttribute("href") || "";
          const caseId = extractCaseIdFromHref(href);
          if (!caseId) continue;

          const parsed = extractClaimRowDataFromTableRow(row) || {};

          results.push({
            key: String(caseId),
            caseId: String(caseId),
            plate: parsed.plate || "—",
            consultant: parsed.consultant || "—",
            stage: parsed.stage || "—",
            openUrl: makeAbsUrl(href),
            isClosed: /Zlecenie\s+zamknięte/i.test(parsed.stage || ""),
            page,
            title,
          });
        }

        if (page >= maxPage) break;
        page++;
      }

      return results;
    }

    async function scanOneMode({ closed }) {
      const resultsByKey = new Map();
      const bucket = closed ? "closed" : "open";

      let page = 1;
      let maxPage = 1;

      let consultantFromTopBar = null;

      for (let guard = 0; guard < CFG_TS.maxPagesHardLimit; guard++) {
        const url = buildListUrl({ page, closed });
        if (page === 1)
          console.log("[ToastScanner] LIST URL:", url, "closedMode=", closed);

        const doc = await fetchDoc(url);
        if (!doc) break;

        // Оновлюємо maxPage на кожній сторінці: на п.1 часто є лише "1 2", без посилання на 3+
        maxPage = Math.max(maxPage, parseMaxPageFromDoc(doc));

        if (!consultantFromTopBar) {
          consultantFromTopBar =
            // extractConsultantFromDoc?.(doc) ||
            // parseConsultantFromDoc?.(doc) ||
            null;
        }

        setBadge(`Scanning… ${bucket} p${page}/${maxPage}`);

        const table = findClaimsListTableInDoc(doc);
        if (!table) break;

        const idx = headerIndexMap(table);
        const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
          (tr) => tr.querySelector("td"),
        );
        if (!rows.length) break;

        let consIdx = idx.pracW ?? idx.pracownik ?? idx.prac ?? null;
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /pracownik\s+warsztatu/i);
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /pracownik\s+arval/i);
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /pracownik/i);
        if (consIdx == null)
          consIdx = findColIdxByHeaderRegex(table, /konsultant/i);

        if (CFG_TS.debug && page === 1) {
          const headers = Array.from(table.querySelectorAll("thead th"))
            .map(
              (th, i) =>
                `${i}:${(th.textContent || "").replace(/\s+/g, " ").trim()}`,
            )
            .join(" | ");
          console.log("[TS] headers:", headers);
          console.log("[TS] consIdx:", consIdx);
        }

        for (const tr of rows) {
          if (!hasNewMessageAlert(tr)) continue;

          const tds = Array.from(tr.querySelectorAll("td"));

          const plateCell = idx.nrRej != null ? tds[idx.nrRej] : tds[3];
          const plate =
            (plateCell?.querySelector?.("span")?.textContent || "").trim() ||
            extractPlateFromCellText(plateCell?.textContent || "") ||
            "—";

          // consultant from row: Pracownik warsztatu (СТО), fallback Pracownik Arval
          let consIdx = idx.pracW ?? idx.pracownik ?? idx.prac ?? null;
          if (consIdx == null)
            consIdx = findColIdxByHeaderRegex(table, /pracownik\s+warsztatu/i);
          if (consIdx == null)
            consIdx = findColIdxByHeaderRegex(table, /pracownik\s+arval/i);
          if (consIdx == null)
            consIdx = findColIdxByHeaderRegex(table, /pracownik/i);
          if (consIdx == null)
            consIdx = findColIdxByHeaderRegex(table, /konsultant/i);

          const consCell = consIdx != null ? tds[consIdx] : null;
          const rowConsultant = (consCell?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();

          if (CFG_TS.debug && page === 1) {
            const headers = Array.from(table.querySelectorAll("thead th"))
              .map(
                (th, i) =>
                  `${i}:${(th.textContent || "").replace(/\s+/g, " ").trim()}`,
              )
              .join(" | ");
            console.log("[TS] headers:", headers);
            console.log("[TS] consIdx:", consIdx);
          }

          const stageCell = idx.stage != null ? tds[idx.stage] : null;
          const stageRaw = (stageCell?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          const stage = stageRaw || "—";

          const isClosedByStage =
            /zamkni|zamknię|zlecenie\s+zamkni|zlecenie\s+zamknię/i.test(
              stageRaw || "",
            );

          const caseId =
            String(
              tr.querySelector(".js_refreshAlert")?.getAttribute("rel") || "",
            ).trim() ||
            String(
              tr.querySelector(".js_openTasksDialog")?.getAttribute("rel") ||
                "",
            ).trim() ||
            String(extractCaseIdFromRow(tr) || "").trim();

          if (!caseId) {
            // Рядок з алертом, але caseId не витягнуто — можлива причина пропуску справи
            console.warn(
              "[ToastScanner] Пропущено рядок з алертом (немає caseId):",
              { plate, bucket, page },
            );
            if (CFG_TS.debug) {
              console.warn("[ToastScanner] Деталі:", {
                relAlert: tr
                  .querySelector(".js_refreshAlert")
                  ?.getAttribute("rel"),
                relTasks: tr
                  .querySelector(".js_openTasksDialog")
                  ?.getAttribute("rel"),
                hrefFromRow: tr
                  .querySelector('a[href*="/id/"]')
                  ?.getAttribute("href"),
              });
            }
            continue;
          }

          const key = caseId;

          let openUrl = extractOpenUrlFromRow(tr);
          if (!openUrl)
            openUrl = toAbsUrl(
              `/claims/insurancecase/info/page/${page}/id/${caseId}`,
            );

          const existing = resultsByKey.get(key);

          if (!existing) {
            resultsByKey.set(key, {
              key,
              caseId,
              plate,
              consultant: rowConsultant || consultantFromTopBar || "—",
              stage,
              openUrl,
              bucket,
              isClosed: isClosedByStage,
              occurrences: 1,
              seenIn: [{ bucket, page }],
            });
          } else {
            existing.occurrences = (existing.occurrences || 1) + 1;
            existing.seenIn = existing.seenIn || [];
            existing.seenIn.push({ bucket, page });

            // якщо перший запис мав "—", а зараз знайшли ім'я — оновимо
            if (
              (!existing.consultant || existing.consultant === "—") &&
              rowConsultant
            ) {
              existing.consultant = rowConsultant;
            }
          }
        }

        if (page >= maxPage) break;
        page += 1;
        await sleep(CFG_TS.requestDelayMs);
      }

      return Array.from(resultsByKey.values());
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

    /** Результати останнього скану для консолі: window.__arvLastScanResults (дочекайтесь завершення скану) */
    function setLastScanResults(obj) {
      try {
        const v = obj;
        if (typeof window !== "undefined") window.__arvLastScanResults = v;
        if (typeof globalThis !== "undefined")
          globalThis.__arvLastScanResults = v;
      } catch (e) {}
    }

    async function runScan({
      mode = "both",
      force = false,
      skipReloadCheck = false,
    } = {}) {
      if (isScanning) return;
      isScanning = true;
      setLastScanResults(null);

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
          setLastScanResults({
            cooldown: true,
            message: "Scan skipped (cooldown)",
          });
          return;
        }

        // ✅ Варіант A: reload тільки при АВТО-скані (force=false), щоб ручний і авто давали однаковий результат
        if (
          !skipReloadCheck &&
          !force &&
          !(CFG_TS.mode === "inbox" && mode === "inbox")
        ) {
          try {
            if (
              isListPageUrl() &&
              !sessionStorage.getItem("arv_scan_after_reload")
            ) {
              sessionStorage.setItem("arv_scan_after_reload", "1");
              setLastScanResults({ reloading: true });
              location.reload();
              return;
            }
          } catch (e) {}
        }

        setBadge("Scanning…");

        const all = [];

        if (CFG_TS.mode === "inbox" && mode === "inbox") {
          const unread = await scanInboxMode();
          mergeInboxResultsToStorage(unread, { pruneOthers: true });
          hidePanelLoader();
          renderFromStorage();
          setBadge(
            `Inbox done: ${new Set(unread.map((x) => x.caseId)).size} unread`,
          );
          setLastScanResults({
            mode: "inbox",
            all: unread,
            byCaseId: (id) =>
              unread.find((r) => String(r.caseId || r.key) === String(id)),
            byPlate: (plate) =>
              unread.filter((r) =>
                (r.plate || "")
                  .toLowerCase()
                  .includes(String(plate).toLowerCase()),
              ),
          });
          return;
        }

        // Єдина логіка: завжди скануємо ВСІ справи (open + closed)
        const openRes = await scanOneMode({ closed: false });
        const closedRes = await scanOneMode({ closed: true });
        all.push(...openRes, ...closedRes);

        // Дебаг у консолі: дочекайтесь завершення скану (зникне "Scanning…"), потім:
        //   window.__arvLastScanResults.byCaseId("225340132")  — чи потрапила справа в скан
        //   window.__arvLastScanResults.byPlate("WZ448AU")     — усі справи з цим ДНЗ
        //   window.__arvLastScanResults.all.map(r => ({ caseId: r.caseId, plate: r.plate }))
        setLastScanResults({
          open: openRes,
          closed: closedRes,
          all: [...all],
          byCaseId: (id) =>
            all.find((r) => String(r.caseId || r.key) === String(id)),
          byPlate: (plate) =>
            all.filter((r) =>
              (r.plate || "")
                .toLowerCase()
                .includes(String(plate).toLowerCase()),
            ),
        });

        mergeScanResultsToStorage(all, "both");

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
      if (!nextScanAt) nextScanAt = now + CFG_TS.scanEveryMin * 60_000;

      if (now >= nextScanAt) {
        await runScan({ mode: "both" });
        nextScanAt = Date.now() + CFG_TS.scanEveryMin * 60_000;
      }
    }

    function startAuto() {
      loadSettings();
      nextScanAt = 0;
      scheduleNextTick();
    }

    function setBadge(text) {
      const b = document.getElementById(TS_IDS.badge);
      if (b) b.textContent = text || "";
    }

    function ensureScanButton() {
      // Кнопка «Scan: nowe wiadomości» прибрана; скан тільки кнопкою «Scan now» в блоці налаштувань.
      // Badge (статус) створюється в ensureSettingsBox; тут лише прибираємо стару кнопку з toolbar, якщо була.
      const oldBtn = document.getElementById(TS_IDS.btn);
      if (oldBtn) oldBtn.remove();
      const badge = document.getElementById(TS_IDS.badge);
      if (badge) return;
      const toolbar = document.getElementById("arv-toolbar");
      const span = document.createElement("span");
      span.id = TS_IDS.badge;
      span.textContent = "";
      span.style.marginLeft = "8px";
      if (toolbar) toolbar.appendChild(span);
      else {
        span.style.position = "fixed";
        span.style.top = "18px";
        span.style.left = "60px";
        span.style.zIndex = "999999";
        document.body.appendChild(span);
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
      function isCkFinderWindow(doc = document) {
        const t = (doc.title || "").toLowerCase();
        if (t.includes("ckfinder")) return true;

        if (
          doc.querySelector(
            '[class^="ckf-"], [class*=" ckf-"], .ckf, #ckf, #ckfinder',
          )
        )
          return true;

        return false;
      }

      if (isCkFinderWindow()) return;

      if (window.__arvToastScannerInited) return;
      window.__arvToastScannerInited = true;

      // Після reload для скану: прапорець вже встановлено перед reload, тепер запускаємо скан
      try {
        if (sessionStorage.getItem("arv_scan_after_reload")) {
          sessionStorage.removeItem("arv_scan_after_reload");
          ensureStylesOnce();
          ensurePanelOnce();
          loadSettings();
          ensureSettingsBox();
          const toolbar = document.getElementById("arv-toolbar");
          if (toolbar) ensureScanButton();
          else {
            document.getElementById(TS_IDS.btn)?.remove();
            document.getElementById(TS_IDS.badge)?.remove();
          }
          hookManualOpenClicksOnce();
          hookUrlCaseDetectionOnce();
          renderFromStorage();
          startAuto();
          runScan({ mode: "both", force: true, skipReloadCheck: true });
          return;
        }
      } catch (e) {}

      ensureStylesOnce();
      ensurePanelOnce();
      loadSettings();
      ensureSettingsBox();

      const toolbar = document.getElementById("arv-toolbar");
      if (!toolbar) {
        document.getElementById(TS_IDS.btn)?.remove();
        document.getElementById(TS_IDS.badge)?.remove();
      } else {
        ensureScanButton();
      }

      hookManualOpenClicksOnce();
      hookUrlCaseDetectionOnce();

      renderFromStorage();
      startAuto();
      runScan({ mode: "both", force: false });
    }

    return { init, runScan };
  })();

  /***************************************************************************
   * SF Urgency Guard (ServiceFlow: system.serviceflow.pl)
   ***************************************************************************/
  const SFGuard = (() => {
    const HOST = "system.serviceflow.pl";
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const VIEW_ID_RE = /\/view\/(\d+)/;
    const FLOW_CARD_TITLE = "DATA ZAKOŃCZENIA NAPRAWY";
    const FLOW_WAIT_MS = 4500;
    const IGNORE_URGENT_IF_SAMOLIKWIDACJA = true; // MVP: можна ігнорувати терміновість при самоліквідації
    /** Паузи (мс) після "Tak" перед закриттям модалки і перед запуском друку. Зменш — менша затримка. */
    const AFTER_TAK_DELAY_MS = 150;
    const AFTER_MODAL_CLOSE_DELAY_MS = 150;

    let bypassGuardOnce = false;
    /** Збережений стан чекбоксів модалки друку (для bulk після закриття модалки дати/терміновості). */
    let savedBulkPrintState = null;

    function getCaseId() {
      const m = location.pathname.match(VIEW_ID_RE);
      if (m) return m[1];
      const segs = location.pathname.split("/").filter(Boolean);
      return segs.length ? segs[segs.length - 1] : null;
    }

    function getRepairEndDateSync() {
      const cards = $$(".sb-title");
      for (const titleEl of cards) {
        if (!titleEl?.textContent?.includes(FLOW_CARD_TITLE)) continue;
        const card =
          titleEl.closest(".card") ||
          titleEl.closest('[class*="card"]') ||
          titleEl.parentElement;
        if (!card) continue;
        const valueEl =
          card.querySelector(".sb-text .text-bold") ||
          card.querySelector(".gray.text-bold.margin-t5");
        const raw = valueEl ? String(valueEl.textContent || "").trim() : "—";
        return raw === "—" ? null : raw;
      }
      return null;
    }

    function waitForFlowCard() {
      return new Promise((resolve) => {
        const titleEl = [...$$(".sb-title")].find((el) =>
          el.textContent?.includes(FLOW_CARD_TITLE),
        );
        if (titleEl) {
          resolve(getRepairEndDateSync());
          return;
        }
        const deadline = Date.now() + FLOW_WAIT_MS;
        const observer = new MutationObserver(() => {
          if (Date.now() > deadline) {
            observer.disconnect();
            resolve(getRepairEndDateSync());
            return;
          }
          const card = [...$$(".sb-title")].find((el) =>
            el.textContent?.includes(FLOW_CARD_TITLE),
          );
          if (card) {
            observer.disconnect();
            resolve(getRepairEndDateSync());
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(getRepairEndDateSync());
        }, FLOW_WAIT_MS);
      });
    }

    async function getRepairEndDate() {
      const hash = location.hash || "#main_data";
      if (hash !== "#flow") {
        location.hash = "#flow";
        return waitForFlowCard();
      }
      return Promise.resolve(getRepairEndDateSync());
    }

    function repairEndDateValid(dateStr) {
      return (
        typeof dateStr === "string" &&
        dateStr !== "—" &&
        DATE_RE.test(dateStr.trim())
      );
    }

    function findUrgentButton() {
      const span = document.querySelector(
        ".case-actions span.glyphicon.fire, .btn-flow-status span.glyphicon.fire",
      );
      return span?.closest("button") || null;
    }

    function getUrgentNoAccessReason() {
      const btn = findUrgentButton();
      if (!btn) return null;
      const t = (
        btn.getAttribute("data-original-title") ||
        btn.getAttribute("title") ||
        ""
      ).toLowerCase();
      if (t.includes("brak dostępu") || /tryb pilny.*brak dostępu/i.test(t))
        return "brak dostępu";
      return null;
    }

    /** Терміновість увімкнена тільки якщо в шапці справи є вогник (.case-main-statuses), не за класами кнопки. */
    function isUrgentActive() {
      const headerFire = document.querySelector(
        ".case-main-statuses .glyphicon.fire",
      );
      return Boolean(headerFire);
    }

    function isSelfSettlement() {
      if (!IGNORE_URGENT_IF_SAMOLIKWIDACJA) return false;
      const titles = $$(".sb-title");
      for (const t of titles) {
        if (!t?.textContent?.includes("OPIS USZKODZEŃ")) continue;
        const card =
          t.closest(".card") || t.closest('[class*="card"]') || t.parentElement;
        if (!card) continue;
        const textEl = card.querySelector(".sb-text");
        const text = textEl ? String(textEl.textContent || "") : "";
        if (/samolikwidacja/i.test(text)) return true;
      }
      return false;
    }

    /** Заглушка: майбутня перевірка по rents. Повертає null (unknown). */
    function shouldBeUrgentByRent(caseNumber) {
      return null;
    }

    function openPrintUrl(url) {
      const abs = toAbsUrl(url);
      if (abs) window.open(abs, "_blank", "noopener,noreferrer");
    }

    /** Чекає поки зникне модалка SF (.modal.in / .modal.show). Resolve(true) коли закрито, інакше після timeout. */
    function waitForModalClose(timeoutMs) {
      const deadline = Date.now() + (timeoutMs || 15000);
      return new Promise((resolve) => {
        function check() {
          if (Date.now() > deadline) {
            resolve(false);
            return;
          }
          const openModal = document.querySelector(".modal.in, .modal.show");
          if (!openModal) {
            resolve(true);
            return;
          }
          setTimeout(check, 150);
        }
        check();
      });
    }

    /** Після збереження дати чекає, поки в картці #flow з'явиться валідна дата YYYY-MM-DD. */
    async function waitForValidRepairDate(timeoutMs) {
      const deadline = Date.now() + (timeoutMs || 20000);
      while (Date.now() < deadline) {
        const dateRaw = await getRepairEndDate();
        if (repairEndDateValid(dateRaw)) return true;
        await new Promise((r) => setTimeout(r, 300));
      }
      return false;
    }

    function isDateModal(modal) {
      if (!modal) return false;
      if (modal.querySelector(".print-documents-list")) return false;
      const text = (modal.textContent || "").toLowerCase();
      if (
        text.includes("zakończenia naprawy") &&
        !text.includes("dokumenty do wydruku")
      )
        return true;
      if (
        modal.querySelector(
          'input[name*="repair_date"], input[id*="indicative_repair_date"]',
        ) &&
        !modal.querySelector(".print-documents-list")
      )
        return true;
      return false;
    }

    function findDateModal() {
      const modals = document.querySelectorAll(".modal.in, .modal.show");
      for (const m of modals) {
        if (isDateModal(m)) return m;
      }
      return null;
    }

    function getActivePrintList() {
      const modals = document.querySelectorAll(".modal.in, .modal.show");
      for (let i = modals.length - 1; i >= 0; i--) {
        const list = modals[i].querySelector(".print-documents-list");
        if (list) return list;
      }
      return null;
    }

    /** Чекає поки з’явиться модалка дати, потім поки вона закриється. */
    function waitForDateModalClose(timeoutMs) {
      const deadline = Date.now() + (timeoutMs || 120000);
      const appearDeadline = Date.now() + 8000;
      return new Promise((resolve) => {
        function waitForAppear() {
          if (Date.now() > appearDeadline) {
            resolve(false);
            return;
          }
          const dateModal = findDateModal();
          if (dateModal) {
            waitForClose();
            return;
          }
          setTimeout(waitForAppear, 150);
        }
        function waitForClose() {
          if (Date.now() > deadline) {
            resolve(false);
            return;
          }
          const dateModal = findDateModal();
          if (!dateModal) {
            resolve(true);
            return;
          }
          const hasShow =
            dateModal.classList.contains("show") ||
            dateModal.classList.contains("in");
          if (!hasShow || !document.body.contains(dateModal)) {
            resolve(true);
            return;
          }
          setTimeout(waitForClose, 150);
        }
        setTimeout(waitForAppear, 400);
      });
    }

    /** Шукає в DOM кнопку "Zapisz" у відкритій модалці і чекає кліку по ній (або timeout). */
    function waitForZapiszClick(timeoutMs) {
      const maxWait = timeoutMs || 120000;
      return new Promise((resolve) => {
        let resolved = false;
        const cleanup = () => {
          document.removeEventListener("click", onClick, true);
          if (timeoutId) clearTimeout(timeoutId);
        };
        const buttonText = (el) => {
          const t = el.querySelector?.(".text")
            ? el.querySelector(".text").textContent
            : el.textContent || el.value || "";
          return String(t).trim().toLowerCase();
        };
        const onClick = (e) => {
          if (resolved) return;
          const modal = findDateModal();
          if (!modal) return;
          const btn = e.target.closest(
            "button, input[type=submit], a.btn, [role=button]",
          );
          if (!btn || !modal.contains(btn)) return;
          const text = buttonText(btn);
          if (!text || text.indexOf("zapisz") === -1) return;
          resolved = true;
          cleanup();
          console.log("[SF Guard] Zapisz clicked in date modal");
          resolve(true);
        };
        document.addEventListener("click", onClick, true);
        const timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          resolve(false);
        }, maxWait);
      });
    }

    /** Шукає кнопку підтвердження у модалці (Tak/Yes/OK) і клікає. Повертає Promise<boolean>. */
    function waitForAndClickTakButton(maxMs) {
      const deadline = Date.now() + (maxMs || 8000);
      return new Promise((resolve) => {
        function getVisibleModals() {
          return Array.from(
            document.querySelectorAll(".modal.in, .modal.show"),
          );
        }
        function isConfirmLabel(text) {
          const t = (text || "").trim().toLowerCase();
          return (
            t === "tak" ||
            t.startsWith("tak ") ||
            t === "yes" ||
            t === "ok" ||
            t === "potwierdź" ||
            t === "potwierdz"
          );
        }
        function findTakButton() {
          const modals = getVisibleModals();
          if (!modals.length) return null;
          // Спочатку шукаємо в останній (верхній) модалці.
          const modal = modals[modals.length - 1];
          const candidates = modal.querySelectorAll(
            "button.btn-success, button[class*='success'], .modal-footer button, .modal button",
          );
          for (const b of candidates) {
            const text = (b.textContent || "").trim();
            const inner = b.querySelector(".text")?.textContent?.trim() || "";
            const combined = (text + " " + inner).trim().toLowerCase();
            if (isConfirmLabel(combined)) {
              return b;
            }
          }
          return null;
        }
        function check() {
          if (Date.now() > deadline) {
            console.log("[SF Guard] Tak button not found within timeout");
            resolve(false);
            return;
          }
          // Якщо користувач уже підтвердив вручну і tryb активний — вважаємо flow успішним.
          if (isUrgentActive()) {
            resolve(true);
            return;
          }
          const takBtn = findTakButton();
          if (takBtn) {
            try {
              takBtn.click();
              console.log("[SF Guard] Clicked Tak in confirmation modal");
              resolve(true);
              return;
            } catch (e) {
              console.warn("[SF Guard] Tak click error:", e);
            }
          }
          setTimeout(check, 200);
        }
        setTimeout(check, 150);
      });
    }

    /** Збирає стан чекбоксів з модалки друку. Повертає null, якщо таблиці нема в DOM. */
    function savePrintModalState() {
      const list = getActivePrintList();
      if (!list) return null;
      const ids = [];
      const comments = [];
      const detriments = [];
      list
        .querySelectorAll('input[name="ids[]"]:checked')
        .forEach((inp) => ids.push(inp.value));
      list
        .querySelectorAll('input[name="comments[]"]:checked')
        .forEach((inp) => comments.push(inp.value));
      list
        .querySelectorAll('input[name="detriments[]"]:checked')
        .forEach((inp) => detriments.push(inp.value));
      const updateEl = document.getElementById("updateAfterPrint");
      const updateAfterPrint = updateEl ? !!updateEl.checked : true;
      return { ids, comments, detriments, updateAfterPrint };
    }

    /** Відновлює стан чекбоксів у модалці друку; викликає change для оновлення логіки сторінки. */
    function restorePrintModalState(state) {
      if (!state) return;
      const list = getActivePrintList();
      if (!list) {
        console.log("[SF Guard] Print list not in DOM, cannot restore state");
        return;
      }
      const fireChange = (inp) => {
        try {
          inp.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {}
      };
      list.querySelectorAll('input[name="ids[]"]').forEach((inp) => {
        inp.checked = state.ids.indexOf(inp.value) !== -1;
        fireChange(inp);
      });
      list.querySelectorAll('input[name="comments[]"]').forEach((inp) => {
        inp.checked = state.comments.indexOf(inp.value) !== -1;
        fireChange(inp);
      });
      list.querySelectorAll('input[name="detriments[]"]').forEach((inp) => {
        inp.checked = state.detriments.indexOf(inp.value) !== -1;
        fireChange(inp);
      });
      const updateEl = document.getElementById("updateAfterPrint");
      if (updateEl) {
        updateEl.checked = !!state.updateAfterPrint;
        fireChange(updateEl);
      }
      console.log("[SF Guard] Restored print modal checkbox state");
    }

    /** Відкриває модалку "Dokumenty do wydruku", якщо вона закрита. Resolve(true) коли таблиця в DOM. */
    function ensurePrintModalOpen() {
      if (getActivePrintList()) {
        return Promise.resolve(true);
      }
      const openBtn =
        document.querySelector(
          'button.smc-auto-modal[url^="/dmg_case/print_document/list/"]',
        ) ||
        document.querySelector(
          'button.btn-flow-status.smc-auto-modal[url*="print_document/list"]',
        );
      if (!openBtn) return Promise.resolve(false);
      try {
        openBtn.click();
      } catch (e) {
        console.warn("[SF Guard] Click to open print modal error:", e);
        return Promise.resolve(false);
      }
      const deadline = Date.now() + 6000;
      return new Promise((resolve) => {
        function check() {
          if (getActivePrintList()) {
            resolve(true);
            return;
          }
          if (Date.now() > deadline) {
            resolve(false);
            return;
          }
          setTimeout(check, 100);
        }
        setTimeout(check, 200);
      });
    }

    /** Викликає нативну SF-функцію друку обраних документів (кнопка "Drukuj zaznaczone"). */
    async function runBulkPrint() {
      const state = savedBulkPrintState;
      const expectedIdsCount = state?.ids?.length || 0;

      if (state && expectedIdsCount > 0) {
        let restored = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          const list = getActivePrintList();
          if (!list) {
            const opened = await ensurePrintModalOpen();
            if (!opened) {
              console.warn("[SF Guard] Could not open print modal for restore");
              await new Promise((r) => setTimeout(r, 300));
              continue;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          restorePrintModalState(state);
          await new Promise((r) => setTimeout(r, 220));
          // Повторний restore для стабільності, бо SF інколи перезаписує checkboxes після re-render.
          restorePrintModalState(state);
          await new Promise((r) => setTimeout(r, 220));
          const selectedNow = document.querySelectorAll(
            '.modal.in .print-documents-list input[name="ids[]"]:checked, .modal.show .print-documents-list input[name="ids[]"]:checked',
          ).length;
          if (selectedNow >= expectedIdsCount) {
            restored = true;
            console.log(
              "[SF Guard] Bulk print state restored:",
              selectedNow,
              "selected",
            );
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!restored) {
          console.warn(
            "[SF Guard] Bulk print aborted: could not restore selected ids",
          );
          return;
        }
      }

      const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      if (typeof w.printDocuments === "function") {
        let selectedBeforePrint = document.querySelectorAll(
          '.modal.in .print-documents-list input[name="ids[]"]:checked, .modal.show .print-documents-list input[name="ids[]"]:checked',
        ).length;
        if (state && expectedIdsCount > 0 && selectedBeforePrint === 0) {
          const opened = await ensurePrintModalOpen();
          if (opened) {
            restorePrintModalState(state);
            await new Promise((r) => setTimeout(r, 220));
            selectedBeforePrint = document.querySelectorAll(
              '.modal.in .print-documents-list input[name="ids[]"]:checked, .modal.show .print-documents-list input[name="ids[]"]:checked',
            ).length;
          }
        }
        if (state && expectedIdsCount > 0 && selectedBeforePrint === 0) {
          console.warn(
            "[SF Guard] Bulk print aborted: no selected ids before printDocuments",
          );
          return;
        }
        w.printDocuments();
        savedBulkPrintState = null;
        console.log("[SF Guard] Bulk print: printDocuments() called");
      } else {
        console.warn("[SF Guard] printDocuments not found");
      }
    }

    function showGuardModal(opts) {
      const {
        message = "Nie zaznaczono daty końca naprawy i trybu. Czy chcesz to wydrukować?",
        onSetDate,
        onSetUrgent,
        onPrintAnyway,
      } = opts;
      const overlay = ce("div", {
        className: "sf-guard-overlay",
        style:
          "position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:99999;",
      });
      const box = ce("div", {
        style:
          "background:#fff;border-radius:8px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.25);overflow:hidden;font-family:Arial,Helvetica,sans-serif;",
      });
      const header = ce("div", {
        style:
          "background:#4A4A4A;color:#fff;padding:12px 40px 12px 16px;font-size:16px;font-weight:600;position:relative;",
      });
      header.textContent = "Druk — wymagania";
      const closeBtn = ce("button", {
        type: "button",
        textContent: "×",
        style:
          "position:absolute;top:50%;right:8px;transform:translateY(-50%);width:28px;height:28px;border:none;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0;border-radius:4px;",
      });
      closeBtn.addEventListener("click", () => overlay.remove());
      const body = ce("div", {
        style: "padding:20px 16px;color:#333;font-size:14px;line-height:1.5;",
      });
      body.append(ce("p", { textContent: message, style: "margin:0;" }));
      const footer = ce("div", {
        style:
          "background:#F5F5F5;border-top:1px solid #E0E0E0;padding:12px 16px;text-align:right;",
      });
      const btnWrap = ce("div", {
        style:
          "display:inline-flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;",
      });
      const btnStyle =
        "padding:8px 16px;cursor:pointer;border:none;border-radius:4px;font-size:14px;font-weight:bold;font-family:inherit;";
      const btnSecondary = btnStyle + "background:#F2A64E;color:#fff;";
      const btnPrimary = btnStyle + "background:#5CB85C;color:#fff;";

      if (onSetDate) {
        const b = ce("button", {
          textContent: "Wprowadzić datę",
          style: btnSecondary,
        });
        b.addEventListener("click", () => {
          overlay.remove();
          onSetDate();
        });
        btnWrap.append(b);
      }
      if (onSetUrgent) {
        const b = ce("button", {
          textContent: "Zaznaczyć tryb",
          style: btnSecondary,
        });
        b.addEventListener("click", () => {
          overlay.remove();
          onSetUrgent();
        });
        btnWrap.append(b);
      }
      if (onPrintAnyway) {
        const b = ce("button", {
          textContent: "Drukuj",
          style: btnPrimary,
        });
        b.addEventListener("click", () => {
          overlay.remove();
          onPrintAnyway();
        });
        btnWrap.append(b);
      }
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      header.append(closeBtn);
      box.append(header, body, footer);
      footer.append(btnWrap);
      overlay.append(box);
      document.body.appendChild(overlay);
    }

    function closeGuardOverlays() {
      document
        .querySelectorAll(".sf-guard-overlay")
        .forEach((el) => el.remove());
    }

    function injectModalStyles() {
      if (document.getElementById("sf-guard-modal-styles")) return;
      const style = ce("style", {
        id: "sf-guard-modal-styles",
        textContent: ".sf-guard-overlay button:hover{opacity:.9;}",
      });
      document.head.appendChild(style);
    }

    async function runGuard(printUrl, printBtn, opts) {
      opts = opts || {};
      const isBulk = opts.bulk === true;

      const caseId = getCaseId();
      const dateRaw = await getRepairEndDate();
      const dateOk = repairEndDateValid(dateRaw);
      const urgentActive = isUrgentActive();
      const urgentNoAccess = getUrgentNoAccessReason();
      const samolikwidacja = isSelfSettlement();

      const proceedPrint = () => {
        if (isBulk) runBulkPrint();
        else {
          bypassGuardOnce = true;
          openPrintUrl(printUrl);
        }
      };

      /* Модалку не показуємо тільки якщо є і дата, і триб — тоді одразу друк (як на порталі СФ). */
      if (dateOk && urgentActive) {
        console.log("[SF Guard] Data i tryb OK, druk bez modalki");
        proceedPrint();
        return;
      }

      const missing = [];
      if (!dateOk) missing.push("data");
      if (!urgentActive) {
        missing.push(urgentNoAccess ? "tryb (brak dostępu)" : "tryb");
      }
      const msg = `Nie zaznaczone: ${missing.join(" / ")}. Czy chcesz to wydrukować?`;

      showGuardModal({
        message: msg,
        onSetDate: dateOk
          ? undefined
          : function onSetDate() {
              if (!caseId) {
                console.warn("[SF Guard] No caseId for Set date");
                return;
              }
              // Гарантовано прибираємо нашу модалку перед відкриттям SF-модалки дати.
              closeGuardOverlays();
              const w =
                typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
              if (typeof w.smcAutoModal === "function") {
                w.smcAutoModal("/dmg_case/repair_date_new_service/" + caseId);
              }
              console.log(
                "[SF Guard] Opened date modal, waiting for close then continuing print",
              );
              (async () => {
                const zapiszClicked = await waitForZapiszClick(120000);
                if (!zapiszClicked) {
                  console.log(
                    "[SF Guard] Set date: Zapisz click not detected, waiting for close and re-checking date",
                  );
                }
                const dateApplied = await waitForValidRepairDate(25000);
                if (!dateApplied) {
                  console.log(
                    "[SF Guard] Set date: date still invalid after save, stopping print",
                  );
                  return;
                }
                console.log(
                  "[SF Guard] Date modal saved, proceeding with print",
                );
                proceedPrint();
              })();
            },
        onSetUrgent() {
          if (isBulk) {
            const currentBulkState = savePrintModalState();
            if (currentBulkState && (currentBulkState.ids?.length || 0) > 0) {
              savedBulkPrintState = currentBulkState;
              console.log(
                "[SF Guard] Refreshed bulk state before urgent flow:",
                currentBulkState.ids.length,
                "doc(s)",
              );
            }
          }
          const btn = findUrgentButton();
          if (!btn) {
            showGuardModal({
              message: "Brak dostępu do zmiany trybu. Zadzwoń do operatora.",
              onPrintAnyway: () => runGuard(printUrl, printBtn, opts),
            });
            return;
          }
          if (getUrgentNoAccessReason()) {
            showGuardModal({
              message: "Brak dostępu do zmiany trybu. Zadzwoń do operatora.",
              onPrintAnyway: () => runGuard(printUrl, printBtn, opts),
            });
            return;
          }
          try {
            btn.click();
            console.log(
              "[SF Guard] Clicked urgent button, waiting for Tak then continuing print",
            );
          } catch (e) {
            console.warn("[SF Guard] Urgent click error:", e);
            return;
          }
          (async () => {
            const takClicked = await waitForAndClickTakButton(8000);
            if (!takClicked) {
              // Остання перевірка: можливо оператор натиснув підтвердження вручну раніше.
              await new Promise((r) => setTimeout(r, 250));
              if (!isUrgentActive()) {
                console.log("[SF Guard] Urgent flow aborted: Tak not clicked");
                return;
              }
              console.log(
                "[SF Guard] Tak not detected, but tryb is active; continuing",
              );
            }
            await new Promise((r) => setTimeout(r, AFTER_TAK_DELAY_MS));
            await waitForModalClose(1200);
            await new Promise((r) => setTimeout(r, AFTER_MODAL_CLOSE_DELAY_MS));
            console.log("[SF Guard] Urgent flow done, proceeding with print");
            proceedPrint();
          })();
        },
        onPrintAnyway: proceedPrint,
      });
    }

    function onDocumentClick(e) {
      if (location.host !== HOST) return;

      const bulkBtn = e.target.closest("#printAll, button#printAll");
      if (bulkBtn) {
        savedBulkPrintState = savePrintModalState();
        if (!savedBulkPrintState || savedBulkPrintState.ids.length === 0) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        console.log(
          "[SF Guard] Saved bulk print state for",
          savedBulkPrintState.ids.length,
          "doc(s)",
        );
        runGuard(null, null, { bulk: true }).catch((err) =>
          console.warn("[SF Guard] runGuard bulk error:", err),
        );
        return;
      }

      const btn = e.target.closest("button.document-print[url]");
      if (!btn) return;
      const printUrl = btn.getAttribute("url");
      if (!printUrl) return;

      if (bypassGuardOnce) {
        bypassGuardOnce = false;
        openPrintUrl(printUrl);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      runGuard(printUrl, btn).catch((err) =>
        console.warn("[SF Guard] runGuard error:", err),
      );
    }

    function init() {
      if (location.host !== HOST) {
        console.log("[SF Guard] Skipped (not on " + HOST + ")");
        return;
      }
      injectModalStyles();
      document.addEventListener("click", onDocumentClick, true);
      console.log("[SF Guard] init OK");
    }

    return { init };
  })();

  /***************************************************************************
   * BOOT
   ***************************************************************************/
  const isArvalPage = () => location.host === "serwisarval.pl";
  if (isArvalPage()) {
    MenuHider.initOnce();
    MenuHider.rearm();
  }

  const bootDates = () => DateCol.init();
  const bootChat = () => ChatTools.init();
  const bootToasts = () => ToastScanner.init();
  const bootSF = () => SFGuard.init();

  const boot = () => {
    bootDates();
    bootChat();
    if (isArvalPage()) bootToasts();
    bootSF();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
