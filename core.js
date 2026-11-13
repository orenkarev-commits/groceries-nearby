// Engine: prices, translation, list, map, motion helpers. web/app.js draws the screen with it.
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ils = v => "₪" + (Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2));
const isHeb = s => /[֐-׿]/.test(s);
const norm = s => String(s || "").replace(/[֑-ׇ]/g, "").replace(/[״“”]/g, '"').replace(/[׳‘’`]/g, "'").replace(/\s+/g, " ").trim();
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)", EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

// ---------- brands
const BRAND = {
  "Tiv Taam": ["#8C1D40", "TT"], "AM:PM": ["#F29F05", "am:pm", true], "Good Pharm": ["#7A3FB0", "GP"], "Super-Pharm": ["#C8102E", "SP"],
  "Shufersal": ["#E2231A", "S"], "Shufersal Express": ["#E2231A", "S"], "Shufersal Sheli": ["#E2231A", "S"], "Shufersal Deal": ["#E2231A", "S"],
  "Be Pharm": ["#00A0B0", "Be"], "Carrefour City": ["#2E6FD8", "C"], "Carrefour Market": ["#2E6FD8", "C"], "Carrefour": ["#2E6FD8", "C"],
  "Victory": ["#0090C8", "V"], "Victory City": ["#0090C8", "V"], "Yohananof": ["#009B4E", "Y"], "Rami Levy": ["#D9412B", "RL"],
  "Super Cofix": ["#3D3D3D", "Cx"], "Super Yuda": ["#5B8C2A", "SY"], "Fresh Market": ["#5B8C2A", "FM"], "Wolt Market": ["#009DE0", "W"],
};
function brandOf(s) {
  const n = s.name || "";
  if (s.chain === "Shufersal") return /^\s*BE\b/i.test(n) ? "Be Pharm" : /אקספרס/.test(n) ? "Shufersal Express" : /דיל/.test(n) ? "Shufersal Deal" : /שלי/.test(n) ? "Shufersal Sheli" : "Shufersal";
  if (s.chain === "Carrefour") return /מרקט/.test(n) ? "Carrefour Market" : /סיטי/.test(n) ? "Carrefour City" : "Carrefour";
  if (s.chain === "Victory") return /סיטי/.test(n) ? "Victory City" : "Victory";
  if (s.chain === "Fresh Market") return +s.store_id >= 300 ? "Super Yuda" : "Fresh Market";
  return s.chain;
}
const bColor = s => (BRAND[brandOf(s)] || ["#5A6A62"])[0];
const bShort = s => (BRAND[brandOf(s)] || [0, "•"])[1];
const bLight = s => !!(BRAND[brandOf(s)] || [])[2];
const ADDR_FIX = { "קניון גינדי - רחוב קרליבך": "קניון TLV, קרליבך", "רושטילד 38": "רוטשילד 38" };
function addr(s) { const a = (s.address || "").replace(/\s*(תל[- ]אביב(-יפו)?|ת"א)\s*$/, "").trim(); return ADDR_FIX[a] || a; }
const locHTML = s => `<bdi dir="rtl">${esc(addr(s))}</bdi>`;
const pillHTML = s => `<span class="b-pill${bLight(s) ? " light" : ""}" style="--c:${bColor(s)}">${esc(brandOf(s))}</span>`;

// ---------- state + events
const S = { stores: [], items: [], byKey: new Map(), walk: 10, club: false, list: [], home: null, walkCfg: null, termCache: new Map(), sel: null };
const listeners = new Set();
const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
function emit(what) { S.termCache.clear(); listeners.forEach(fn => fn(what)); }

// ---------- glossary
const EN = new Map(), HE = new Map();
GLOSSARY.forEach((row, i) => {
  row[0].forEach(e => { if (!EN.has(e.toLowerCase())) EN.set(e.toLowerCase(), i); });
  row[1].forEach(h => { const k = norm(h); if (k.length >= 2 && !HE.has(k)) HE.set(k, i); });
});
const PREFIX = /^(ו|ה|ב|ל|מ|ש|כ|וה|שה|וב|ול|ומ)(?=.{2,})/;
function heLookup(t) { t = norm(t).replace(/[,.()]/g, ""); if (HE.has(t)) return HE.get(t); const s = t.replace(PREFIX, ""); return HE.has(s) ? HE.get(s) : undefined; }
const UNIT_EN = [[/ק"ג|קילוגרם|קילו/g, "kg"], [/מ"ל|מיליליטר|מל(?=\b|$)/g, "ml"], [/ליטר|ל'/g, "L"], [/גרם|גר'|גר(?=\b|$)|ג'/g, "g"], [/יח'|יחידות|יחידה|יח(?=\b|$)/g, " pcs"]];
function unitGloss(t) { let s = t; UNIT_EN.forEach(([re, r]) => { s = s.replace(re, r); }); return isHeb(s) ? null : s.trim(); }
function glossHe(text) {
  const toks = norm(text).split(" ").filter(Boolean); const out = []; let known = 0, total = 0;
  for (let i = 0; i < toks.length;) {
    let hit, L;
    for (L = Math.min(3, toks.length - i); L >= 1; L--) { hit = heLookup(toks.slice(i, i + L).join(" ")); if (hit !== undefined) break; }
    if (hit !== undefined) { out.push(GLOSSARY[hit][0][0]); known++; total++; i += L; continue; }
    const t = toks[i]; i++;
    if (/\d/.test(t)) { out.push(unitGloss(t) || t); continue; }
    if (!isHeb(t)) { out.push(t); continue; }
    total++; if (out[out.length - 1] !== "…") out.push("…");
  }
  return { text: out.join(" ").replace(/\s+/g, " ").trim(), known, total };
}
function glossEn(text) {
  const words = text.toLowerCase().replace(/[,.;:!?]/g, " ").split(/\s+/).filter(Boolean); const groups = []; let known = 0;
  for (let i = 0; i < words.length;) {
    let hit, L;
    for (L = Math.min(3, words.length - i); L >= 1; L--) {
      const ph = words.slice(i, i + L).join(" "); hit = EN.get(ph);
      if (hit === undefined && L === 1) hit = EN.get(ph.replace(/(ies)$/, "y")) ?? EN.get(ph.replace(/(es|s)$/, ""));
      if (hit !== undefined) break;
    }
    if (hit !== undefined) { groups.push({ label: words.slice(i, i + L).join(" "), idx: hit }); known++; i += L; }
    else { groups.push({ label: words[i], idx: undefined }); i++; }
  }
  return { text: groups.map(g => g.idx !== undefined ? GLOSSARY[g.idx][1][0] : g.label).join(" "), groups, known, total: groups.length };
}
function parseQuery(q) {
  q = norm(q); if (!q) return null;
  if (isHeb(q)) return { groups: q.split(" ").filter(Boolean).map(w => ({ label: w, alts: [w.toLowerCase()] })), en: glossHe(q).text, he: q };
  const g = glossEn(q);
  const groups = g.groups.map(x => x.idx !== undefined
    ? { label: x.label, he: GLOSSARY[x.idx][1][0], alts: GLOSSARY[x.idx][1].map(a => norm(a).toLowerCase()).filter(a => a.length >= 2 || /^[a-z]$/.test(a)) }
    : { label: x.label, alts: [x.label.toLowerCase()], literal: true });
  return { groups, en: q, he: g.known ? g.text : "" };
}

// ---------- prices
const hasPrices = s => s.status === "ok";
const inRange = () => S.stores.filter(s => hasPrices(s) && s.walk <= S.walk);
const noPriceNear = () => S.stores.filter(s => !hasPrices(s) && s.walk <= S.walk).sort((a, b) => a.walk - b.walk);
function noPriceWhy(s) {
  if (s.chain === "Victory") return "By law large chains publish every branch's prices, but Victory's official price site had no Victory files when last checked. Left out of the comparison until they appear.";
  if (brandOf(s) === "Super Yuda") return "Super Yuda branches have no price files on their chain's official price site, so this shop is left out of the comparison.";
  if (s.chain === "Super Cofix") return "Super Cofix publishes only its branch list, not its prices, so it's left out of the comparison.";
  return "No price files are published for this shop, so it's left out of the comparison.";
}
function offer(pr, n = 1) {
  const shelf = pr[0]; let total = n * shelf, promo = null;
  if (pr.length > 1 && (!pr[5] || S.club)) { const unit = pr[1], q = pr[2];
    if (n >= q) { const k = Math.floor(n / q); const t = k * q * unit + (n - k * q) * shelf; if (t < total - 0.004) { total = t; promo = pr; } } }
  return { total, shelf, promo };
}
const unitBest = pr => (pr.length > 1 && (!pr[5] || S.club)) ? { v: pr[1], pr, deal: true } : { v: pr[0], pr, deal: false };
function perUnit(price, it) {
  const q = it.q, u = it.u || ""; if (!q || q <= 0) return null;
  if (/גרם/.test(u)) return { v: price / q * 100, l: "100 g" }; if (/קילו/.test(u)) return { v: price / q, l: "kg" };
  if (/מיליליטר|מ"ל/.test(u)) return { v: price / q * 1000, l: "L" }; if (/ליטר/.test(u)) return { v: price / q, l: "L" };
  if (/יחיד/.test(u) && q > 1) return { v: price / q, l: "unit" }; return null;
}
const dealText = pr => pr[2] > 1 ? `${pr[2]} for ${ils(pr[1] * pr[2])}` : ils(pr[1]);
function priceHTML(pr) { const u = unitBest(pr); return u.deal ? `<span class="p-tag${pr[5] ? " club" : ""}" title="${esc(pr[3])}">${dealText(pr)}</span>` : `<span class="p-num">${ils(pr[0])}</span>`; }
function matches(groups, startOnly) {
  const ids = new Set(inRange().map(s => s.id)); const out = [];
  for (const it of S.items) {
    const h = it._h; let ok = true;
    for (const g of groups) { if (!g.alts.some(a => h.includes(a))) { ok = false; break; } }
    if (!ok) continue;
    const start = groups[0].alts.some(a => h.startsWith(a));
    if (startOnly && !start) continue;
    let n = 0, best = null;
    for (const sid in it.p) if (ids.has(+sid)) { n++; const u = unitBest(it.p[sid]); if (!best || u.v < best.v) best = { v: u.v, pr: it.p[sid], s: S.stores[+sid] }; }
    if (n) out.push({ it, n, best, score: (start ? 1000 : 0) + n * 3 - it.n.length / 25 });
  }
  return out.sort((a, b) => b.score - a.score);
}
const PROCESSED = ["מרוסק", "רסק", "רוטב", "שימורי", "מיובש", "יבשות", "ממרח", "חטיף", "בטעם", "טעם ", "אבקת", "מחית", "תרכיז", "משקה", "קפוא", "פריכיות", "מעדן", "כיף כף", "מקולפ", "חתוכ", "מבושל", "ממולא", "כבושים", "חמוצ", "קוביות", "מוחמצ", "2.5 a", "a 2.5"];
function termCandidates(line) {
  const key = line.alts.join("|") + "/" + S.walk + "/" + S.club;
  if (S.termCache.has(key)) return S.termCache.get(key);
  const groups = line.groups || [{ alts: line.alts }];
  let c = matches(groups, true); if (!c.length) c = matches(groups, false);
  // "tomatoes" means fresh tomatoes: drop processed or flavoured versions unless the words asked for them
  const asked = (line.alts.join(" ") + " " + (line.he || "")).toLowerCase();
  const plain = c.filter(m => !PROCESSED.some(w => m.it._h.includes(w) && !asked.includes(w)));
  if (plain.length) c = plain;
  // fresh produce is sold loose by the kilo; when shops have it, that's what a general item means
  const loose = c.filter(m => /קילו/.test(m.it.u || "") && m.it.q === 1 && m.it.n.split(" ").length <= 3);
  if (loose.length >= 2) c = loose;
  S.termCache.set(key, c); return c;
}
function priceAt(line, s) {
  if (line.k) { const it = S.byKey.get(line.k); const pr = it && it.p[s.id]; return pr ? { it, pr, o: offer(pr, line.qty) } : null; }
  if (line.alts) {
    let best = null;
    for (const m of termCandidates(line)) {
      const pr = m.it.p[s.id]; if (!pr) continue; const o = offer(pr, line.qty);
      const pu = perUnit(o.total / line.qty, m.it);
      const cand = { it: m.it, pr, o, v: pu ? pu.v : null, l: pu ? pu.l : null };
      if (!best) { best = cand; continue; }
      const better = cand.v != null && best.v != null && cand.l === best.l ? cand.v < best.v - 1e-9 : cand.o.total < best.o.total;
      if (better) best = cand;
    }
    return best;
  }
  return null;
}
const pricedLines = () => S.list.filter(l => (l.k && S.byKey.has(l.k)) || l.alts);
function baskets() {
  const lines = pricedLines();
  return inRange().map(s => {
    let total = 0, found = 0, saved = 0; const missing = [];
    for (const l of lines) { const r = priceAt(l, s); if (r) { total += r.o.total; saved += l.qty * r.o.shelf - r.o.total; found++; } else missing.push(l); }
    return { s, total, found, saved, missing };
  }).filter(r => r.found).sort((a, b) => b.found - a.found || a.total - b.total);
}
function bestFor(line) {
  let best = null;
  // general items compare by value (per kg / L) when both shops' products give one; exact products by price
  for (const s of inRange()) {
    const r = priceAt(line, s); if (!r) continue;
    if (!best) { best = { s, r }; continue; }
    const byValue = line.alts && r.v != null && best.r.v != null && r.l === best.r.l;
    if (byValue ? r.v < best.r.v - 1e-9 : r.o.total < best.r.o.total) best = { s, r };
  }
  return best;
}
function splitPlan() {
  let total = 0; const used = new Map();
  for (const l of pricedLines()) { const b = bestFor(l); if (b) { total += b.r.o.total; used.set(b.s.id, (used.get(b.s.id) || 0) + 1); } }
  return { total, shops: used.size };
}
const lineId = l => l.k || l.id;
function lineTitle(l) {
  if (l.k) { const it = S.byKey.get(l.k); const g = it ? glossHe(it.n) : null; return { en: g && g.known ? g.text : "", he: it ? it.n : l.n }; }
  if (l.alts) return { en: l.en || "", he: l.he || "" };
  return { en: isHeb(l.n) ? "" : l.n, he: isHeb(l.n) ? l.n : "" };
}

// ---------- list storage (same list as the app)
const LS_KEY = "tlvg-list-v1";
async function loadList() {
  if (LOCAL) return (await (await fetch("/api/list")).json()).items || [];
  try { return (JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}).items || []; } catch (e) { return []; }
}
let saveTimer;
function saveList() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const items = S.list.map(({ groups, ...rest }) => rest);
    if (LOCAL) fetch("/api/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).catch(() => {});
    else try { localStorage.setItem(LS_KEY, JSON.stringify({ items })); } catch (e) {}
  }, 200);
}
const uid = () => "l" + Math.random().toString(36).slice(2, 9);
function addFromSuggestion(g) {
  let line;
  if (g.type === "term") {
    line = S.list.find(l => l.alts && l.alts.join() === g.alts.join());
    if (line) line.qty++; else { line = { id: uid(), qty: 1, en: g.en, he: g.he, alts: g.alts, groups: g.groups }; S.list.push(line); }
  } else if (g.type === "product") {
    const k = g.m.it.k; line = S.list.find(l => l.k === k);
    if (line) line.qty++; else { line = { k, n: g.m.it.n, qty: 1 }; S.list.push(line); }
  } else { line = { id: uid(), n: g.text, qty: 1 }; S.list.push(line); }
  saveList(); emit({ added: lineId(line) }); return line;
}
function changeQty(id, d) { const l = S.list.find(x => lineId(x) === id); if (!l) return; l.qty += d; if (l.qty <= 0) S.list = S.list.filter(x => x !== l); saveList(); emit({ qty: id }); }
function removeLine(id) { S.list = S.list.filter(x => lineId(x) !== id); saveList(); emit({ removed: id }); }
function addText(text) { const pq = parseQuery(text); const sg = buildSuggestions(text); if (sg.length) addFromSuggestion(sg[0]); return pq; }

// ---------- suggestions (shared logic; each variant styles the popover)
function buildSuggestions(q) {
  q = q.trim(); if (!q) return [];
  const pq = parseQuery(q); const ms = matches(pq.groups, false); const out = [];
  if ((pq.groups.some(g => g.he) || isHeb(q)) && ms.length) {
    const term = { type: "term", en: isHeb(q) ? (pq.en.includes("…") ? "" : pq.en) : q, he: isHeb(q) ? q : pq.he, groups: pq.groups, alts: pq.groups[0].alts };
    const cands = matches(pq.groups, true);
    term.cheap = (cands.length ? cands : ms).reduce((a, b) => (!a || b.best.v < a.best.v) ? b : a, null);
    out.push(term);
  }
  ms.slice(0, 7).forEach(m => out.push({ type: "product", m }));
  if (!out.length) out.push({ type: "note", text: q });
  return out;
}
function suggestionHTML(g, i, sel) {
  if (g.type === "term") { const c = g.cheap;
    return `<li class="sg term" role="option" data-i="${i}" aria-selected="${i === sel}"><div class="sg-main"><span class="sg-kind">Any</span>
      <span class="sg-en">${esc(g.en || g.he)}</span>${g.en && g.he ? `<bdi class="sg-he" dir="rtl" lang="he">${esc(g.he)}</bdi>` : ""}</div>
      <div class="sg-side">${c ? `<span class="sg-from">from</span>${priceHTML(c.best.pr)}${pillHTML(c.best.s)}` : ""}</div></li>`; }
  if (g.type === "product") { const { it, best, n } = g.m; const gl = glossHe(it.n);
    return `<li class="sg" role="option" data-i="${i}" aria-selected="${i === sel}"><div class="sg-main"><bdi class="sg-he" dir="rtl" lang="he">${esc(it.n)}</bdi>
      <span class="sg-en">${gl.known ? esc(gl.text) : ""}<span class="sg-n"> · ${n} shop${n === 1 ? "" : "s"}</span></span></div>
      <div class="sg-side">${priceHTML(best.pr)}${pillHTML(best.s)}</div></li>`; }
  return `<li class="sg" role="option" data-i="${i}" aria-selected="true"><div class="sg-main"><span class="sg-kind">Note</span><span class="sg-en">${esc(g.text)}</span>
    <span class="sg-n">Not sold within ${S.walk} min; stays on the list unpriced</span></div></li>`;
}
// Builds input + popover inside `host`. Typing updates instantly (no motion: it happens every keystroke).
function composer(host, { placeholder, onAdd }) {
  host.innerHTML = `<div class="cmp-box"><input class="cmp-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
    placeholder="${esc(placeholder)}" aria-label="Add an item, in English or Hebrew" role="combobox" aria-expanded="false" aria-autocomplete="list">
    <ul class="cmp-pop" role="listbox" data-state="closed"></ul></div>`;
  const input = $(".cmp-input", host), pop = $(".cmp-pop", host); let items = [], sel = 0;
  const open = o => { pop.dataset.state = o ? "open" : "closed"; input.setAttribute("aria-expanded", o); };
  const render = () => { items = buildSuggestions(input.value); sel = 0; if (!items.length) return open(false); pop.innerHTML = items.map((g, i) => suggestionHTML(g, i, sel)).join(""); open(true); };
  const pick = i => { const g = items[i]; if (!g) return; const el = $(`.sg[data-i="${i}"]`, pop); const line = addFromSuggestion(g);
    input.value = ""; items = []; open(false); onAdd && onAdd(line, el, g); };
  input.addEventListener("input", render);
  input.addEventListener("focus", () => { if (input.value.trim()) render(); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      $$(".sg", pop).forEach(el => el.setAttribute("aria-selected", +el.dataset.i === sel)); const el = $(`.sg[data-i="${sel}"]`, pop); el && el.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
    else if (e.key === "Escape") open(false);
  });
  pop.addEventListener("mousedown", e => e.preventDefault());
  pop.addEventListener("click", e => { const el = e.target.closest(".sg"); if (el) pick(+el.dataset.i); });
  const outside = e => { if (!host.contains(e.target)) open(false); };
  document.addEventListener("click", outside);
  return { input, destroy: () => document.removeEventListener("click", outside), addText: t => { input.value = t; render(); pick(0); } };
}

// ---------- map (Leaflet + OpenStreetMap tiles, no key)
function makeMap(el, { onSelect, pinFor }) {
  if (!window.L) { el.innerHTML = `<p style="padding:20px">The map couldn't load.</p>`; return null; }
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([S.home.lat, S.home.lon], 16);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  if (dark) el.classList.add("dark-tiles");
  const r10 = 10 * S.walkCfg.m_per_min / S.walkCfg.detour, r14 = 14 * S.walkCfg.m_per_min / S.walkCfg.detour;
  const ring = getComputedStyle(el).getPropertyValue("--ring").trim() || "#1D7449";
  L.circle([S.home.lat, S.home.lon], { radius: r14, color: ring, weight: 1.5, dashArray: "5 7", fill: false, interactive: false }).addTo(map);
  L.circle([S.home.lat, S.home.lon], { radius: r10, color: ring, weight: 2, fillColor: ring, fillOpacity: .06, interactive: false }).addTo(map);
  L.marker([S.home.lat, S.home.lon], { interactive: false, keyboard: false, zIndexOffset: 5000, icon: L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="m-home">⌂</div>` }) }).addTo(map);
  const layer = L.layerGroup().addTo(map); const markers = new Map(); let route = null;
  function render() {
    const br = pricedLines().length ? baskets() : []; const rank = new Map(br.map((r, i) => [r.s.id, { i, t: r.total }]));
    const shown = S.stores.filter(s => s.lat && s.walk <= S.walk); const keep = new Set(shown.map(s => s.id));
    for (const [id, m] of markers) if (!keep.has(id)) { layer.removeLayer(m); markers.delete(id); }
    for (const s of shown) {
      const rk = rank.get(s.id); const html = pinFor(s, rk ? rk.i : -1, rk ? rk.t : null);
      const z = (S.sel === s.id ? 4000 : 0) + (rk && rk.i < 3 ? 2000 - rk.i * 100 : 0) + (hasPrices(s) ? 100 : 0);
      let m = markers.get(s.id);
      if (!m) { m = L.marker([s.lat, s.lon], { icon: L.divIcon({ className: "", html, iconSize: [0, 0] }), zIndexOffset: z, riseOnHover: true, title: brandOf(s) });
        m.on("click", e => { L.DomEvent.stopPropagation(e); onSelect(s.id); }); m.addTo(layer); markers.set(s.id, m); m._h = html; }
      else if (m._h !== html) { m.setIcon(L.divIcon({ className: "", html, iconSize: [0, 0] })); m.setZIndexOffset(z); m._h = html; }
    }
  }
  function select(id) {
    if (route) { map.removeLayer(route); route = null; }
    render();
    if (id == null) return;
    const s = S.stores[id]; if (!s.lat) return;
    route = L.polyline([[S.home.lat, S.home.lon], [s.lat, s.lon]], { color: bColor(s), weight: 3, dashArray: "1 8", lineCap: "round", interactive: false }).addTo(map);
    const pin = markers.get(id) && markers.get(id).getElement() && markers.get(id).getElement().firstElementChild;
    if (pin && !REDUCED) pin.animate([{ transform: "translate(-50%,-100%) translateY(0)" }, { transform: "translate(-50%,-100%) translateY(-10px)" }, { transform: "translate(-50%,-100%) translateY(0)" }], { duration: 320, easing: EASE_OUT });
    if (!map.getBounds().pad(-0.2).contains([s.lat, s.lon])) map.panTo([s.lat, s.lon], { animate: !REDUCED });
  }
  function fit(pad) {
    const r = (S.walk + 1) * S.walkCfg.m_per_min / S.walkCfg.detour; const dLat = r / 110540, dLon = r / (111320 * Math.cos(S.home.lat * Math.PI / 180));
    map.fitBounds([[S.home.lat - dLat, S.home.lon - dLon], [S.home.lat + dLat, S.home.lon + dLon]], { animate: false, paddingTopLeft: pad || [10, 10], paddingBottomRight: pad || [10, 10] });
  }
  map.on("click", () => onSelect(null));
  fit();
  return { map, render, select, fit, destroy: () => map.remove(), invalidate: () => map.invalidateSize() };
}
function directionsURL(s) {
  const dest = s.lat ? `${s.lat},${s.lon}` : encodeURIComponent(addr(s) + ", Tel Aviv");
  return `https://www.google.com/maps/dir/?api=1&origin=${S.home.lat},${S.home.lon}&destination=${dest}&travelmode=walking`;
}

// ---------- FLIP: animate elements from their old positions to new ones (for reordering)
function flipCapture(els) { const m = new Map(); els.forEach(el => m.set(el.dataset.key, el.getBoundingClientRect())); return m; }
function flipPlay(els, before, { duration = 260 } = {}) {
  if (REDUCED) return;
  els.forEach(el => { const a = before.get(el.dataset.key); if (!a) return; const b = el.getBoundingClientRect(); const dy = a.top - b.top, dx = a.left - b.left;
    if (Math.abs(dy) < 1 && Math.abs(dx) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration, easing: EASE_IN_OUT }); });
}
// Count a number up/down to its new value (state change the eye should follow; ~300ms).
function tween(el, to, fmt = ils, duration = 320) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (REDUCED || Math.abs(to - from) < 0.005) { el.textContent = fmt(to); return; }
  // timed from the first frame's own timestamp, clamped, so it can never run backwards or overshoot
  let t0 = null; el.textContent = fmt(from);
  const step = t => { if (t0 === null) t0 = t; const p = Math.max(0, Math.min(1, (t - t0) / duration)); const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e); if (p < 1 && +el.dataset.v === to) requestAnimationFrame(step); else if (+el.dataset.v === to) el.textContent = fmt(to); };
  requestAnimationFrame(step);
}

