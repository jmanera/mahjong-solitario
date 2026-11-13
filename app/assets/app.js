/* Interfaz: dibujo del tablero, interacción, ventanas, ajustes, estadísticas y guardado. */
(() => {
  'use strict';
  const E = window.MJEngine, LAYOUTS = window.MJLayouts.list, T = window.MJTiles;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const fx = $('fx'), fxc = fx.getContext('2d');
  const sheet = $('sheet');
  const ANIM = 260;

  /* ---------- Almacenamiento ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mj.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mj.' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };
  const DEF = { bg: 'verde', tiles: 'marfil', sound: true, highlight: false, solvable: true, indices: true, showMoves: true, layout: 'tortuga' };
  const cfg = Object.assign({}, DEF, store.get('cfg', {}));
  let stats = store.get('stats', {});

  const BGS = [['verde', '#1f5a3f'], ['azul', '#1e4470'], ['granate', '#6e2433'], ['madera', '#7b5636'], ['pizarra', '#40464f']];
  const STYLES = {
    marfil: { name: 'Marfil', top: '#fffbf1', bot: '#efe4cb', edge: '#d8c8a2', back: '#2c7a57', line: 'rgba(90,70,30,.35)' },
    jade: { name: 'Jade', top: '#f4fbf5', bot: '#d6ebda', edge: '#a9cdb4', back: '#1d5f45', line: 'rgba(20,70,40,.35)' },
    hueso: { name: 'Hueso', top: '#fdf8ef', bot: '#eadcc4', edge: '#d6b98d', back: '#a8432e', line: 'rgba(90,50,20,.35)' },
    perla: { name: 'Perla', top: '#ffffff', bot: '#e4e8f0', edge: '#c3c9d6', back: '#2f4a8a', line: 'rgba(40,50,80,.3)' },
  };

  /* ---------- Estado ---------- */
  let G = null, L = null, NB = null, ORDER = [];
  let geo = null, cache = { key: '' };
  let sel = -1, hint = null, hintIdx = 0, flash = null, anims = [], raf = 0;
  let paused = false, modalOpen = false, saveTick = 0;

  const findLayout = (id) => LAYOUTS.find(l => l.id === id);
  const leftCount = () => G.removed.reduce((n, r) => n + (r ? 0 : 1), 0);
  const pairsNow = () => E.availablePairs(NB, G.faces, G.removed);
  const inProgress = () => G && G.counted && !G.done;
  const fmt = (s) => {
    const m = Math.floor(s / 60), r = String(s % 60).padStart(2, '0');
    return m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + r : m + ':' + r;
  };
  const stat = (id) => (stats[id] = stats[id] || { played: 0, won: 0, bestTime: 0, bestScore: 0, streak: 0, bestStreak: 0 });
  const saveStats = () => store.set('stats', stats);
  const save = () => { if (G) store.set('game', G); };

  /* ---------- Partidas ---------- */
  function newGame(layoutId, seed) {
    if (inProgress()) { stat(G.layout).streak = 0; saveStats(); }
    const lay = findLayout(layoutId) || LAYOUTS[0];
    if (!(seed >= 1 && seed <= 999999)) seed = 1 + Math.floor(Math.random() * 999999);
    const nb = E.neighbors(lay.tiles);
    const rnd = E.rng(seed * 7919 + lay.idx * 104729);
    const faces = cfg.solvable ? E.deal(lay.tiles, nb, rnd) : E.dealRandom(lay.tiles.length, rnd);
    G = {
      v: 1, layout: lay.id, seed, solvable: cfg.solvable, faces,
      removed: new Array(lay.tiles.length).fill(false), hist: [], redo: [],
      time: 0, score: 0, hints: 0, shuffles: 0, undos: 0,
      started: false, counted: false, done: false, lastMatch: -99,
    };
    cfg.layout = lay.id; store.set('cfg', cfg);
    attach();
    for (const i of ORDER) anims.push({ i, s: performance.now() + (L.tiles[i].z * 60), kind: 'in' });
    kick();
    save();
  }

  function restore() {
    const s = store.get('game', null);
    if (!s || s.v !== 1 || s.done) return false;
    const lay = findLayout(s.layout);
    if (!lay || !Array.isArray(s.faces) || s.faces.length !== lay.tiles.length) return false;
    G = s;
    attach();
    if (G.started) setPause(true);
    return true;
  }

  function attach() {
    L = findLayout(G.layout);
    NB = E.neighbors(L.tiles);
    ORDER = L.tiles.map((t, i) => i).sort((a, b) => {
      const A = L.tiles[a], B = L.tiles[b];
      return A.z - B.z || (A.y - A.x) - (B.y - B.x) || A.y - B.y;
    });
    sel = -1; hint = null; hintIdx = 0; flash = null; anims = [];
    setPause(false);
    resize();
    updateHud();
  }

  /* ---------- Marcadores ---------- */
  function updateHud() {
    $('hLayout').textContent = L.name;
    $('hSeed').textContent = G.seed;
    $('sTime').textContent = fmt(G.time);
    $('sLeft').textContent = leftCount();
    $('sScore').textContent = G.score;
    $('stMoves').style.display = cfg.showMoves ? '' : 'none';
    if (cfg.showMoves) $('sMoves').textContent = G.done ? 0 : pairsNow().length;
    $('bUndo').disabled = !G.hist.length || G.done;
    $('bRedo').disabled = !G.redo.length || G.done;
    $('bHint').disabled = G.done;
    $('bShuffle').disabled = G.done;
    $('bPause').disabled = G.done || !G.started;
  }

  /* ---------- Geometría y dibujo ---------- */
  function resize() {
    const r = $('stage').getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    for (const c of [canvas, fx]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    if (!L) return;
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const t of L.tiles) { maxX = Math.max(maxX, t.x); maxY = Math.max(maxY, t.y); maxZ = Math.max(maxZ, t.z); }
    const spanX = (maxX + 2) / 2, spanY = (maxY + 2) / 2, K = 0.11, R = 1.3;
    const pad = Math.min(W, H) * 0.025 + 6;
    let tw = Math.min((W - 2 * pad) / (spanX + K * (maxZ + 1)), (H - 2 * pad) / (R * spanY + K * (maxZ + 1)));
    tw = Math.max(14, Math.min(tw, 150));
    const th = tw * R, d = tw * K;
    const bw = spanX * tw + d * (maxZ + 1), bh = spanY * th + d * (maxZ + 1);
    geo = { W, H, dpr, tw, th, d, hw: tw / 2, hh: th / 2, ox: (W - bw) / 2 + d, oy: (H - bh) / 2 + d * maxZ };
    buildCache();
    draw();
  }

  function buildCache() {
    const st = STYLES[cfg.tiles] || STYLES.marfil;
    const { tw, th, d, dpr } = geo;
    const key = [Math.round(tw * 100), dpr, cfg.tiles, cfg.indices].join('|');
    if (key === cache.key) return;
    const fw = Math.max(1, Math.round(tw * dpr)), fh = Math.max(1, Math.round(th * dpr));
    const faces = [];
    for (let f = 0; f < E.FACES; f++) {
      const c = document.createElement('canvas');
      c.width = fw; c.height = fh;
      T.drawFace(c.getContext('2d'), f, fw, fh, { indices: cfg.indices });
      faces.push(c);
    }
    const body = document.createElement('canvas');
    body.width = Math.ceil((tw + d) * dpr) + 2; body.height = Math.ceil((th + d) * dpr) + 2;
    const x = body.getContext('2d');
    x.scale(dpr, dpr);
    const rad = tw * 0.12;
    x.fillStyle = st.back; T.rr(x, 0, d, tw, th, rad); x.fill();
    x.fillStyle = st.edge; T.rr(x, d * 0.5, d * 0.5, tw, th, rad); x.fill();
    const g = x.createLinearGradient(d, 0, d + tw, th);
    g.addColorStop(0, st.top); g.addColorStop(1, st.bot);
    x.fillStyle = g; T.rr(x, d, 0, tw, th, rad); x.fill();
    x.strokeStyle = st.line; x.lineWidth = Math.max(0.6, tw * 0.012);
    T.rr(x, d + 0.5, 0.5, tw - 1, th - 1, rad); x.stroke();
    cache = { key, faces, body, bw: body.width / dpr, bh: body.height / dpr };
  }

  function tilePos(i) {
    const t = L.tiles[i];
    return [geo.ox + t.x * geo.hw + t.z * geo.d, geo.oy + t.y * geo.hh - t.z * geo.d];
  }

  function draw(now) {
    if (!geo || !G || !cache.faces) return;
    now = now || performance.now();
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    ctx.clearRect(0, 0, geo.W, geo.H);
    const free = cfg.highlight ? E.freeTiles(NB, G.removed).reduce((m, i) => (m[i] = 1, m), {}) : null;
    const amap = new Map();
    for (const a of anims) amap.set(a.i, a);
    const { tw, th, d } = geo, rad = tw * 0.12;
    for (const i of ORDER) {
      const a = amap.get(i);
      if (G.removed[i] && !(a && a.kind === 'out')) continue;
      let alpha = 1, sx = 1, sy = 1;
      if (a) {
        const p = Math.max(0, Math.min(1, (now - a.s) / ANIM));
        if (a.kind === 'out') { alpha = 1 - p; sx = sy = 1 + 0.2 * p; }
        else if (a.kind === 'in') { alpha = p; sx = sy = 0.85 + 0.15 * p; }
        else if (a.kind === 'flip') { sx = Math.max(0.04, Math.abs(Math.cos(p * Math.PI))); }
      }
      if (alpha <= 0) continue;
      const [x, y] = tilePos(i);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (sx !== 1 || sy !== 1) {
        const cx = x + tw / 2, cy = y + th / 2;
        ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.translate(-cx, -cy);
      }
      ctx.drawImage(cache.body, x - d, y, cache.bw, cache.bh);
      ctx.drawImage(cache.faces[G.faces[i]], x, y, tw, th);
      let ov = null;
      if (i === sel) ov = 'rgba(255,196,40,.42)';
      else if (hint && (i === hint.a || i === hint.b)) ov = 'rgba(60,180,255,' + (0.2 + 0.3 * Math.pow(Math.sin(now / 140), 2)).toFixed(3) + ')';
      else if (flash && flash.i === i) ov = 'rgba(220,40,40,.38)';
      else if (free && !free[i] && !G.removed[i]) ov = 'rgba(10,20,15,.34)';
      if (ov) { ctx.fillStyle = ov; T.rr(ctx, x, y, tw, th, rad); ctx.fill(); }
      if (i === sel || (hint && (i === hint.a || i === hint.b))) {
        ctx.strokeStyle = i === sel ? '#e09a00' : '#1c8ad8';
        ctx.lineWidth = Math.max(2, tw * 0.045);
        T.rr(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, tw - ctx.lineWidth, th - ctx.lineWidth, rad);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    const now = performance.now();
    anims = anims.filter(a => now - a.s < ANIM);
    if (hint && now > hint.until) hint = null;
    if (flash && now > flash.until) flash = null;
    draw(now);
    if (anims.length || hint || flash) kick();
  }

  function hit(px, py) {
    for (let k = ORDER.length - 1; k >= 0; k--) {
      const i = ORDER[k];
      if (G.removed[i]) continue;
      const [x, y] = tilePos(i);
      if (px >= x && px <= x + geo.tw && py >= y && py <= y + geo.th) return i;
    }
    return -1;
  }

  /* ---------- Jugadas ---------- */
  function start() {
    if (!G.started) { G.started = true; updateHud(); }
  }

  function tapTile(i) {
    start();
    hint = null;
    if (!E.isFree(i, NB, G.removed)) {
      flash = { i, until: performance.now() + 380 };
      sfx('bad'); kick();
      return;
    }
    if (sel === i) { sel = -1; sfx('tap'); kick(); return; }
    if (sel >= 0 && E.keyOf(G.faces[sel]) === E.keyOf(G.faces[i])) { match(sel, i); return; }
    sel = i; sfx('tap'); kick();
  }

  function match(a, b) {
    let pts = 10;
    if (G.time - G.lastMatch <= 4) pts += 5;
    const f = G.faces[a];
    if (f >= 31 && f <= 33) pts += 4; // dragones
    if (f >= 34) pts += 6; // flores y estaciones
    G.hist.push({ t: 'm', a, b, pts, prevLast: G.lastMatch });
    G.redo = [];
    G.removed[a] = G.removed[b] = true;
    G.score += pts; G.lastMatch = G.time;
    if (!G.counted) { G.counted = true; stat(G.layout).played++; saveStats(); }
    sel = -1; hintIdx = 0;
    const now = performance.now();
    anims.push({ i: a, s: now, kind: 'out' }, { i: b, s: now, kind: 'out' });
    sfx('match');
    afterChange(true);
  }

  function afterChange(checkEnd) {
    updateHud(); save(); kick();
    if (!checkEnd) return;
    if (leftCount() === 0) { win(); return; }
    if (!pairsNow().length) setTimeout(() => { if (!G.done && !modalOpen && !pairsNow().length) noMoves(); }, 450);
  }

  function undo() {
    if (!G.hist.length || G.done) return;
    const h = G.hist.pop();
    G.redo.push(h);
    G.undos++;
    const now = performance.now();
    if (h.t === 'm') {
      G.removed[h.a] = G.removed[h.b] = false;
      G.lastMatch = h.prevLast;
      anims.push({ i: h.a, s: now, kind: 'in' }, { i: h.b, s: now, kind: 'in' });
    } else {
      G.faces = h.before.slice();
      flipAll(now);
    }
    G.score -= h.pts;
    sel = -1; hint = null; hintIdx = 0;
    sfx('tap');
    afterChange(false);
  }

  function redo() {
    if (!G.redo.length || G.done) return;
    const h = G.redo.pop();
    G.hist.push(h);
    const now = performance.now();
    if (h.t === 'm') {
      G.removed[h.a] = G.removed[h.b] = true;
      G.lastMatch = G.time;
      anims.push({ i: h.a, s: now, kind: 'out' }, { i: h.b, s: now, kind: 'out' });
    } else {
      G.faces = h.after.slice();
      flipAll(now);
    }
    G.score += h.pts;
    sel = -1; hint = null; hintIdx = 0;
    sfx('match');
    afterChange(true);
  }

  function flipAll(now) {
    for (const i of ORDER) if (!G.removed[i]) anims.push({ i, s: now, kind: 'flip' });
  }

  function doShuffle() {
    if (G.done) return;
    const after = E.reshuffle(L.tiles, NB, G.faces, G.removed, E.rng((Math.random() * 4294967295) >>> 0));
    if (!after) { toast('Con las fichas que quedan no hay forma de barajar: deshaz alguna jugada.'); return; }
    start();
    const pts = -Math.min(40, Math.max(0, G.score));
    G.hist.push({ t: 's', before: G.faces.slice(), after, pts });
    G.redo = [];
    G.faces = after;
    G.score += pts; G.shuffles++;
    sel = -1; hint = null; hintIdx = 0;
    flipAll(performance.now());
    sfx('shuffle');
    afterChange(true);
  }

  function showHint() {
    if (G.done) return;
    start();
    const pairs = pairsNow();
    if (!pairs.length) { noMoves(); return; }
    const p = pairs[hintIdx % pairs.length];
    hintIdx++;
    hint = { a: p[0], b: p[1], until: performance.now() + 2600 };
    sel = -1;
    G.hints++; G.score = Math.max(0, G.score - 15);
    sfx('hint');
    updateHud(); save(); kick();
  }

  function setPause(p) {
    if (p && (!G || G.done || !G.started)) p = false;
    paused = p;
    $('pauseCover').classList.toggle('show', p);
  }

  /* ---------- Fin de partida ---------- */
  function win() {
    G.done = true; sel = -1; hint = null;
    const bonus = Math.max(0, L.count * 3 - G.time);
    G.score += bonus;
    const s = stat(G.layout);
    s.won++;
    s.streak = (s.streak || 0) + 1;
    s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
    const recT = !s.bestTime || G.time < s.bestTime;
    if (recT) s.bestTime = G.time;
    const recS = G.score > (s.bestScore || 0);
    if (recS) s.bestScore = G.score;
    saveStats(); save(); updateHud();
    sfx('win');
    setTimeout(confetti, 250);
    setTimeout(() => openModal(`
      <h2>¡Tablero despejado!</h2>
      <p>Has completado <b>${L.name}</b> (partida nº ${G.seed}).</p>
      <div class="res">
        <div><b>${fmt(G.time)}</b><small>Tiempo</small>${recT ? '<em>¡Récord!</em>' : ''}</div>
        <div><b>${G.score}</b><small>Puntos</small>${recS ? '<em>¡Récord!</em>' : ''}</div>
        <div><b>+${bonus}</b><small>Bonus tiempo</small></div>
        <div><b>${G.hints} / ${G.shuffles}</b><small>Pistas / barajadas</small></div>
      </div>
      <div class="row-btns">
        <button class="btn" data-a="layouts">Cambiar tablero</button>
        <button class="btn primary" data-a="new">Nueva partida</button>
      </div>`), 900);
  }

  function noMoves() {
    openModal(`
      <h2>No quedan jugadas</h2>
      <p>No hay ninguna pareja libre. Puedes barajar las fichas que quedan (−40 puntos), deshacer jugadas o empezar otra partida.</p>
      <div class="row-btns">
        <button class="btn" data-a="new">Nueva partida</button>
        <button class="btn" data-a="undo" ${G.hist.length ? '' : 'disabled'}>Deshacer</button>
        <button class="btn primary" data-a="shuffle">Barajar</button>
      </div>`);
  }

  function confetti() {
    const dpr = geo.dpr, W = geo.W, H = geo.H;
    const cols = ['#f2c14e', '#e8590c', '#c1272d', '#2b8a3e', '#1c7ed6', '#ffffff', '#ae3ec9'];
    const parts = Array.from({ length: 170 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45,
      vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 11,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      s: 6 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function step(now) {
      const t = now - t0;
      fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
      fxc.clearRect(0, 0, W, H);
      if (t > 4200) return;
      fxc.globalAlpha = Math.min(1, (4200 - t) / 800);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        fxc.save(); fxc.translate(p.x, p.y); fxc.rotate(p.r);
        fxc.fillStyle = p.c; fxc.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        fxc.restore();
      }
      requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Sonido ---------- */
  let ac = null;
  const NOTES = {
    tap: [[700, 0.04]],
    match: [[880, 0.07], [1320, 0.12]],
    bad: [[170, 0.11]],
    hint: [[740, 0.07], [990, 0.09]],
    shuffle: [[420, 0.05], [520, 0.05], [640, 0.05], [760, 0.06]],
    win: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.35]],
  };
  function sfx(type) {
    if (!cfg.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      let t = ac.currentTime + 0.01;
      for (const [f, d] of NOTES[type]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type === 'bad' ? 'square' : 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(type === 'bad' ? 0.06 : 0.16, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + d + 0.03);
        t += d * 0.8;
      }
    } catch (e) { /* sin audio */ }
  }

  /* ---------- Ventanas ---------- */
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="8.5" y="12" width="7" height="9" rx="1.5"/></svg>',
    hash: '<svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5.9z"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/></svg>',
  };

  function openModal(html, opts) {
    sheet.className = opts && opts.wide ? 'wide' : '';
    sheet.innerHTML = html;
    sheet.scrollTop = 0;
    $('modal').classList.add('show');
    modalOpen = true;
  }
  function closeModal() {
    $('modal').classList.remove('show');
    sheet.innerHTML = '';
    modalOpen = false;
  }

  function showMenu() {
    openModal(`
      <h2>Menú</h2>
      <div class="menu-list">
        <button class="btn" data-a="askNew">${ICON.play}Nueva partida</button>
        <button class="btn" data-a="askRestart">${ICON.restart}Reiniciar esta partida</button>
        <button class="btn" data-a="layouts">${ICON.grid}Elegir tablero</button>
        <button class="btn" data-a="number">${ICON.hash}Jugar una partida por número</button>
        <button class="btn" data-a="stats">${ICON.chart}Estadísticas</button>
        <button class="btn" data-a="settings">${ICON.gear}Ajustes</button>
        <button class="btn" data-a="help">${ICON.help}Cómo se juega</button>
      </div>
      <div class="row-btns"><button class="btn primary" data-a="close">Volver al juego</button></div>`);
  }

  function confirmBox(title, text, action, label) {
    openModal(`<h2>${title}</h2><p>${text}</p>
      <div class="row-btns"><button class="btn" data-a="close">Cancelar</button><button class="btn primary" data-a="${action}">${label}</button></div>`);
  }

  function askNew() {
    if (inProgress()) confirmBox('¿Nueva partida?', 'La partida actual se contará como no terminada.', 'new', 'Nueva partida');
    else { closeModal(); newGame(cfg.layout); }
  }

  function showLayouts() {
    const cards = LAYOUTS.map(l => {
      const s = stats[l.id];
      const won = s && s.won ? ` · ganadas ${s.won}` : '';
      return `<button class="lay${l.id === G.layout ? ' cur' : ''}" data-a="pick" data-id="${l.id}">
        <canvas data-prev="${l.id}"></canvas><b>${l.name}</b>
        <small>${l.count} fichas · ${l.levels} niveles${won}</small><p>${l.desc}</p></button>`;
    }).join('');
    openModal(`<h2>Elige tablero</h2>
      <p>${inProgress() ? 'Al elegir un tablero empieza una partida nueva; la actual contará como no terminada.' : 'Toca un tablero para empezar.'}</p>
      <div class="layouts">${cards}</div>
      <div class="row-btns"><button class="btn" data-a="close">Cancelar</button></div>`, { wide: true });
    sheet.querySelectorAll('canvas[data-prev]').forEach(c => preview(c, findLayout(c.dataset.prev)));
  }

  function preview(c, lay) {
    const dpr = window.devicePixelRatio || 1, W = c.clientWidth || 200, H = c.clientHeight || 110;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const t of lay.tiles) { maxX = Math.max(maxX, t.x); maxY = Math.max(maxY, t.y); maxZ = Math.max(maxZ, t.z); }
    const K = 0.14, R = 1.3, sx = (maxX + 2) / 2, sy = (maxY + 2) / 2;
    const tw = Math.min((W - 12) / (sx + K * (maxZ + 1)), (H - 12) / (R * sy + K * (maxZ + 1)));
    const th = tw * R, d = tw * K;
    const ox = (W - (sx * tw + d * (maxZ + 1))) / 2 + d, oy = (H - (sy * th + d * (maxZ + 1))) / 2 + d * maxZ;
    const order = lay.tiles.slice().sort((a, b) => a.z - b.z || (a.y - a.x) - (b.y - b.x) || a.y - b.y);
    const st = STYLES[cfg.tiles] || STYLES.marfil;
    for (const t of order) {
      const px = ox + t.x * tw / 2 + t.z * d, py = oy + t.y * th / 2 - t.z * d;
      x.fillStyle = st.back; x.fillRect(px - d, py + d, tw, th);
      x.fillStyle = st.top; x.fillRect(px, py, tw, th);
      x.fillStyle = 'rgba(120,90,30,' + Math.max(0, 0.32 - t.z * 0.08).toFixed(2) + ')'; x.fillRect(px, py, tw, th);
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 0.6; x.strokeRect(px + 0.3, py + 0.3, tw - 0.6, th - 0.6);
    }
  }

  function showNumber() {
    openModal(`<h2>Partida por número</h2>
      <p>Cada número da siempre el mismo reparto en el tablero <b>${L.name}</b>: sirve para repetir una partida o para competir con otra persona con las mismas fichas.</p>
      <input class="num" id="inNum" type="number" inputmode="numeric" min="1" max="999999" value="${G.seed}">
      <div class="row-btns"><button class="btn" data-a="close">Cancelar</button><button class="btn primary" data-a="goNum">Jugar</button></div>`);
  }

  function showStats() {
    let tp = 0, tw = 0;
    const rows = LAYOUTS.map(l => {
      const s = stats[l.id] || {};
      tp += s.played || 0; tw += s.won || 0;
      const pct = s.played ? Math.round(100 * (s.won || 0) / s.played) + '%' : '—';
      return `<tr><td>${l.name}</td><td>${s.played || 0}</td><td>${s.won || 0}</td><td>${pct}</td>
        <td>${s.bestTime ? fmt(s.bestTime) : '—'}</td><td>${s.bestScore || '—'}</td><td>${s.bestStreak || 0}</td></tr>`;
    }).join('');
    openModal(`<h2>Estadísticas</h2>
      <div class="scroll-x"><table class="st">
        <tr><th>Tablero</th><th>Jugadas</th><th>Ganadas</th><th>%</th><th>Mejor tiempo</th><th>Mejor puntuación</th><th>Mejor racha</th></tr>
        ${rows}
        <tr class="tot"><td>Total</td><td>${tp}</td><td>${tw}</td><td>${tp ? Math.round(100 * tw / tp) + '%' : '—'}</td><td></td><td></td><td></td></tr>
      </table></div>
      <p style="font-size:13.5px;opacity:.7">Una partida cuenta como jugada desde la primera pareja que retiras.</p>
      <div class="row-btns"><button class="btn danger" data-a="askReset">Borrar estadísticas</button><button class="btn primary" data-a="close">Cerrar</button></div>`, { wide: true });
  }

  function toggle(k, label, sub) {
    return `<label class="set"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>
      <input type="checkbox" class="switch" data-k="${k}" ${cfg[k] ? 'checked' : ''}></label>`;
  }

  function showSettings() {
    const bgs = BGS.map(([id, c]) => `<button data-a="bg" data-id="${id}" class="${cfg.bg === id ? 'on' : ''}" style="background:${c}" aria-label="Fondo ${id}"></button>`).join('');
    const sts = Object.entries(STYLES).map(([id, s]) =>
      `<button data-a="ts" data-id="${id}" class="${cfg.tiles === id ? 'on' : ''}" style="background:linear-gradient(135deg,${s.top} 55%,${s.back} 56%)" aria-label="Fichas ${s.name}"></button>`).join('');
    openModal(`<h2>Ajustes</h2>
      <div class="set"><span>Color de la mesa</span><div class="sw">${bgs}</div></div>
      <div class="set"><span>Estilo de las fichas<small>${(STYLES[cfg.tiles] || STYLES.marfil).name}</small></span><div class="sw">${sts}</div></div>
      ${toggle('sound', 'Sonido')}
      ${toggle('highlight', 'Oscurecer fichas bloqueadas', 'Ayuda a ver de un vistazo qué fichas se pueden mover')}
      ${toggle('indices', 'Números en las esquinas', 'Muestra el valor de cada ficha en una esquina')}
      ${toggle('showMoves', 'Mostrar jugadas disponibles', 'Cuántas parejas libres hay en cada momento')}
      ${toggle('solvable', 'Repartos siempre resolubles', 'Se aplica desde la próxima partida')}
      <div class="row-btns"><button class="btn primary" data-a="close">Hecho</button></div>`);
    sheet.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('change', () => {
      cfg[inp.dataset.k] = inp.checked;
      applyCfg();
    }));
  }

  function applyCfg() {
    store.set('cfg', cfg);
    document.body.dataset.bg = cfg.bg;
    cache.key = '';
    if (geo) { buildCache(); draw(); }
    if (G) updateHud();
  }

  function showHelp() {
    const demo = [0, 4, 9, 13, 18, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39];
    openModal(`<h2>Cómo se juega</h2>
      <p>El objetivo es dejar la mesa vacía retirando las fichas <b>por parejas iguales</b>.</p>
      <h3>Fichas libres</h3>
      <p>Solo puedes tocar una ficha si está <b>libre</b>: no tiene ninguna ficha encima y tiene libre el lado izquierdo o el derecho. Si tocas una ficha bloqueada, parpadea en rojo.</p>
      <h3>Parejas</h3>
      <ul>
        <li>Círculos, bambú y caracteres (del 1 al 9), vientos y dragones: se emparejan con otra <b>idéntica</b>.</li>
        <li>Las cuatro <b>flores</b> casan entre sí, y las cuatro <b>estaciones</b> también.</li>
      </ul>
      <div class="tiles-demo">${demo.map(f => `<canvas data-face="${f}" title="${T.faceName(f)}"></canvas>`).join('')}</div>
      <h3>Ayudas</h3>
      <ul>
        <li><b>Pista</b> (−15 puntos): ilumina una pareja disponible; púlsala otra vez para ver otra.</li>
        <li><b>Barajar</b> (−40 puntos): reparte de nuevo las fichas que quedan sin mover sus posiciones, de forma que la partida siga teniendo solución.</li>
        <li><b>Deshacer</b> y <b>Rehacer</b> sin límite.</li>
      </ul>
      <h3>Puntuación</h3>
      <ul>
        <li>10 puntos por pareja; +5 si la haces en menos de 4 segundos desde la anterior.</li>
        <li>Dragones +4; flores y estaciones +6.</li>
        <li>Al terminar, bonus por tiempo: 3 puntos por ficha del tablero menos los segundos empleados.</li>
      </ul>
      <h3>Consejos</h3>
      <ul>
        <li>Prioriza las fichas que liberan más fichas: las de arriba de las pilas y las de los extremos de filas largas.</li>
        <li>Si las cuatro fichas de un tipo están libres, retíralas todas; si solo ves tres, piensa cuál dejar.</li>
        <li>Con «Repartos siempre resolubles» activado cada partida tiene al menos una solución.</li>
      </ul>
      <p>La partida se guarda sola: puedes salir y continuar más tarde.</p>
      <div class="row-btns"><button class="btn primary" data-a="close">Entendido</button></div>`);
    sheet.querySelectorAll('canvas[data-face]').forEach(c => {
      const dpr = window.devicePixelRatio || 1, w = Math.round(38 * dpr), h = Math.round(50 * dpr);
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = (STYLES[cfg.tiles] || STYLES.marfil).top;
      T.rr(x, 0, 0, w, h, w * 0.12); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = dpr; T.rr(x, 0.5, 0.5, w - 1, h - 1, w * 0.12); x.stroke();
      const f = document.createElement('canvas'); f.width = w; f.height = h;
      T.drawFace(f.getContext('2d'), +c.dataset.face, w, h, { indices: cfg.indices });
      x.drawImage(f, 0, 0);
    });
  }

  let toastT = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  const ACT = {
    close: closeModal,
    menu: showMenu,
    askNew,
    new: () => { closeModal(); newGame(cfg.layout); },
    askRestart: () => confirmBox('¿Reiniciar la partida?', 'Volverás a empezar con el mismo reparto de fichas.', 'restart', 'Reiniciar'),
    restart: () => { closeModal(); newGame(G.layout, G.seed); },
    layouts: showLayouts,
    pick: (b) => { closeModal(); newGame(b.dataset.id); },
    number: showNumber,
    goNum: () => {
      const n = parseInt($('inNum').value, 10);
      if (!(n >= 1 && n <= 999999)) { toast('Escribe un número entre 1 y 999999.'); return; }
      closeModal(); newGame(G.layout, n);
    },
    stats: showStats,
    askReset: () => confirmBox('¿Borrar estadísticas?', 'Se perderán todos los récords y contadores. No se puede deshacer.', 'doReset', 'Borrar'),
    doReset: () => { stats = {}; saveStats(); showStats(); toast('Estadísticas borradas.'); },
    settings: showSettings,
    bg: (b) => { cfg.bg = b.dataset.id; applyCfg(); showSettings(); },
    ts: (b) => { cfg.tiles = b.dataset.id; applyCfg(); showSettings(); },
    help: showHelp,
    undo: () => { closeModal(); undo(); },
    shuffle: () => { closeModal(); doShuffle(); },
  };

  /* ---------- Eventos ---------- */
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (b && !b.disabled && ACT[b.dataset.a]) ACT[b.dataset.a](b);
  });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  canvas.addEventListener('pointerdown', (e) => {
    if (!G || G.done || paused) return;
    const r = canvas.getBoundingClientRect();
    const i = hit(e.clientX - r.left, e.clientY - r.top);
    if (i < 0) { if (sel >= 0 || hint) { sel = -1; hint = null; kick(); } return; }
    tapTile(i);
  });

  $('bMenu').onclick = showMenu;
  $('bUndo').onclick = undo;
  $('bRedo').onclick = redo;
  $('bHint').onclick = showHint;
  $('bShuffle').onclick = () => {
    if (G.done) return;
    if (pairsNow().length) confirmBox('¿Barajar?', 'Todavía hay jugadas disponibles. Barajar cuesta 40 puntos.', 'shuffle', 'Barajar');
    else doShuffle();
  };
  $('bPause').onclick = () => setPause(!paused);
  $('bResume').onclick = () => setPause(false);
  $('bNew').onclick = askNew;

  document.addEventListener('keydown', (e) => {
    if (modalOpen) { if (e.key === 'Escape') closeModal(); return; }
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); }
    else if (k === 'z') undo();
    else if (k === 'y') redo();
    else if (k === 'h') showHint();
    else if (k === 'p' || k === ' ') setPause(!paused);
    else if (k === 'escape') { sel = -1; hint = null; kick(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); if (G && G.started && !G.done) setPause(true); }
  });

  setInterval(() => {
    if (!G || !G.started || G.done || paused || modalOpen || document.hidden) return;
    G.time++;
    $('sTime').textContent = fmt(G.time);
    if (++saveTick % 5 === 0) save();
  }, 1000);

  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe($('stage'));
  window.addEventListener('resize', resize);

  // Llamadas desde la app Android (botón atrás y paso a segundo plano).
  window.appBack = () => {
    if (modalOpen) { closeModal(); return true; }
    if (paused) { setPause(false); return true; }
    if (sel >= 0 || hint) { sel = -1; hint = null; kick(); return true; }
    save();
    return false;
  };
  window.appPause = () => { save(); if (G && G.started && !G.done) setPause(true); };

  /* ---------- Arranque ---------- */
  document.body.dataset.bg = cfg.bg;
  if (!restore()) newGame(cfg.layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cache.key = ''; resize(); });
  if (!store.get('seenHelp', false)) { store.set('seenHelp', true); showHelp(); }

  window.MJDebug = {
    get G() { return G; }, get sel() { return sel; }, get paused() { return paused; }, get modalOpen() { return modalOpen; },
    pairsNow, newGame,
    tileCenter: (i) => { const [x, y] = tilePos(i); return [x + geo.tw / 2, y + geo.th / 2]; },
  };
})();
