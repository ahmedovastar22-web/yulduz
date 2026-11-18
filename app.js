"use strict";

/* ============================================================
   AI Cloud Studio — demo
   Hamma narsa brauzerda ishlaydi. Haqiqiy AI API va to‘lov yo‘q.
   ============================================================ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const IDEA_KEY = "ai-cloud-studio-idea"; // oldingi versiyadagi kalit saqlangan
const STATE_KEY = "ai-cloud-studio-state";

const MODULES = {
  video: "AI video",
  subtitles: "Subtitr",
  montage: "Montaj",
  retouch: "AI retush",
  billing: "Kredit va tarif",
};

const PLANS = [
  { id: "free", name: "Bepul", price: 0, credits: 50, features: ["Oyiga 50 kredit", "Barcha demo bo‘limlar", "Oddiy sifat"] },
  { id: "pro", name: "Pro", price: 99000, credits: 500, featured: true, features: ["Oyiga 500 kredit", "Tezroq navbat", "Reklamasiz eksport", "Email yordam"] },
  { id: "business", name: "Biznes", price: 299000, credits: 2000, features: ["Oyiga 2000 kredit", "Jamoa uchun joylar", "Birinchi navbat", "Shaxsiy menejer"] },
];
const PACKS = [
  { credits: 100, price: 25000 },
  { credits: 500, price: 99000 },
  { credits: 1500, price: 249000 },
];
const COST = { videoPer5s: 10, subtitles: 5, montage: 3, retouch: 2 };

/* ---------- Umumiy yordamchilar ---------- */

const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    node.append(child);
  }
  return node;
}

