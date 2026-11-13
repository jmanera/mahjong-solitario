/* Tableros. Coordenadas en medias fichas: una ficha ocupa 2x2 unidades en (x, y) y está en el nivel z. */
(function (root) {
  'use strict';

  function builder() {
    const p = [];
    const api = {
      rect(z, x0, y0, cols, rows) {
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) p.push({ x: x0 + 2 * i, y: y0 + 2 * j, z });
        return api;
      },
      at(z, x, y) { p.push({ x, y, z }); return api; },
      // Cada '#' es una ficha; columnas y filas avanzan de ficha en ficha, (dx, dy) desplaza en medias fichas.
      art(z, dx, dy, rows) {
        rows.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) if (row[i] === '#') p.push({ x: dx + 2 * i, y: dy + 2 * j, z });
        });
        return api;
      },
      tiles: p,
    };
    return api;
  }

  function diamond(n) {
    const rows = [], c = (n - 1) / 2;
    for (let r = 0; r < n; r++) {
      const w = n - 2 * Math.abs(r - c);
      const pad = (n - w) / 2;
      rows.push('.'.repeat(pad) + '#'.repeat(w) + '.'.repeat(pad));
    }
    return rows;
  }

  function finish(raw) {
    const seen = new Set();
    let t = raw.filter(p => { const k = p.x + ',' + p.y + ',' + p.z; if (seen.has(k)) return false; seen.add(k); return true; });
    const mx = Math.min(...t.map(p => p.x)), my = Math.min(...t.map(p => p.y));
    t = t.map(p => ({ x: p.x - mx, y: p.y - my, z: p.z }));
    t.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
    if (t.length % 2) t.pop(); // número par de fichas: se quita la más alta
    return t;
  }

  const defs = [
    {
      id: 'tortuga', name: 'Tortuga', desc: 'El tablero clásico: 144 fichas en cinco niveles.',
      build: b => b
        .rect(0, 2, 0, 12, 1).rect(0, 6, 2, 8, 1).rect(0, 4, 4, 10, 1).rect(0, 2, 6, 12, 1)
        .rect(0, 2, 8, 12, 1).rect(0, 4, 10, 10, 1).rect(0, 6, 12, 8, 1).rect(0, 2, 14, 12, 1)
        .at(0, 0, 7).at(0, 26, 7).at(0, 28, 7)
        .rect(1, 8, 2, 6, 6).rect(2, 10, 4, 4, 4).rect(3, 12, 6, 2, 2).at(4, 13, 7),
    },
    {
      id: 'iniciacion', name: 'Iniciación', desc: 'Pequeño y tranquilo, ideal para aprender.',
      build: b => b.rect(0, 0, 0, 6, 4).rect(1, 2, 2, 4, 2).rect(2, 4, 2, 2, 2),
    },
    {
      id: 'piramide', name: 'Pirámide', desc: 'Cuatro pisos que se estrechan hacia la cima.',
      build: b => b.rect(0, 0, 0, 8, 8).rect(1, 2, 2, 6, 6).rect(2, 4, 4, 4, 4).rect(3, 6, 6, 2, 2),
    },
    {
      id: 'diamante', name: 'Diamante', desc: 'Un rombo tallado en cinco capas.',
      build: b => b.art(0, 0, 0, diamond(9)).art(1, 2, 2, diamond(7)).art(2, 4, 4, diamond(5))
        .art(3, 6, 6, diamond(3)).at(4, 8, 8),
    },
    {
      id: 'corazon', name: 'Corazón', desc: 'Para jugar con cariño.',
      build: b => b
        .art(0, 0, 0, ['.###.###.', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'])
        .art(1, 2, 2, ['.##.##.', '#######', '.#####.', '..###..', '...#...'])
        .art(2, 3, 3, ['##.##', '#####', '.###.'])
        .art(3, 5, 5, ['###']),
    },
    {
      id: 'mariposa', name: 'Mariposa', desc: 'Dos alas abiertas y un cuerpo alto en el centro.',
      build: b => b
        .art(0, 0, 0, ['###..#..###', '####.#.####', '###########', '###########', '###########', '####.#.####', '###..#..###'])
        .art(1, 2, 2, ['##..#..##', '#########', '#########', '#########', '##..#..##'])
        .rect(2, 10, 2, 1, 5).rect(3, 10, 4, 1, 3),
    },
    {
      id: 'cruz', name: 'Cruz', desc: 'Brazos largos con el cruce bien cargado.',
      build: b => b
        .art(0, 0, 0, ['...####...', '...####...', '...####...', '##########', '##########', '##########', '...####...', '...####...', '...####...'])
        .art(1, 1, 1, ['...###...', '...###...', '...###...', '#########', '#########', '...###...', '...###...', '...###...'])
        .art(2, 2, 2, ['...##...', '...##...', '...##...', '########', '...##...', '...##...', '...##...'])
        .rect(3, 9, 3, 1, 4),
    },
    {
      id: 'puente', name: 'Puente', desc: 'Dos torres unidas por una pasarela.',
      build: b => b
        .rect(0, 0, 0, 4, 6).rect(0, 18, 0, 4, 6).rect(0, 8, 4, 5, 2)
        .rect(1, 1, 1, 3, 4).rect(1, 19, 1, 3, 4).rect(1, 8, 5, 5, 1)
        .rect(2, 2, 3, 2, 2).rect(2, 20, 3, 2, 2).at(2, 12, 5)
        .at(3, 3, 4).at(3, 21, 4),
    },
    {
      id: 'torres', name: 'Cuatro torres', desc: 'Una explanada con una torre en cada esquina.',
      build: b => b
        .rect(0, 0, 0, 10, 7)
        .rect(1, 0, 0, 3, 3).rect(1, 14, 0, 3, 3).rect(1, 0, 8, 3, 3).rect(1, 14, 8, 3, 3).rect(1, 7, 5, 3, 2)
        .rect(2, 1, 1, 2, 2).rect(2, 15, 1, 2, 2).rect(2, 1, 9, 2, 2).rect(2, 15, 9, 2, 2)
        .at(3, 2, 2).at(3, 16, 2).at(3, 2, 10).at(3, 16, 10),
    },
    {
      id: 'fortaleza', name: 'Fortaleza', desc: 'Murallas, torreones y una torre del homenaje.',
      build: b => b
        .rect(0, 0, 0, 12, 8)
        .rect(1, 0, 0, 2, 2).rect(1, 20, 0, 2, 2).rect(1, 0, 12, 2, 2).rect(1, 20, 12, 2, 2).rect(1, 8, 4, 4, 4)
        .at(2, 1, 1).at(2, 21, 1).at(2, 1, 13).at(2, 21, 13).rect(2, 10, 6, 2, 2),
    },
    {
      id: 'muralla', name: 'Muralla', desc: 'Larga y escalonada: paciencia con los extremos.',
      build: b => b.rect(0, 0, 0, 14, 4).rect(1, 1, 1, 13, 3).rect(2, 2, 2, 12, 2).rect(3, 3, 3, 11, 1),
    },
    {
      id: 'escalera', name: 'Escalera', desc: 'Peldaños que suben hacia la derecha.',
      build: b => b.rect(0, 0, 0, 12, 4).rect(1, 6, 0, 9, 4).rect(2, 12, 0, 6, 4).rect(3, 18, 0, 3, 4),
    },
  ];

  const list = defs.map((d, idx) => {
    const tiles = finish(d.build(builder()).tiles);
    return {
      id: d.id, name: d.name, desc: d.desc, idx, tiles,
      count: tiles.length, levels: 1 + Math.max(...tiles.map(t => t.z)),
    };
  });

  const api = { list };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJLayouts = api;
})(this);
