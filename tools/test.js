// Comprobaciones de la lógica: node tools/test.js
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../app/assets/engine.js'));
const { list } = require(path.join(__dirname, '../app/assets/layouts.js'));

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('  FALLO: ' + msg); } };

for (const L of list) {
  const pos = L.tiles, n = pos.length, nb = E.neighbors(pos);
  check(n % 2 === 0 && n <= 144 && n >= 20, `${L.id}: ${n} fichas`);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = pos[i], b = pos[j];
    if (a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2) check(false, `${L.id}: solape en ${JSON.stringify(a)} ${JSON.stringify(b)}`);
  }
  for (const a of pos) if (a.z > 0) {
    const sup = pos.some(b => b.z === a.z - 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2);
    check(sup, `${L.id}: ficha sin apoyo ${JSON.stringify(a)}`);
  }

  // Repartos: tasa de éxito al primer intento y validez del orden de resolución.
  let first = 0, total = 0;
  const N = 150;
  for (let s = 1; s <= N; s++) {
    const rnd = E.rng(s * 7919 + L.idx);
    const pairs = E.makePairs(n / 2, rnd);
    const counts = {};
    pairs.forEach(p => { counts[E.keyOf(p[0])] = (counts[E.keyOf(p[0])] || 0) + 2; check(E.keyOf(p[0]) === E.keyOf(p[1]), 'pareja no casa'); });
    let r = null, tries = 0;
    while (!r && tries < 500) { r = E.assign(pos, nb, pairs, new Array(n).fill(false), rnd); tries++; }
    total += tries; if (tries === 1) first++;
    check(!!r, `${L.id}: semilla ${s} sin reparto resoluble`);
    if (!r) continue;
    check(r.faces.every(f => f >= 0 && f < 42), `${L.id}: caras sin asignar`);
    const removed = new Array(n).fill(false);
    for (const [a, b] of r.order) {
      check(E.isFree(a, nb, removed) && E.isFree(b, nb, removed), `${L.id}: orden de solución no válido`);
      check(E.keyOf(r.faces[a]) === E.keyOf(r.faces[b]), `${L.id}: pareja de solución no casa`);
      removed[a] = removed[b] = true;
    }
    // determinismo
    const d1 = E.deal(pos, nb, E.rng(s)), d2 = E.deal(pos, nb, E.rng(s));
    check(d1.join() === d2.join(), `${L.id}: reparto no determinista`);
  }

  // Barajar a mitad de partida mantiene caras y resolubilidad.
  const faces = E.deal(pos, nb, E.rng(42)), removed = new Array(n).fill(false);
  const rnd = E.rng(7);
  for (let k = 0; k < n / 4; k++) {
    const av = E.availablePairs(nb, faces, removed);
    if (!av.length) break;
    const [a, b] = av[Math.floor(rnd() * av.length)];
    removed[a] = removed[b] = true;
  }
  const sh = E.reshuffle(pos, nb, faces, removed, E.rng(99));
  if (sh) {
    const before = faces.filter((f, i) => !removed[i]).map(E.keyOf).sort().join();
    const after = sh.filter((f, i) => !removed[i]).map(E.keyOf).sort().join();
    check(before === after, `${L.id}: barajar cambia el juego de fichas`);
  }

  console.log(`${L.name.padEnd(14)} ${String(n).padStart(3)} fichas, ${L.levels} niveles · reparto al 1er intento ${Math.round(100 * first / N)}% · intentos medios ${(total / N).toFixed(2)} · barajar ${sh ? 'ok' : 'imposible'}`);
}

console.log(fail ? `\n${fail} fallos` : '\nTodo correcto');
process.exit(fail ? 1 : 0);