let toastTimer = 0;
function toast(message, isError = false) {
  const box = $("#toast");
  box.textContent = message;
  box.classList.toggle("error", isError);
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3500);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatSrtTime(seconds) {
  const ms = Math.round(Math.max(0, seconds) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(rest, 3)}`;
}

/* ---------- Holat (kredit, tarif, tarix) ---------- */

const defaultState = () => ({ credits: 50, plan: "free", billing: "monthly", history: [] });

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY));
    if (raw && typeof raw.credits === "number" && Array.isArray(raw.history)) {
      return { ...defaultState(), ...raw };
    }
  } catch (_) { /* buzilgan ma’lumot: standart holatga qaytamiz */ }
  return defaultState();
}

let state = loadState();

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) { /* brauzer saqlashga ruxsat bermasa, sessiya davomida ishlayveradi */ }
}

function addHistory(module, desc, delta) {
  state.history.unshift({ ts: Date.now(), module, desc, delta });
  state.history = state.history.slice(0, 100);
}

/** Kredit yetarli bo‘lsa yechadi va true qaytaradi. */
function spend(cost, module, desc) {
  if (state.credits < cost) {
    toast(`Kredit yetarli emas: ${cost} kredit kerak, balansda ${state.credits} bor. “Kredit va tariflar” bo‘limiga o‘ting.`, true);
    return false;
  }
  state.credits -= cost;
  addHistory(module, desc, -cost);
  saveState();
  render();
  return true;
}

const currentPlan = () => PLANS.find((p) => p.id === state.plan) || PLANS[0];

/* ---------- Ko‘rinishni yangilash ---------- */

function historyItem(entry) {
  const when = new Date(entry.ts).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const sign = entry.delta < 0 ? "−" : "+";
  return el("li", {}, [
    el("span", {}, [
      document.createTextNode(entry.desc),
      el("span", { class: "meta", text: `${MODULES[entry.module] || entry.module} · ${when}` }),
    ]),
    el("span", { class: entry.delta < 0 ? "delta-minus" : "delta-plus", text: `${sign}${fmt(Math.abs(entry.delta))} kr.` }),
  ]);
}

function renderHistory(list, limit) {
  list.replaceChildren();
  const items = state.history.slice(0, limit);
  if (!items.length) {
    list.append(el("li", {}, [el("span", { class: "empty", text: "Hozircha harakat yo‘q." })]));
    return;
  }
  items.forEach((entry) => list.append(historyItem(entry)));
}

function renderUsage() {
  const box = $("#usage");
  box.replaceChildren();
  const counts = {};
  state.history.filter((h) => h.delta < 0).forEach((h) => { counts[h.module] = (counts[h.module] || 0) + 1; });
  const keys = ["video", "subtitles", "montage", "retouch"];
  const max = Math.max(1, ...keys.map((k) => counts[k] || 0));
  keys.forEach((key) => {
    const n = counts[key] || 0;
    const fill = el("div");
    fill.style.width = `${(n / max) * 100}%`;
    box.append(el("div", { class: "usage-row" }, [
      el("span", { text: MODULES[key] }),
      el("div", { class: "bar" }, [fill]),
      el("span", { text: String(n) }),
    ]));
  });
}

function renderPlans() {
  const grid = $("#plans");
  grid.replaceChildren();
  const yearly = state.billing === "yearly";
  PLANS.forEach((plan) => {
    const isCurrent = plan.id === state.plan;
    const total = yearly ? plan.price * 12 * 0.8 : plan.price;
    const priceText = plan.price === 0 ? "0 so‘m" : `${fmt(total)} so‘m`;
    const period = plan.price === 0 ? "" : yearly ? "/yil" : "/oy";
    const card = el("article", { class: `card plan${plan.featured ? " featured" : ""}${isCurrent ? " current" : ""}` }, [
      plan.featured ? el("span", { class: "badge", text: "Ommabop" }) : "",
      el("h3", { text: plan.name }),
      el("div", { class: "price" }, [document.createTextNode(priceText), el("small", { text: ` ${period}` })]),
      el("ul", {}, plan.features.map((f) => el("li", { text: f }))),
      el("button", {
        type: "button",
        class: `btn${isCurrent ? " btn-ghost" : ""}`,
        text: isCurrent ? "Joriy tarif" : "Tanlash",
        ...(isCurrent ? { disabled: "" } : {}),
        onclick: () => choosePlan(plan.id),
      }),
    ]);
    grid.append(card);
  });
  $$(".toggle-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.billing === state.billing)));
}

function renderPacks() {
  const grid = $("#packs");
  grid.replaceChildren();
  PACKS.forEach((pack) => {
    grid.append(el("article", { class: "card pack" }, [
      el("strong", { text: `${fmt(pack.credits)} kredit` }),
      el("span", { class: "muted", text: `${fmt(pack.price)} so‘m` }),
      el("button", { type: "button", class: "btn btn-ghost", text: "Qo‘shish", onclick: () => buyPack(pack) }),
    ]));
  });
}

function render() {
  $$("[data-credits]").forEach((n) => { n.textContent = fmt(state.credits); });
  $$("[data-plan-name]").forEach((n) => { n.textContent = currentPlan().name; });
  const spentEntries = state.history.filter((h) => h.delta < 0);
  $("#stat-jobs").textContent = String(spentEntries.length);
  $("#stat-spent").textContent = fmt(spentEntries.reduce((sum, h) => sum - h.delta, 0));
  renderUsage();
  renderHistory($("#history-short"), 6);
  renderHistory($("#history-full"), 30);
  renderPlans();
}

/* ---------- Tarif va kredit paketlari (demo, to‘lovsiz) ---------- */

function choosePlan(id) {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) return;
  const ok = confirm(`Demo: to‘lov olinmaydi.\n“${plan.name}” tarifini tanlab, balansga ${fmt(plan.credits)} kredit qo‘shaymi?`);
  if (!ok) return;
  state.plan = plan.id;
  state.credits += plan.credits;
  addHistory("billing", `“${plan.name}” tarifi tanlandi`, plan.credits);
  saveState();
  render();
  toast(`“${plan.name}” tarifi yoqildi. +${fmt(plan.credits)} kredit.`);
}

function buyPack(pack) {
  const ok = confirm(`Demo: to‘lov olinmaydi.\nBalansga ${fmt(pack.credits)} kredit qo‘shaymi?`);
  if (!ok) return;
  state.credits += pack.credits;
  addHistory("billing", `${fmt(pack.credits)} kredit paketi qo‘shildi`, pack.credits);
  saveState();
  render();
  toast(`+${fmt(pack.credits)} kredit qo‘shildi.`);
}

/* ---------- Navigatsiya ---------- */

const VIEWS = ["dashboard", "video", "subtitles", "retouch", "credits"];

function setView(id, updateHash = true) {
  if (!VIEWS.includes(id)) id = "dashboard";
  $$(".view").forEach((section) => { section.hidden = section.id !== `view-${id}`; });
  $$(".nav-btn").forEach((btn) => {
    if (btn.dataset.view === id) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  $("#view-title").textContent = $(`#view-${id}`).dataset.title;
  if (updateHash && location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0 });
}