// ---------- sharing a list as a link (#list=…)
function encodeList(items) {
  const c = items.map(l => l.k ? [l.k, l.qty] : l.alts ? ["~", l.qty, l.en || "", l.he || "", l.alts] : [0, l.qty, l.n]);
  return btoa(unescape(encodeURIComponent(JSON.stringify(c)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeList(code) {
  return JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, "+").replace(/_/g, "/"))))).map(r =>
    r[0] === "~" ? { id: uid(), qty: +r[1] || 1, en: r[2], he: r[3], alts: r[4] }
    : r[0] ? { k: String(r[0]), n: (S.byKey.get(String(r[0])) || {}).n || String(r[0]), qty: +r[1] || 1 }
    : { id: uid(), n: String(r[2] || ""), qty: +r[1] || 1 });
}
// Merges a shared list from the URL into this device's list; returns how many items were new (or -1 if the link is broken).
function importShared() {
  const m = location.hash.match(/list=([\w-]+)/); if (!m) return 0;
  let added = 0;
  try {
    for (const it of decodeList(m[1])) {
      const same = S.list.find(l => (it.k && l.k === it.k) || (it.alts && l.alts && l.alts.join() === it.alts.join()) || (!it.k && !it.alts && l.n === it.n));
      if (same) same.qty = Math.max(same.qty, it.qty); else { S.list.push(it); added++; }
    }
    saveList();
  } catch (e) { added = -1; }
  history.replaceState(null, "", location.pathname);
  return added;
}

// ---------- boot
async function loadAll() {
  const [c, list] = await Promise.all([fetch("catalog.json", { cache: "no-cache" }).then(r => r.json()), loadList()]);
  S.stores = c.stores; S.home = c.home; S.walkCfg = c.walk; S.items = c.items; S.generated = c.generated;
  for (const it of S.items) { it._h = norm(it.n + " " + (it.b || "")).toLowerCase(); S.byKey.set(it.k, it); }
  S.list = list;
}
