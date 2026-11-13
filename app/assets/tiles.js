/* Dibujo de las caras de las fichas en un canvas (w x h en píxeles reales). */
(function (root) {
  'use strict';

  const CJK = '"Noto Serif CJK SC","Noto Serif CJK TC","Noto Serif CJK JP","Noto Sans CJK SC","Noto Sans CJK JP","Source Han Serif SC","Droid Sans Fallback",serif';
  const COL = { b: '#1c4f9c', g: '#17703c', r: '#c1272d', ink: '#1d2340', w: '#fffaf0' };
  const DARK = { b: '#123a73', g: '#0d4a26', r: '#8f1a1f' };
  const NUM = '一二三四五六七八九', WIND = '東南西北', WIND_L = 'ESON', FLOW = '梅蘭菊竹', SEAS = '春夏秋冬';

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
  function text(c, s, x, y, size, color, weight) {
    c.font = (weight || 700) + ' ' + size + 'px ' + CJK;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }

  /* Círculos */
  const DOTS = [
    [[0.5, 0.5]],
    [[0.5, 0.26], [0.5, 0.74]],
    [[0.2, 0.17], [0.5, 0.5], [0.8, 0.83]],
    [[0.27, 0.26], [0.73, 0.26], [0.27, 0.74], [0.73, 0.74]],
    [[0.25, 0.2], [0.75, 0.2], [0.5, 0.5], [0.25, 0.8], [0.75, 0.8]],
    [[0.28, 0.17], [0.72, 0.17], [0.28, 0.53], [0.72, 0.53], [0.28, 0.85], [0.72, 0.85]],
    [[0.2, 0.1], [0.5, 0.23], [0.8, 0.36], [0.28, 0.62], [0.72, 0.62], [0.28, 0.88], [0.72, 0.88]],
    [[0.28, 0.11], [0.72, 0.11], [0.28, 0.37], [0.72, 0.37], [0.28, 0.63], [0.72, 0.63], [0.28, 0.89], [0.72, 0.89]],
    [[0.18, 0.17], [0.5, 0.17], [0.82, 0.17], [0.18, 0.5], [0.5, 0.5], [0.82, 0.5], [0.18, 0.83], [0.5, 0.83], [0.82, 0.83]],
  ];
  const DOT_R = [0.34, 0.2, 0.16, 0.19, 0.17, 0.15, 0.13, 0.12, 0.14];
  const DOT_C = ['r', 'bg', 'brg', 'bggb', 'bgrgb', 'ggrrrr', 'gggrrrr', 'bbbbbbbb', 'bbbrrrggg'];

  function dot(c, x, y, r, col) {
    circle(c, x, y, r); c.fillStyle = COL[col]; c.fill();
    circle(c, x, y, r * 0.74); c.fillStyle = COL.w; c.fill();
    circle(c, x, y, r * 0.52); c.fillStyle = COL[col]; c.fill();
    circle(c, x, y, r * 0.2); c.fillStyle = COL.w; c.fill();
  }
  function bigDot(c, x, y, r) {
    const rings = [[1, COL.r], [0.86, COL.w], [0.76, COL.g], [0.56, COL.w], [0.46, COL.b], [0.2, COL.w]];
    for (const [k, col] of rings) { circle(c, x, y, r * k); c.fillStyle = col; c.fill(); }
    c.fillStyle = COL.r;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      circle(c, x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, r * 0.07); c.fill();
    }
  }

  /* Bambú */
  const BAM = {
    2: { L: 0.36, p: [[0.5, 0.26, 'g'], [0.5, 0.74, 'b']] },
    3: { L: 0.36, p: [[0.5, 0.26, 'b'], [0.28, 0.74, 'g'], [0.72, 0.74, 'g']] },
    4: { L: 0.36, p: [[0.28, 0.26, 'b'], [0.72, 0.26, 'g'], [0.28, 0.74, 'g'], [0.72, 0.74, 'b']] },
    5: { L: 0.36, p: [[0.2, 0.26, 'g'], [0.8, 0.26, 'b'], [0.5, 0.5, 'r'], [0.2, 0.74, 'b'], [0.8, 0.74, 'g']] },
    6: { L: 0.36, p: [[0.2, 0.26, 'g'], [0.5, 0.26, 'g'], [0.8, 0.26, 'g'], [0.2, 0.74, 'b'], [0.5, 0.74, 'b'], [0.8, 0.74, 'b']] },
    7: { L: 0.26, p: [[0.5, 0.16, 'r'], [0.2, 0.5, 'g'], [0.5, 0.5, 'b'], [0.8, 0.5, 'g'], [0.2, 0.84, 'g'], [0.5, 0.84, 'b'], [0.8, 0.84, 'g']] },
    8: { L: 0.36, W: 0.11, p: [[0.13, 0.26, 'g'], [0.38, 0.26, 'b'], [0.62, 0.26, 'b'], [0.87, 0.26, 'g'], [0.13, 0.74, 'g'], [0.38, 0.74, 'b'], [0.62, 0.74, 'b'], [0.87, 0.74, 'g']] },
    9: { L: 0.26, p: [[0.2, 0.16, 'g'], [0.5, 0.16, 'r'], [0.8, 0.16, 'b'], [0.2, 0.5, 'g'], [0.5, 0.5, 'r'], [0.8, 0.5, 'b'], [0.2, 0.84, 'g'], [0.5, 0.84, 'r'], [0.8, 0.84, 'b']] },
  };

  function stick(c, x, y, len, wid, col) {
    const x0 = x - wid / 2, y0 = y - len / 2;
    c.fillStyle = COL[col]; rr(c, x0, y0, wid, len, wid * 0.45); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - wid * 0.2, y0 + len * 0.1, wid * 0.14, len * 0.8);
    c.fillStyle = DARK[col];
    c.fillRect(x0 - wid * 0.12, y - wid * 0.13, wid * 1.24, wid * 0.26);
    c.fillRect(x0 - wid * 0.08, y0 + wid * 0.05, wid * 1.16, wid * 0.2);
    c.fillRect(x0 - wid * 0.08, y0 + len - wid * 0.25, wid * 1.16, wid * 0.2);
  }
  function leaf(c, x, y, len, wid, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
    c.fillStyle = col; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = wid * 0.12;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.9, 0); c.stroke();
    c.restore();
  }
  function shoot(c, P, iw, ih) {
    const [x, ytop] = P(0.5, 0.12), [, ybot] = P(0.5, 0.97), w = iw * 0.12;
    stick(c, x, (ytop + ybot) / 2, ybot - ytop, w, 'g');
    const L = iw * 0.36, W = iw * 0.14;
    leaf(c, x, P(0, 0.34)[1], L, W, -Math.PI + 0.55, COL.g);
    leaf(c, x, P(0, 0.5)[1], L, W, -0.55, '#3d9a5a');
    leaf(c, x, P(0, 0.66)[1], L, W, -Math.PI + 0.55, '#3d9a5a');
    leaf(c, x, P(0, 0.8)[1], L * 0.85, W, -0.55, COL.g);
    circle(c, x, ytop, w * 0.85); c.fillStyle = COL.r; c.fill();
  }

  /* Flores y estaciones */
  const PETAL = ['#d6336c', '#7b4fc4', '#e29b12', '#2e8b57'];
  function flower(c, x, y, R, col, stemTo) {
    c.strokeStyle = COL.g; c.lineWidth = R * 0.18; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - R * 0.3, (y + stemTo) / 2, x, stemTo); c.stroke();
    leaf(c, x - R * 0.05, y + (stemTo - y) * 0.6, R * 0.9, R * 0.38, -0.5, COL.g);
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + j * 2 * Math.PI / 5;
      c.beginPath(); c.ellipse(x + Math.cos(a) * R * 0.6, y + Math.sin(a) * R * 0.6, R * 0.5, R * 0.33, a, 0, Math.PI * 2);
      c.fillStyle = col; c.fill();
    }
    circle(c, x, y, R * 0.28); c.fillStyle = '#f7c948'; c.fill();
  }
  function season(c, k, x, y, R) {
    c.lineCap = 'round';
    if (k === 0) { // primavera: brote
      c.strokeStyle = COL.g; c.lineWidth = R * 0.16;
      c.beginPath(); c.moveTo(x, y + R); c.lineTo(x, y - R * 0.2); c.stroke();
      leaf(c, x, y + R * 0.2, R * 0.9, R * 0.4, -Math.PI + 0.7, '#3d9a5a');
      leaf(c, x, y + R * 0.05, R * 0.9, R * 0.4, -0.7, COL.g);
      circle(c, x, y - R * 0.35, R * 0.3); c.fillStyle = '#f06595'; c.fill();
      circle(c, x, y - R * 0.35, R * 0.12); c.fillStyle = '#ffe066'; c.fill();
    } else if (k === 1) { // verano: sol
      c.strokeStyle = '#f08c00'; c.lineWidth = R * 0.13;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        c.beginPath(); c.moveTo(x + Math.cos(a) * R * 0.72, y + Math.sin(a) * R * 0.72);
        c.lineTo(x + Math.cos(a) * R * 1.05, y + Math.sin(a) * R * 1.05); c.stroke();
      }
      circle(c, x, y, R * 0.58); c.fillStyle = '#f08c00'; c.fill();
      circle(c, x, y, R * 0.38); c.fillStyle = '#ffd43b'; c.fill();
    } else if (k === 2) { // otoño: hojas
      leaf(c, x - R * 0.7, y + R * 0.55, R * 1.7, R * 0.85, -0.75, '#d9480f');
      leaf(c, x - R * 0.1, y + R * 0.75, R * 1.1, R * 0.55, -1.9, '#e8a10c');
    } else { // invierno: copo
      c.strokeStyle = '#1971c2'; c.lineWidth = R * 0.12;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + cx * R, y + sy * R); c.stroke();
        for (const s of [-1, 1]) {
          const b = a + s * 0.7, px = x + cx * R * 0.58, py = y + sy * R * 0.58;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * R * 0.32, py + Math.sin(b) * R * 0.32); c.stroke();
        }
      }
      circle(c, x, y, R * 0.14); c.fillStyle = '#1971c2'; c.fill();
    }
  }

  function indexLabel(f) {
    if (f < 9) return [String(f + 1), COL.b];
    if (f < 18) return [String(f - 8), COL.g];
    if (f < 27) return [String(f - 17), COL.r];
    if (f < 31) return [WIND_L[f - 27], COL.ink];
    if (f < 34) return null;
    if (f < 38) return [String(f - 33), '#c2255c'];
    return [String(f - 37), '#d9480f'];
  }

  function drawFace(c, f, w, h, opt) {
    c.save();
    c.clearRect(0, 0, w, h);
    const ix = w * 0.14, iy = h * 0.11, iw = w - 2 * ix, ih = h - 2 * iy;
    const P = (u, v) => [ix + u * iw, iy + v * ih];
    const [cx, cy] = P(0.5, 0.5);

    if (f < 9) {
      if (f === 0) bigDot(c, cx, cy, iw * DOT_R[0] * 1.25);
      else DOTS[f].forEach(([u, v], k) => { const [x, y] = P(u, v); dot(c, x, y, iw * DOT_R[f], DOT_C[f][k]); });
    } else if (f < 18) {
      const n = f - 8;
      if (n === 1) shoot(c, P, iw, ih);
      else {
        const s = BAM[n];
        for (const [u, v, col] of s.p) { const [x, y] = P(u, v); stick(c, x, y, ih * s.L, iw * (s.W || 0.13), col); }
      }
    } else if (f < 27) {
      const [x1, y1] = P(0.5, 0.26), [x2, y2] = P(0.5, 0.72);
      text(c, NUM[f - 18], x1, y1, ih * 0.34, COL.ink, 900);
      text(c, '萬', x2, y2, ih * 0.4, COL.r, 900);
    } else if (f < 31) {
      text(c, WIND[f - 27], cx, cy, ih * 0.56, COL.ink, 900);
    } else if (f === 31) {
      text(c, '中', cx, cy, ih * 0.62, COL.r, 900);
    } else if (f === 32) {
      text(c, '發', cx, cy, ih * 0.56, COL.g, 900);
    } else if (f === 33) {
      c.strokeStyle = COL.b;
      c.lineWidth = w * 0.055; rr(c, ix + w * 0.02, iy + h * 0.02, iw - w * 0.04, ih - h * 0.04, w * 0.06); c.stroke();
      c.lineWidth = w * 0.022; rr(c, ix + w * 0.11, iy + h * 0.1, iw - w * 0.22, ih - h * 0.2, w * 0.03); c.stroke();
    } else if (f < 38) {
      const [tx, ty] = P(0.5, 0.12);
      text(c, FLOW[f - 34], tx, ty, ih * 0.2, '#7a2a50', 800);
      const [x, y] = P(0.5, 0.52);
      flower(c, x, y, iw * 0.24, PETAL[f - 34], P(0.5, 0.98)[1]);
    } else {
      const [tx, ty] = P(0.5, 0.12);
      text(c, SEAS[f - 38], tx, ty, ih * 0.2, '#7a3f0f', 800);
      const [x, y] = P(0.5, 0.6);
      season(c, f - 38, x, y, iw * 0.3);
    }

    if (opt && opt.indices) {
      const lab = indexLabel(f);
      if (lab) {
        c.font = '800 ' + Math.round(h * 0.11) + 'px system-ui,Roboto,sans-serif';
        c.fillStyle = lab[1]; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillText(lab[0], w * 0.07, h * 0.035);
      }
    }
    c.restore();
  }

  function faceName(f) {
    if (f < 9) return (f + 1) + ' de círculos';
    if (f < 18) return (f - 8) + ' de bambú';
    if (f < 27) return (f - 17) + ' de caracteres';
    if (f < 31) return 'Viento del ' + ['este', 'sur', 'oeste', 'norte'][f - 27];
    if (f < 34) return 'Dragón ' + ['rojo', 'verde', 'blanco'][f - 31];
    if (f < 38) return 'Flor ' + (f - 33);
    return ['Primavera', 'Verano', 'Otoño', 'Invierno'][f - 38];
  }

  root.MJTiles = { drawFace, faceName, rr };
})(this);