$$(".nav-btn").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
$$("[data-go]").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.go)));
window.addEventListener("hashchange", () => setView(location.hash.slice(1), false));

$$(".toggle-btn").forEach((btn) => btn.addEventListener("click", () => {
  state.billing = btn.dataset.billing;
  saveState();
  renderPlans();
}));

$("#reset-demo").addEventListener("click", () => {
  if (!confirm("Kredit, tarif va tarix demo holatiga qaytariladi. Davom etasizmi?")) return;
  state = defaultState();
  saveState();
  render();
  toast("Demo ma’lumotlar tiklandi.");
});

/* ============================================================
   AI VIDEO (demo: canvas animatsiyasi)
   ============================================================ */

const idea = $("#idea");
const ideaForm = $("#idea-form");
const ideaStatus = $("#status");

// Oldingi versiyadagi g‘oyani saqlash funksiyasi o‘zgarishsiz qoldi
try { idea.value = localStorage.getItem(IDEA_KEY) || ""; } catch (_) { /* saqlangan g‘oya yo‘q */ }
ideaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    localStorage.setItem(IDEA_KEY, idea.value);
    ideaStatus.textContent = "G‘oya ushbu brauzerda saqlandi.";
  } catch (_) {
    ideaStatus.textContent = "Saqlashning imkoni bo‘lmadi. Brauzer sozlamalarini tekshiring.";
  }
});

const vCanvas = $("#video-canvas");
const vCtx = vCanvas.getContext("2d");
const vProgress = $("#video-progress");
const vStatus = $("#video-status");
const genBtn = $("#gen-video");
const dlVideoBtn = $("#download-video");

const RATIOS = { "16:9": [640, 360], "9:16": [360, 640], "1:1": [480, 480] };
const STYLE_HUES = { cinematic: [260, 20], animation: [300, 170], ad: [335, 45], minimal: [210, 215] };

