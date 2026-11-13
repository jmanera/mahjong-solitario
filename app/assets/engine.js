/* Motor del juego: reglas, repartos resolubles, barajado y pistas. Sin dependencias del DOM. */
(function (root) {
  'use strict';

  // Caras: 0-8 círculos, 9-17 bambú, 18-26 caracteres, 27-30 vientos, 31-33 dragones, 34-37 flores, 38-41 estaciones.
  const FACES = 42;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Las flores casan entre sí y las estaciones entre sí; el resto, con su igual.
  function keyOf(f) { return f < 34 ? f : (f < 38 ? 34 : 35); }

  function neighbors(pos) {
    const n = pos.length, above = [], left = [], right = [];
    for (let i = 0; i < n; i++) { above.push([]); left.push([]); right.push([]); }
    for (let i = 0; i < n; i++) {
      const a = pos[i];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = pos[j], dx = b.x - a.x, dy = Math.abs(b.y - a.y);
        if (dy >= 2) continue;
        if (b.z > a.z && Math.abs(dx) < 2) above[i].push(j);
        else if (b.z === a.z) {
          if (dx === -2) left[i].push(j);
          else if (dx === 2) right[i].push(j);
        }
      }
    }
    return { above, left, right };
  }

  function isFree(i, nb, removed) {
    for (const j of nb.above[i]) if (!removed[j]) return false;
    let leftFree = true;
    for (const j of nb.left[i]) if (!removed[j]) { leftFree = false; break; }
    if (leftFree) return true;
    for (const j of nb.right[i]) if (!removed[j]) return false;
    return true;
  }

  function freeTiles(nb, removed) {
    const out = [];
    for (let i = 0; i < removed.length; i++) if (!removed[i] && isFree(i, nb, removed)) out.push(i);
    return out;
  }

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Elige parejas por juegos completos (las 4 fichas de un tipo) para que haya decisiones reales.
  function makePairs(npairs, rnd) {
    const groups = [];
    for (let k = 0; k < 34; k++) groups.push([[k, k], [k, k]]);
    groups.push([[34, 35], [36, 37]]);
    groups.push([[38, 39], [40, 41]]);
    shuffle(groups, rnd);
    const out = [];
    for (const g of groups) for (const p of g) if (out.length < npairs) out.push(p);
    return out;
  }

  function pickWeighted(list, pos, rnd) {
    let total = 0;
    const w = list.map(i => { const v = 1 + 2 * pos[i].z; total += v; return v; });
    let r = rnd() * total;
    for (let k = 0; k < list.length; k++) { r -= w[k]; if (r < 0) return k; }
    return list.length - 1;
  }

  // Retira parejas de fichas libres a la vez sobre el tablero lleno y les asigna caras:
  // jugar esas retiradas en el mismo orden resuelve la partida, así que el reparto es resoluble.
  function assign(pos, nb, pairs, removed0, rnd) {
    const n = pos.length, removed = removed0.slice(), faces = new Array(n).fill(-1), order = [];
    for (const p of shuffle(pairs.slice(), rnd)) {
      const free = freeTiles(nb, removed);
      if (free.length < 2) return null;
      const a = free.splice(pickWeighted(free, pos, rnd), 1)[0];
      const b = free[pickWeighted(free, pos, rnd)];
      const swap = rnd() < 0.5;
      faces[a] = swap ? p[1] : p[0];
      faces[b] = swap ? p[0] : p[1];
      removed[a] = removed[b] = true;
      order.push([a, b]);
    }
    return { faces, order };
  }

  function dealRandom(n, rnd) {
    const faces = [];
    for (const p of makePairs(n / 2, rnd)) faces.push(p[0], p[1]);
    return shuffle(faces, rnd);
  }

  function deal(pos, nb, rnd) {
    const pairs = makePairs(pos.length / 2, rnd);
    const none = new Array(pos.length).fill(false);
    for (let t = 0; t < 500; t++) {
      const r = assign(pos, nb, pairs, none, rnd);
      if (r) return r.faces;
    }
    return dealRandom(pos.length, rnd);
  }

  // Redistribuye las caras que quedan manteniendo la partida resoluble. null si la geometría no lo permite.
  function reshuffle(pos, nb, faces, removed, rnd) {
    const byKey = {};
    faces.forEach((f, i) => { if (!removed[i]) (byKey[keyOf(f)] = byKey[keyOf(f)] || []).push(f); });
    const pairs = [];
    for (const k in byKey) {
      const l = shuffle(byKey[k], rnd);
      for (let i = 0; i + 1 < l.length; i += 2) pairs.push([l[i], l[i + 1]]);
    }
    for (let t = 0; t < 300; t++) {
      const r = assign(pos, nb, pairs, removed, rnd);
      if (r) return faces.map((f, i) => (removed[i] ? f : r.faces[i]));
    }
    return null;
  }

  function availablePairs(nb, faces, removed) {
    const free = freeTiles(nb, removed), out = [];
    for (let a = 0; a < free.length; a++)
      for (let b = a + 1; b < free.length; b++)
        if (keyOf(faces[free[a]]) === keyOf(faces[free[b]])) out.push([free[a], free[b]]);
    return out;
  }

  const api = { FACES, rng, keyOf, neighbors, isFree, freeTiles, makePairs, assign, deal, dealRandom, reshuffle, availablePairs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJEngine = api;
})(this);
