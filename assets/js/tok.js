// Tok: every coin's TikTok, drawn live on a canvas from its seed, look, ticker and caption. The same inputs always make
// the same video. record() turns it into a real video file (MP4 where the browser can, WebM otherwise) to post.
(function () {
  'use strict';
  function seeder(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }
  function rng(seed) { let a = seeder(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PAL = [['#2c0a17', '#070205', '#fe2c55'], ['#062b2b', '#020909', '#25f4ee'], ['#1c0b2d', '#06030b', '#b46cff'], ['#0a2615', '#020a05', '#26e07f'], ['#2b1906', '#0a0602', '#ffb020']];
  const LOOKS = ['glitch', 'chart', 'hearts', 'zoom'];
  const CY = '#25f4ee', PK = '#fe2c55';
  const cache = new Map();
  function genes(seed) {
    if (cache.has(seed)) return cache.get(seed);
    const r = rng(seed), pal = PAL[Math.floor(r() * PAL.length)];
    let v = .5; const walk = [];
    for (let i = 0; i < 26; i++) { const o = v; v = Math.max(.08, Math.min(.95, v + (r() - .38) * .11)); walk.push([o, v, Math.max(o, v) + r() * .05, Math.min(o, v) - r() * .05]); }
    const lo = Math.min(...walk.map(w => w[3])), hi = Math.max(...walk.map(w => w[2]));
    walk.forEach(w => { for (let k = 0; k < 4; k++) w[k] = (w[k] - lo) / (hi - lo || 1); });
    const g = { pal, walk, sparks: Array.from({ length: 22 }, () => [r(), r(), r(), r()]), hearts: Array.from({ length: 16 }, () => [r(), r(), r(), r()]), blobs: Array.from({ length: 3 }, () => [r(), r(), r()]), bpm: 112 + Math.floor(r() * 16) };
    cache.set(seed, g); return g;
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * .3);
    ctx.bezierCurveTo(x, y, x - s * .5, y - s * .05, x - s * .5, y + s * .32);
    ctx.bezierCurveTo(x - s * .5, y + s * .6, x - s * .1, y + s * .75, x, y + s * .95);
    ctx.bezierCurveTo(x + s * .1, y + s * .75, x + s * .5, y + s * .6, x + s * .5, y + s * .32);
    ctx.bezierCurveTo(x + s * .5, y - s * .05, x, y, x, y + s * .3); ctx.fill();
  }
  function fit(ctx, text, weight, maxW, maxPx) {
    let px = maxPx; ctx.font = `${weight} ${px}px PB, Poppins, sans-serif`;
    const w = ctx.measureText(text).width; if (w > maxW) px = Math.floor(px * maxW / w);
    ctx.font = `${weight} ${px}px PB, Poppins, sans-serif`; return px;
  }
  function glitchText(ctx, text, x, y, px, d, slice, t) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = CY; ctx.fillText(text, x - d, y - d * .8);
    ctx.fillStyle = PK; ctx.fillText(text, x + d, y + d * .8);
    ctx.globalCompositeOperation = 'source-over';
    if (slice) {
      const h = px * .9;
      for (let i = 0; i < 3; i++) {
        const sy = y - h / 2 + ((Math.sin(t * 37 + i * 9) + 1) / 2) * h * .8, sh = px * (.06 + .05 * i), dx = Math.sin(t * 53 + i * 4) * px * .14;
        ctx.save(); ctx.beginPath(); ctx.rect(0, sy, ctx.canvas.width, sh); ctx.clip();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = CY; ctx.fillText(text, x - d + dx, y - d * .8); ctx.fillStyle = PK; ctx.fillText(text, x + d + dx, y + d * .8);
        ctx.restore(); ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines.slice(0, 3);
  }
  // one frame. o: {seed, look, symbol, caption, mark, state}
  function draw(ctx, W, H, t, o) {
    const g = genes(o.seed || o.symbol || 'tok'), look = LOOKS.includes(o.look) ? o.look : 'glitch', sym = '$' + String(o.symbol || 'TICKER').replace(/^\$/, '').toUpperCase();
    const P = 60 / g.bpm, ph = (t % P) / P, env = Math.exp(-ph * 7), m = Math.min(W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let bg = ctx.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, Math.max(W, H) * .75);
    bg.addColorStop(0, g.pal[0]); bg.addColorStop(1, g.pal[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of g.blobs) {
      const x = W * (.5 + .38 * Math.cos(t * .23 * (b[2] + .5) + b[0] * 6)), y = H * (.45 + .3 * Math.sin(t * .19 * (b[2] + .5) + b[1] * 6)), r = m * (.35 + b[2] * .25);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, g.pal[2] + '33'); gg.addColorStop(1, g.pal[2] + '00'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    const cy = H > W * 1.2 ? H * .4 : H * .5;
    if (look === 'chart') {
      const n = g.walk.length, shown = Math.min(n, Math.floor(((t % 7) / 5.2) * n) + 1), cw = W * .78 / n, x0 = W * .11, top = cy - m * .05, hh = H > W * 1.2 ? H * .3 : H * .38;
      for (let i = 0; i < shown; i++) {
        const [op, cl, hi, lo] = g.walk[i], up = cl >= op, col = up ? '#26e07f' : PK, x = x0 + i * cw;
        const yo = top + hh - op * hh, yc = top + hh - cl * hh;
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, cw * .12); ctx.beginPath(); ctx.moveTo(x + cw * .4, top + hh - hi * hh); ctx.lineTo(x + cw * .4, top + hh - lo * hh); ctx.stroke();
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = i === shown - 1 ? m * .03 : 0; ctx.fillRect(x + cw * .12, Math.min(yo, yc), cw * .56, Math.max(2, Math.abs(yc - yo)));
      }
      ctx.shadowBlur = 0;
      const px = fit(ctx, sym, 900, W * .78, m * .17); glitchText(ctx, sym, W / 2, top - px * .55, px * (1 + .04 * env), px * .035, false, t);
    } else if (look === 'hearts') {
      ctx.fillStyle = PK;
      for (const h of g.hearts) {
        const life = (t * (.12 + h[2] * .1) + h[0]) % 1, s = m * (.05 + h[3] * .09), x = W * (.12 + .76 * h[1]) + Math.sin(t * 2 + h[0] * 9) * m * .03, y = H * (1.05 - life * 1.15);
        ctx.globalAlpha = Math.sin(life * Math.PI) * .9; ctx.shadowColor = PK; ctx.shadowBlur = m * .04; heart(ctx, x, y, s);
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      const px = fit(ctx, sym, 900, W * .82, m * .22); glitchText(ctx, sym, W / 2, cy, px * (1 + .07 * env), px * .04, (t % 2.6) < .13, t);
    } else if (look === 'zoom') {
      for (let i = 0; i < 4; i++) {
        const k = ((t / P + i) % 4) / 4; ctx.strokeStyle = (i % 2 ? CY : PK); ctx.globalAlpha = (1 - k) * .55; ctx.lineWidth = m * .012 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(W / 2, cy, m * (.1 + k * .7), 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const z = 1 + .55 * Math.pow(1 - ((t % (P * 2)) / (P * 2)), 3), px = fit(ctx, sym, 900, W * .8 / z, m * .22 / 1);
      ctx.save(); ctx.translate(W / 2, cy); ctx.scale(z, z); ctx.translate(-W / 2, -cy);
      ctx.globalAlpha = .25; glitchText(ctx, sym, W / 2, cy + px * .06, px, px * .09, false, t); ctx.globalAlpha = 1;
      glitchText(ctx, sym, W / 2, cy, px, px * .04, false, t); ctx.restore();
    } else {
      const px = fit(ctx, sym, 900, W * .84, m * .24), jit = (Math.floor(t * 12) % 7 === 0) ? 1.8 : 1;
      glitchText(ctx, sym, W / 2, cy, px * (1 + .06 * env), px * .045 * jit, (t % 2.3) < .14, t);
    }
    ctx.fillStyle = '#fff';
    for (const s of g.sparks) { const tw = .5 + .5 * Math.sin(t * (2 + s[2] * 3) + s[3] * 9); ctx.globalAlpha = tw * .8; ctx.beginPath(); ctx.arc(W * s[0], H * s[1], m * (.003 + .005 * s[2]), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (o.caption && H > W * 1.2) {
      const fs = Math.round(W * .05); ctx.font = `600 ${fs}px PS, Poppins, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = wrap(ctx, o.caption, W * .74), lh = fs * 1.28, bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + fs * 1.1, bh = lines.length * lh + fs * .7, by = H * .66;
      ctx.fillStyle = 'rgba(0,0,0,.72)'; const bx = W / 2 - bw / 2; const r = fs * .35;
      ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, r); ctx.arcTo(bx + bw, by + bh, bx, by + bh, r); ctx.arcTo(bx, by + bh, bx, by, r); ctx.arcTo(bx, by, bx + bw, by, r); ctx.fill();
      ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, W / 2, by + fs * .35 + lh * (i + .5)));
    }
    if (o.mark) {
      const fs = Math.round(W * .05); ctx.font = `900 ${fs}px PB, Poppins, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = CY; ctx.fillText('ticktok', W * .06 - 2, H * .05 - 2); ctx.fillStyle = PK; ctx.fillText('ticktok', W * .06 + 2, H * .05 + 2); ctx.globalCompositeOperation = 'source-over';
      ctx.font = `500 ${Math.round(fs * .52)}px PM, Poppins, sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('every ticker gets a tok', W * .06, H * .05 + fs * 1.15);
    }
    if (o.state === 'dead' || o.state === 'asleep') { ctx.fillStyle = o.state === 'dead' ? 'rgba(10,10,10,.62)' : 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H); }
  }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(cv) { const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(10, Math.round((cv.clientWidth || 270) * dpr)), h = Math.max(10, Math.round((cv.clientHeight || 480) * dpr)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
  // a playing tok on a canvas; frame() draws a single still
  function play(cv, o) {
    let raf = 0, live = true, opt = Object.assign({}, o); const t0 = performance.now() - (seeder(String(opt.seed || '')) % 5000);
    const ctx = cv.getContext('2d');
    function frame(now) { size(cv); draw(ctx, cv.width, cv.height, ((now || performance.now()) - t0) / 1000, opt); }
    function loop(now) { if (!live) return; if (!document.hidden) frame(now); raf = requestAnimationFrame(loop); }
    if (calm) frame(); else raf = requestAnimationFrame(loop);
    return { stop() { live = false; cancelAnimationFrame(raf); frame(); }, set(p) { Object.assign(opt, p); if (calm) frame(); }, frame };
  }
  function still(cv, o, t) { size(cv); draw(cv.getContext('2d'), cv.width, cv.height, t == null ? 1.1 : t, o); }
  // the token's picture: a square still of its tok
  function picture(o, px) { const cv = document.createElement('canvas'); cv.width = cv.height = px || 768; draw(cv.getContext('2d'), cv.width, cv.height, 1.1, Object.assign({}, o, { caption: null, mark: false })); return cv.toDataURL('image/jpeg', .92); }
  // a real video file of the tok, 720x1280, `seconds` long
  function record(o, seconds, onProgress) {
    return new Promise((resolve, reject) => {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return reject(new Error('This browser can’t record video. Try Chrome or Safari.'));
      const cv = document.createElement('canvas'); cv.width = 720; cv.height = 1280; const ctx = cv.getContext('2d');
      const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mime = types.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
      if (!mime) return reject(new Error('This browser can’t record video. Try Chrome or Safari.'));
      const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 }), chunks = [], opt = Object.assign({}, o, { mark: true });
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = e => reject(e.error || new Error('Recording failed.'));
      rec.onstop = () => resolve({ blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' });
      draw(ctx, 720, 1280, 0, opt); rec.start(250);
      const t0 = performance.now(), dur = (seconds || 8) * 1000;
      const iv = setInterval(() => { const el = performance.now() - t0; draw(ctx, 720, 1280, el / 1000, opt); onProgress && onProgress(Math.min(1, el / dur)); if (el >= dur) { clearInterval(iv); setTimeout(() => rec.stop(), 120); } }, 1000 / 30);
    });
  }
  const ready = () => (document.fonts ? Promise.all(['900 40px PB', '600 20px PS', '500 20px PM'].map(f => document.fonts.load(f).catch(() => null))) : Promise.resolve());
  const newSeed = () => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (const b of crypto.getRandomValues(new Uint8Array(10))) s += a[b % a.length]; return s; };
  window.Tok = { draw, play, still, picture, record, ready, genes, LOOKS, newSeed };
})();