const video = { prompt: "", duration: 5, style: "cinematic", ready: false, busy: false, raf: 0, t0: 0 };

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?\s]+$/, "")}…`;
  }
  return lines;
}

function drawVideoFrame(t) {
  const w = vCanvas.width;
  const h = vCanvas.height;
  const [h1, h2] = STYLE_HUES[video.style];
  const grad = vCtx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${h1 + t * 8}, 70%, 18%)`);
  grad.addColorStop(1, `hsl(${h2 + t * 8}, 70%, 32%)`);
  vCtx.fillStyle = grad;
  vCtx.fillRect(0, 0, w, h);

  const base = Math.min(w, h);
  for (let i = 0; i < 7; i++) {
    const x = w * (0.5 + 0.42 * Math.sin(t * 0.7 + i * 1.3));
    const y = h * (0.5 + 0.38 * Math.cos(t * 0.5 + i * 2.1));
    const r = base * (0.09 + 0.05 * Math.sin(t + i));
    vCtx.fillStyle = "rgba(255,255,255,0.10)";
    vCtx.beginPath();
    vCtx.arc(x, y, r, 0, Math.PI * 2);
    vCtx.fill();
  }

  const fontSize = Math.round(w * (h > w ? 0.07 : 0.055));
  vCtx.font = `700 ${fontSize}px system-ui, sans-serif`;
  vCtx.textAlign = "center";
  vCtx.textBaseline = "middle";
  const lines = wrapText(vCtx, video.prompt, w * 0.82, 6);
  const alpha = clamp(t / 0.8, 0, 1);
  const lift = (1 - alpha) * 14;
  vCtx.fillStyle = `rgba(255,255,255,${alpha})`;
  vCtx.shadowColor = "rgba(0,0,0,0.5)";
  vCtx.shadowBlur = 8;
  const lineH = fontSize * 1.3;
  lines.forEach((line, i) => {
    vCtx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lineH + lift);
  });
  vCtx.shadowBlur = 0;

  vCtx.font = `600 ${Math.round(w * 0.028)}px system-ui, sans-serif`;
  vCtx.textAlign = "left";
  vCtx.fillStyle = "rgba(255,255,255,0.7)";
  vCtx.fillText("AI Cloud Studio · DEMO", w * 0.04, h * 0.05);

  vCtx.fillStyle = "rgba(255,255,255,0.85)";
  vCtx.fillRect(0, h - 5, w * (t / video.duration), 5);
}

function drawPlaceholder() {
  const w = vCanvas.width;
  const h = vCanvas.height;
  vCtx.fillStyle = "#151325";
  vCtx.fillRect(0, 0, w, h);
  vCtx.fillStyle = "#8f87aa";
  vCtx.font = `${Math.round(w * 0.04)}px system-ui, sans-serif`;
  vCtx.textAlign = "center";
  vCtx.textBaseline = "middle";
  vCtx.fillText("Natija shu yerda ko‘rinadi", w / 2, h / 2);
}

function startVideoLoop() {
  cancelAnimationFrame(video.raf);
  video.t0 = performance.now();
  const tick = (now) => {
    const t = ((now - video.t0) / 1000) % video.duration;
    drawVideoFrame(t);
    video.raf = requestAnimationFrame(tick);
  };
  video.raf = requestAnimationFrame(tick);
}

function setRatio() {
  const [w, h] = RATIOS[$("#video-ratio").value];
  vCanvas.width = w;
  vCanvas.height = h;
  if (video.ready) drawVideoFrame(0); else drawPlaceholder();
}
$("#video-ratio").addEventListener("change", () => {
  setRatio();
  if (video.ready) { video.ready = false; cancelAnimationFrame(video.raf); drawPlaceholder(); dlVideoBtn.disabled = true; vStatus.textContent = "Format o‘zgardi. Videoni qayta yarating."; }
});

genBtn.addEventListener("click", () => {
  if (video.busy) return;
  const prompt = idea.value.trim();
  if (!prompt) {
    toast("Avval video g‘oyasini yozing.", true);
    idea.focus();
    return;
  }
  const duration = Number($("#video-duration").value);
  const cost = (duration / 5) * COST.videoPer5s;
  if (!spend(cost, "video", `AI video: ${duration} soniya, ${$("#video-ratio").value}`)) return;

  video.busy = true;
  video.ready = false;
  video.prompt = prompt;
  video.duration = duration;
  video.style = $("#video-style").value;
  cancelAnimationFrame(video.raf);
  setRatio();
  drawPlaceholder();
  genBtn.disabled = true;
  dlVideoBtn.disabled = true;

  const total = 3000;
  const begin = performance.now();
  vStatus.textContent = "Video yaratilmoqda…";
  const timer = setInterval(() => {
    const p = clamp((performance.now() - begin) / total, 0, 1);
    vProgress.style.width = `${p * 100}%`;
    if (p >= 1) {
      clearInterval(timer);
      video.busy = false;
      video.ready = true;
      genBtn.disabled = false;
      dlVideoBtn.disabled = typeof MediaRecorder === "undefined" || !vCanvas.captureStream;
      vStatus.textContent = `Tayyor: ${duration} soniya, ${cost} kredit sarflandi.`;
      startVideoLoop();
    }
  }, 60);
});

dlVideoBtn.addEventListener("click", () => {
  if (!video.ready || dlVideoBtn.dataset.recording) return;
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) { toast("Brauzer WebM yozishni qo‘llamaydi.", true); return; }
  const recorder = new MediaRecorder(vCanvas.captureStream(30), { mimeType: mime });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    downloadBlob(new Blob(chunks, { type: "video/webm" }), "ai-cloud-studio-demo.webm");
    delete dlVideoBtn.dataset.recording;
    dlVideoBtn.disabled = false;
    dlVideoBtn.textContent = "WebM sifatida yuklab olish";
  };
  dlVideoBtn.dataset.recording = "1";
  dlVideoBtn.disabled = true;
  dlVideoBtn.textContent = `Yozilmoqda (${video.duration} soniya)…`;
  video.t0 = performance.now(); // animatsiya 0-soniyadan boshlanadi
  recorder.start();
  setTimeout(() => recorder.stop(), video.duration * 1000 + 150);
});

/* ============================================================
   SUBTITR VA MONTAJ
   ============================================================ */

const player = $("#sub-video");
const overlay = $("#sub-overlay");
const subFile = $("#sub-file");
const genSubsBtn = $("#gen-subs");
const dlSrtBtn = $("#download-srt");
const cueList = $("#cue-list");
const trimStart = $("#trim-start");
const trimEnd = $("#trim-end");
const speedSel = $("#speed");
const loopTrim = $("#loop-trim");
const montageInfo = $("#montage-info");
const exportBtn = $("#export-montage");

const media = { url: null, name: "", duration: 0, cues: [], raf: 0 };

function setMontageEnabled(on) {
  [trimStart, trimEnd, speedSel, loopTrim, exportBtn, $("#mark-start"), $("#mark-end"), genSubsBtn].forEach((n) => { n.disabled = !on; });
}

subFile.addEventListener("change", () => {
  const file = subFile.files[0];
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    toast("Iltimos, video fayl tanlang.", true);
    subFile.value = "";
    return;
  }
  if (media.url) URL.revokeObjectURL(media.url);
  media.url = URL.createObjectURL(file);
  media.name = file.name;
  media.cues = [];
  renderCues();
  setMontageEnabled(false);
  player.src = media.url;
});

function initMedia() {
  if (!Number.isFinite(player.duration) || player.duration <= 0) {
    toast("Video davomiyligini aniqlab bo‘lmadi. Boshqa fayl sinab ko‘ring.", true);
    return;
  }
  media.duration = player.duration;
  trimStart.value = "0";
  trimEnd.value = player.duration.toFixed(1);
  trimStart.max = trimEnd.max = player.duration.toFixed(1);
  speedSel.value = "1";
  player.playbackRate = 1;
  setMontageEnabled(true);
  updateMontageInfo();
}

player.addEventListener("loadedmetadata", () => {
  // Brauzer yozgan WebM fayllarda davomiylik "Infinity" bo‘lishi mumkin; oxiriga o‘tib uni aniqlaymiz.
  if (player.duration === Infinity) {
    const onTime = () => {
      player.removeEventListener("timeupdate", onTime);
      player.currentTime = 0;
      initMedia();
    };
    player.addEventListener("timeupdate", onTime);
    player.currentTime = 1e101;
    return;
  }
  initMedia();
});

player.addEventListener("error", () => {
  if (!media.url) return;
  toast("Bu video formatini brauzer ocha olmadi. MP4 (H.264) yoki WebM sinab ko‘ring.", true);
  setMontageEnabled(false);
});

function getTrim() {
  const dur = media.duration || 0;
  let start = clamp(parseFloat(trimStart.value) || 0, 0, dur);
  let end = clamp(parseFloat(trimEnd.value) || dur, 0, dur);
  if (end <= start) end = Math.min(dur, start + 0.1);
  return { start, end };
}

function updateMontageInfo() {
  const { start, end } = getTrim();
  const speed = Number(speedSel.value);
  const result = (end - start) / speed;
  montageInfo.textContent = `Tanlangan qism: ${start.toFixed(1)}–${end.toFixed(1)} s. Tezlik: ${speed}×. Natija davomiyligi: ${result.toFixed(1)} soniya.`;
}

[trimStart, trimEnd].forEach((input) => input.addEventListener("change", () => {
  const { start, end } = getTrim();
  trimStart.value = start.toFixed(1);
  trimEnd.value = end.toFixed(1);
  updateMontageInfo();
}));
speedSel.addEventListener("change", () => { player.playbackRate = Number(speedSel.value); updateMontageInfo(); });
$("#mark-start").addEventListener("click", () => { trimStart.value = player.currentTime.toFixed(1); trimStart.dispatchEvent(new Event("change")); });
$("#mark-end").addEventListener("click", () => { trimEnd.value = player.currentTime.toFixed(1); trimEnd.dispatchEvent(new Event("change")); });

function currentCue(t) {
  return media.cues.find((c) => t >= c.start && t < c.end);
}

function syncPlayback() {
  const t = player.currentTime;
  const cue = currentCue(t);
  overlay.textContent = cue ? cue.text : "";

  if (!trimStart.disabled) {
    const { start, end } = getTrim();
    if (!player.paused && t >= end) {
      if (loopTrim.checked) player.currentTime = start;
      else { player.pause(); player.currentTime = end; }
    }
  }
}

function loop() {
  syncPlayback();
  media.raf = requestAnimationFrame(loop);
}
player.addEventListener("play", () => {
  if (!trimStart.disabled) {
    const { start, end } = getTrim();
    if (player.currentTime < start || player.currentTime >= end) player.currentTime = start;
  }
  cancelAnimationFrame(media.raf);
  media.raf = requestAnimationFrame(loop);
});
["pause", "ended"].forEach((evt) => player.addEventListener(evt, () => { cancelAnimationFrame(media.raf); syncPlayback(); }));
["seeked", "timeupdate"].forEach((evt) => player.addEventListener(evt, syncPlayback));

/** Matnni gaplarga, so‘ng ko‘pi bilan 7 so‘zli bo‘laklarga ajratadi. */
function splitScript(text) {
  const sentences = text.match(/[^.!?…\n]+[.!?…]*/g) || [];
  const chunks = [];
  sentences.map((s) => s.trim()).filter(Boolean).forEach((sentence) => {
    const words = sentence.split(/\s+/);
    for (let i = 0; i < words.length; i += 7) chunks.push(words.slice(i, i + 7).join(" "));
  });
  return chunks;
}

function buildCues(text, duration) {
  const chunks = splitScript(text);
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  let cursor = 0;
  return chunks.map((chunk) => {
    const span = duration * (chunk.length / totalLen);
    const cue = { start: cursor, end: cursor + span, text: chunk };
    cursor += span;
    return cue;
  });
}

function renderCues() {
  cueList.replaceChildren();
  media.cues.forEach((cue) => {
    const input = el("input", { type: "text", value: cue.text, "aria-label": `Subtitr ${formatClock(cue.start)}` });
    input.addEventListener("input", () => { cue.text = input.value; syncPlayback(); });
    cueList.append(el("li", {}, [el("span", { text: `${cue.start.toFixed(1)}–${cue.end.toFixed(1)} s` }), input]));
  });
  dlSrtBtn.disabled = media.cues.length === 0;
}

genSubsBtn.addEventListener("click", () => {
  const text = $("#sub-script").value.trim();
  if (!media.duration) { toast("Avval video tanlang.", true); return; }
  if (!text) { toast("Subtitr uchun matn yozing.", true); $("#sub-script").focus(); return; }
  const cues = buildCues(text, media.duration);
  if (!cues.length) { toast("Matndan subtitr hosil bo‘lmadi.", true); return; }
  if (!spend(COST.subtitles, "subtitles", `Subtitr yaratildi: ${cues.length} qator (${$("#sub-lang").selectedOptions[0].text})`)) return;
  media.cues = cues;
  renderCues();
  syncPlayback();
  toast(`${cues.length} ta subtitr qatori yaratildi.`);
});

dlSrtBtn.addEventListener("click", () => {
  const srt = media.cues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join("\n");
  const base = media.name.replace(/\.[^.]+$/, "") || "subtitr";
  downloadBlob(new Blob([srt], { type: "application/x-subrip;charset=utf-8" }), `${base}.srt`);
});

exportBtn.addEventListener("click", () => {
  const { start, end } = getTrim();
  const speed = Number(speedSel.value);
  if (!spend(COST.montage, "montage", `Montaj rejasi: ${start.toFixed(1)}–${end.toFixed(1)} s, ${speed}×`)) return;
  const plan = {
    source: media.name,
    trim: { start, end },
    speed,
    resultDurationSeconds: Number(((end - start) / speed).toFixed(2)),
    subtitles: media.cues.map((c) => ({ start: Number(c.start.toFixed(2)), end: Number(c.end.toFixed(2)), text: c.text })),
    createdAt: new Date().toISOString(),
  };
  downloadBlob(new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }), "montaj-rejasi.json");
});

/* ============================================================
   AI FOTO RETUSH (demo: rang va xiralashtirish filtrlari)
   ============================================================ */

const pCanvas = $("#photo-canvas");
const pCtx = pCanvas.getContext("2d", { willReadFrequently: true });
const photoFile = $("#photo-file");
const compareBtn = $("#compare-btn");
const dlPhotoBtn = $("#download-photo");
const sliders = $$("input[data-key]");
const MAX_SIDE = 1200;

const photo = { source: null, name: "", showOriginal: false, queued: false };
const params = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, smooth: 0 };
const PRESETS = {
  reset: { brightness: 0, contrast: 0, saturation: 0, warmth: 0, smooth: 0 },
  portrait: { brightness: 8, contrast: 6, saturation: 6, warmth: 8, smooth: 4 },
  bright: { brightness: 18, contrast: 14, saturation: 22, warmth: 0, smooth: 0 },
  warm: { brightness: 5, contrast: 4, saturation: 10, warmth: 28, smooth: 0 },
  bw: { brightness: 0, contrast: 18, saturation: -100, warmth: 0, smooth: 0 },
};

function drawPhotoPlaceholder() {
  pCanvas.width = 640;
  pCanvas.height = 400;
  pCtx.fillStyle = "#151325";
  pCtx.fillRect(0, 0, 640, 400);
  pCtx.fillStyle = "#8f87aa";
  pCtx.font = "20px system-ui, sans-serif";
  pCtx.textAlign = "center";
  pCtx.textBaseline = "middle";
  pCtx.fillText("Rasm tanlang", 320, 200);
}

function renderPhoto() {
  photo.queued = false;
  const src = photo.source;
  if (!src) return;
  const w = pCanvas.width;
  const h = pCanvas.height;
  pCtx.filter = "none";
  pCtx.globalAlpha = 1;
  pCtx.clearRect(0, 0, w, h);
  pCtx.drawImage(src, 0, 0);
  if (photo.showOriginal) return;

  if (params.smooth > 0 && "filter" in pCtx) {
    pCtx.globalAlpha = clamp(params.smooth / 10, 0, 1) * 0.7;
    pCtx.filter = `blur(${params.smooth * 0.6}px)`;
    pCtx.drawImage(src, 0, 0);
    pCtx.filter = "none";
    pCtx.globalAlpha = 1;
  }

  const { brightness, contrast, saturation, warmth } = params;
  if (!brightness && !contrast && !saturation && !warmth) return;
  const img = pCtx.getImageData(0, 0, w, h);
  const d = img.data;
  const add = brightness * 2.55;
  const c = contrast * 2.55;
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  const sat = 1 + saturation / 100;
  const warm = warmth * 0.8;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + add;
    let g = d[i + 1] + add;
    let b = d[i + 2] + add;
    r = cf * (r - 128) + 128;
    g = cf * (g - 128) + 128;
    b = cf * (b - 128) + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * sat + warm;
    g = gray + (g - gray) * sat;
    b = gray + (b - gray) * sat - warm;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; // Uint8ClampedArray qiymatni 0–255 ga keltiradi
  }
  pCtx.putImageData(img, 0, 0);
}

function queueRender() {
  if (photo.queued) return;
  photo.queued = true;
  requestAnimationFrame(renderPhoto);
}

function applyParamsToUi() {
  sliders.forEach((s) => {
    s.value = String(params[s.dataset.key]);
    $(`#o-${s.dataset.key}`).textContent = s.value;
  });
}

sliders.forEach((slider) => slider.addEventListener("input", () => {
  params[slider.dataset.key] = Number(slider.value);
  $(`#o-${slider.dataset.key}`).textContent = slider.value;
  queueRender();
}));

$$("#presets [data-preset]").forEach((btn) => btn.addEventListener("click", () => {
  if (!photo.source) { toast("Avval rasm tanlang.", true); return; }
  Object.assign(params, PRESETS[btn.dataset.preset]);
  applyParamsToUi();
  queueRender();
}));

photoFile.addEventListener("change", () => {
  const file = photoFile.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Iltimos, rasm fayl tanlang.", true);
    photoFile.value = "";
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    off.getContext("2d").drawImage(image, 0, 0, w, h);
    URL.revokeObjectURL(url);
    photo.source = off;
    photo.name = file.name;
    pCanvas.width = w;
    pCanvas.height = h;
    Object.assign(params, PRESETS.reset);
    applyParamsToUi();
    sliders.forEach((s) => { s.disabled = false; });
    compareBtn.disabled = false;
    dlPhotoBtn.disabled = false;
    renderPhoto();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    toast("Rasmni ochib bo‘lmadi. Boshqa fayl sinab ko‘ring.", true);
  };
  image.src = url;
});

const showOriginal = (on) => { photo.showOriginal = on; queueRender(); };
compareBtn.addEventListener("pointerdown", () => showOriginal(true));
["pointerup", "pointerleave", "pointercancel", "blur"].forEach((evt) => compareBtn.addEventListener(evt, () => showOriginal(false)));
compareBtn.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); showOriginal(true); } });
compareBtn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") showOriginal(false); });

dlPhotoBtn.addEventListener("click", () => {
  if (!photo.source) return;
  if (!spend(COST.retouch, "retouch", `Retush qilingan rasm yuklandi: ${photo.name}`)) return;
  photo.showOriginal = false;
  renderPhoto();
  pCanvas.toBlob((blob) => {
    if (!blob) { toast("Rasmni saqlab bo‘lmadi.", true); return; }
    const base = photo.name.replace(/\.[^.]+$/, "") || "rasm";
    downloadBlob(blob, `${base}-retush.png`);
  }, "image/png");
});

/* ---------- Ishga tushirish ---------- */

drawPhotoPlaceholder();
drawPlaceholder();
renderPacks();
render();
setView(location.hash.slice(1), false);
