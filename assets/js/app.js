// ticktok: one scrolling page. Hero, For You, launch, new pump.fun coins, viewers, how it works.
(function () {
  'use strict';
  const C = window.Core, $ = C.$, $$ = C.$$, esc = C.esc;
  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3.1 1.7-2 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M14 4v4C7 8.5 3.5 12.6 3 19c2.2-3.3 5.4-4.9 11-5v4l7-7z"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16 6.3 10.3l1.4-1.4 3.3 3.3zM4 18h16v2H4z"/></svg>',
  };
  const LABEL = { alive: 'live', asleep: 'quiet', dead: 'dead', ascended: 'graduated', unborn: 'not live yet' };
  const S = { board: null, sort: 'hot', liked: C.store.get('tt-liked') || {}, look: 'glitch', seed: Tok.newSeed(), kid: new Map(), players: new Map() };
  const fmt = n => (n == null ? '0' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
  const pushedNow = k => k.pushed_at && Date.now() - new Date(k.pushed_at) < 36e5;
  const optOf = k => ({ seed: k.seed, look: k.look, symbol: k.symbol, caption: k.caption || k.line, state: k.state });
  const usd = k => (k.mcap_sol != null && S.board && S.board.solUsd ? C.usd(k.mcap_sol * S.board.solUsd) : '—');
  const coins = () => (S.board && S.board.coins) || [];
  const coinOf = m => coins().find(k => k.mint === m);
  const symOf = b => String(b.symbol || 'TICKER').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase() || 'TICKER';
  const anyOpt = b => { const s = symOf(b); return { seed: b.mint, look: Tok.LOOKS[(b.mint || '').charCodeAt(5) % 4 || 0], symbol: s, caption: `pov: $${s} just got a tok` }; };
  const seen = (el, on, off, th) => { if (!('IntersectionObserver' in window)) { on(); return; } new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? on() : off && off())), { threshold: th || 0 }).observe(el); };

  // ---------- nav: the section you're in lights up ----------
  if ('IntersectionObserver' in window) {
    const links = $$('.tnav a');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  // ---------- hero: three phones ----------
  const INTRO = { seed: 'ticktok', look: 'glitch', symbol: 'TICKTOK', caption: 'every ticker gets a tok.' };
  const HERO = [INTRO, { seed: 'ticktok-2', look: 'chart', symbol: 'TICKTOK', caption: 'pov: your coin got a tok' }, { seed: 'ticktok-3', look: 'hearts', symbol: 'TICKTOK', caption: 'the algorithm picked you.' }];
  const hp = []; let heroOn = false;
  function heroPlay() { if (heroOn) return; heroOn = true; Tok.ready().then(() => ['#h0', '#h1', '#h2'].forEach((id, i) => { if (!hp[i]) hp[i] = Tok.play($(id), HERO[i]); })); }
  function heroStop() { heroOn = false; hp.forEach((p, i) => { if (p) { p.stop(); hp[i] = null; } }); }
  seen($('.hero'), heroPlay, heroStop);
  let swapAt = 0, side = 0;
  function heroBirth(b) {
    if (Date.now() - swapAt < 6000) return; swapAt = Date.now();
    const i = 1 + side; side = 1 - side; const o = anyOpt(b);
    HERO[i] = o; if (hp[i]) hp[i].set(o);
    const ph = $('#h' + i).parentNode; ph.classList.remove('flip'); void ph.offsetWidth; ph.classList.add('flip');
    $('#h' + i + 'l').textContent = '$' + o.symbol + ' · just born on pump.fun';
    ph.onclick = () => tokAny(b);
  }
  $('#h1l').textContent = ''; $('#h2l').textContent = '';

  // ---------- For You: real coins only, a row you swipe ----------
  function sorted(ks) {
    const a = ks.slice(), t = k => new Date(k.born_at || 0).getTime();
    if (S.sort === 'new') return a.sort((x, y) => t(y) - t(x));
    if (S.sort === 'likes') return a.sort((x, y) => (y.likes || 0) - (x.likes || 0) || t(y) - t(x));
    const s = k => (pushedNow(k) ? 1e9 : 0) + (k.likes || 0) * 3 + (k.state === 'alive' || k.state === 'ascended' ? 20 : 0) - (k.state === 'dead' ? 60 : 0);
    return a.sort((x, y) => s(y) - s(x) || t(y) - t(x));
  }
  function cardHtml(k, i) {
    return `<article class="tk" data-m="${k.mint}" style="--i:${Math.min(i, 8)}"><div class="tv"><canvas></canvas>
      <div class="badges">${pushedNow(k) ? '<span class="pushed">pushed</span>' : ''}<span class="stp ${k.state}"><i></i>${LABEL[k.state] || k.state}</span></div>
      <div class="tinfo"><b>@${esc(k.name)}</b><span>${esc(k.caption || k.line || '')}</span></div></div>
      <div class="tmeta"><span class="sym">$${esc(k.symbol)}</span><button class="lk ${S.liked[k.mint] ? 'on' : ''}" type="button" aria-label="Like">${ICON.heart}<span class="n">${fmt(k.likes)}</span></button></div></article>`;
  }
  let noneP = null;
  function feed() {
    S.players.forEach(p => p.stop()); S.players.clear(); if (noneP) { noneP.stop(); noneP = null; }
    const ks = sorted(coins()), el = $('#feed'), wrap = el.parentNode;
    el.classList.toggle('empty', !ks.length); wrap.classList.toggle('none-w', !ks.length);
    if (!ks.length) {
      el.innerHTML = `<div class="none"><div class="nph"><canvas id="noneCv"></canvas></div><div><h3>No coins yet.</h3><p>For You fills up as coins launch here. The first one has the whole feed to itself.</p><a class="btn acc" href="#launch">Launch the first coin</a></div></div>`;
      Tok.ready().then(() => { noneP = Tok.play($('#noneCv'), { seed: 'first', look: 'zoom', symbol: 'YOURS', caption: 'this spot is open.' }); });
      return;
    }
    el.innerHTML = ks.map(cardHtml).join('');
    $$('.tk', el).forEach(it => {
      const m = it.dataset.m, k = coinOf(m);
      Tok.still(it.querySelector('canvas'), optOf(k));
      it.addEventListener('click', e => { if (e.target.closest('.lk')) return; openCoin(m); });
      const lk = it.querySelector('.lk'); lk.onclick = () => doLike(m, lk);
      cio && cio.observe(it);
    });
    Live.watch(ks.filter(k => k.state !== 'ascended').map(k => k.mint));
    arrows();
  }
  const cio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    const it = e.target, m = it.dataset.m;
    if (e.isIntersecting && e.intersectionRatio > .5) { if (!S.players.has(it) && S.players.size < 6) { const k = coinOf(m); if (k) S.players.set(it, Tok.play(it.querySelector('canvas'), optOf(k))); } }
    else { const p = S.players.get(it); if (p) { p.stop(); S.players.delete(it); } }
  }), { threshold: [0, .5, 1] }) : null;
  $$('#sorts button').forEach(b => b.onclick = () => { S.sort = b.dataset.s; $$('#sorts button').forEach(x => x.classList.toggle('on', x === b)); feed(); $('#feed').scrollTo({ left: 0 }); });
  function arrows() { const r = $('#feed'), w = r.parentNode; w.classList.toggle('st', r.scrollLeft < 8); w.classList.toggle('en', r.scrollLeft + r.clientWidth > r.scrollWidth - 8); }
  $('#feed').addEventListener('scroll', arrows, { passive: true }); addEventListener('resize', arrows);
  $('#aL').onclick = () => $('#feed').scrollBy({ left: -$('#feed').clientWidth * .8, behavior: 'smooth' });
  $('#aR').onclick = () => $('#feed').scrollBy({ left: $('#feed').clientWidth * .8, behavior: 'smooth' });

  function pop(btn) { if (!btn) return; btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  async function doLike(m, btn) {
    pop(btn); if (S.liked[m]) return;
    S.liked[m] = 1; C.store.set('tt-liked', S.liked); $$(`[data-m="${m}"] .lk, [data-like="${m}"]`).forEach(b => b.classList.add('on'));
    const r = await C.post('/api/like', { mint: m }).catch(() => null);
    if (r && r.ok) { const k = coinOf(m); if (k) k.likes = r.likes; $$(`[data-m="${m}"] .lk .n, [data-like="${m}"] .n`).forEach(n => n.textContent = fmt(r.likes)); }
    else if (r && !r.ok) C.toast(r.error);
  }
  async function share(k) {
    const url = location.origin + '/c/' + k.mint, text = `$${k.symbol} got a tok`;
    if (navigator.share) { try { await navigator.share({ title: 'ticktok', text, url }); return; } catch {} }
    C.copy(url);
  }
  async function save(o, btn) {
    const lab = btn && (btn.querySelector('.lab') || btn), was = lab && lab.textContent;
    try {
      await Tok.ready(); if (btn) btn.disabled = true;
      const r = await Tok.record(o, 8, p => { if (lab) lab.textContent = Math.round(p * 100) + '%'; });
      const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = `${String(o.symbol || 'tok').toLowerCase()}-tok.${r.ext}`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); C.toast('Your tok is downloading.');
    } catch (e) { C.toast(C.human(e)); }
    finally { if (btn) btn.disabled = false; if (lab) lab.textContent = was; }
  }
  function burst(v, x, y) { const b = document.createElement('div'); b.className = 'burst'; b.style.left = x + 'px'; b.style.top = y + 'px'; b.innerHTML = ICON.heart; v.appendChild(b); setTimeout(() => b.remove(), 950); }

  // ---------- one coin: its tok playing, plus everything about it ----------
  async function loadDetail(m) {
    const c = S.kid.get(m); if (c && Date.now() - c.at < 30000) return c.j;
    const j = await C.get('/api/kid?mint=' + m).catch(() => null);
    if (j && j.ok) S.kid.set(m, { at: Date.now(), j }); return j;
  }
  const kOf = m => { const c = S.kid.get(m); return (c && c.j && c.j.coin) || coinOf(m); };
  function detailHtml(m) {
    const k = kOf(m); if (!k) return '<p class="mut">Loading…</p>';
    const c = S.kid.get(m), j = c && c.j, gods = k.gods || [], st = k.status && k.status !== 'live' ? 'unborn' : k.state, comments = (j && j.comments) || [];
    return `<div class="dh"><b>${esc(k.name)}</b><span>$${esc(k.symbol)} · ${LABEL[st] || st}</span></div>
      <dl class="dstat"><div><dt>mcap</dt><dd>${usd(k)}</dd></div><div><dt>likes</dt><dd>${fmt(k.likes)}</dd></div><div><dt>to pay out</dt><dd>${C.sol(k.vault_lamports || 0)}</dd></div></dl>
      <div class="mut sm2">first viewers</div><div class="vw">${Array.from({ length: 8 }, (_, i) => `<i class="${i < gods.length ? 'on' : ''}" title="${gods[i] ? C.short(gods[i].wallet) : ''}"></i>`).join('')}</div>
      <div class="dbtn"><a class="btn sm acc" href="https://pump.fun/coin/${k.mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn sm" href="https://dexscreener.com/solana/${k.mint}" target="_blank" rel="noopener">chart ↗</a><button class="btn sm" type="button" data-copy="${k.mint}">copy CA</button><button class="btn sm" type="button" data-pay="${k.mint}" ${k.status === 'live' ? '' : 'disabled'}>pay out</button></div>
      <div class="cmts">${comments.length ? comments.map(x => `<div class="cm"><q>${esc(x.q || '')}</q><p>${esc(x.text)}</p></div>`).join('') : '<p class="mut sm2">No replies yet. Comment and it answers.</p>'}</div>
      <div class="ask"><input class="in" maxlength="200" placeholder="add a comment…" data-ask="${k.mint}"><button class="btn sm acc" type="button" data-send="${k.mint}">send</button></div>`;
  }
  function wire(root, m) {
    $$('[data-copy]', root).forEach(b => b.onclick = () => C.copy(b.dataset.copy));
    $$('[data-pay]', root).forEach(b => b.onclick = async () => { b.disabled = true; try { const r = await Cross.feed(m); if (r) C.toast('Paid out to everyone in its split.'); S.kid.delete(m); } catch (e) { C.toast(C.human(e)); } b.disabled = false; });
    const inp = root.querySelector('[data-ask]'), send = root.querySelector('[data-send]');
    const go = async () => {
      const q = inp.value.trim(); if (q.length < 2) return; send.disabled = true;
      const r = await C.post('/api/talk', { mint: m, ask: q }).catch(() => null); send.disabled = false;
      if (!r || !r.ok) { C.toast((r && r.error) || 'No reply this time.'); return; }
      const c = S.kid.get(m); if (c && c.j) (c.j.comments = c.j.comments || []).unshift({ q, text: r.text });
      root.innerHTML = detailHtml(m); wire(root, m);
    };
    if (send) { send.onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); }
  }
  let sp = null;
  async function openCoin(m) {
    const k0 = coinOf(m);
    C.sheet(k0 ? '$' + k0.symbol : 'coin', `<div class="cs"><div class="csv"><div class="csp"><canvas id="csCv"></canvas></div><div class="csr">
      <button class="rb" type="button" data-like="${m}" aria-label="Like"><span class="ic">${ICON.heart}</span><span class="n">${fmt(k0 && k0.likes)}</span></button>
      <button class="rb" type="button" id="csShare" aria-label="Share"><span class="ic">${ICON.share}</span><span class="lab">share</span></button>
      <button class="rb" type="button" id="csSave" aria-label="Download the tok"><span class="ic">${ICON.dl}</span><span class="lab">save</span></button></div></div><div id="sd"><p class="mut">Loading…</p></div></div>`);
    if (location.pathname !== '/c/' + m) history.replaceState(null, '', '/c/' + m + location.hash);
    C.closeSheet.after = () => { if (sp) { sp.stop(); sp = null; } if (location.pathname.startsWith('/c/')) history.replaceState(null, '', '/' + location.hash); };
    await loadDetail(m);
    const k = kOf(m), sd = $('#sd'); if (!sd) return;
    if (!k) { sd.innerHTML = '<p class="mut">This coin isn’t on ticktok.</p>'; return; }
    $('#sheetTitle').textContent = '$' + k.symbol;
    const o = optOf(k); await Tok.ready(); if (!$('#csCv')) return;
    if (sp) sp.stop(); sp = Tok.play($('#csCv'), o);
    const lk = $(`[data-like="${m}"]`); if (S.liked[m]) lk.classList.add('on'); lk.querySelector('.n').textContent = fmt(k.likes); lk.onclick = () => doLike(m, lk);
    $('#csShare').onclick = () => share(k); $('#csSave').onclick = e => save(o, e.currentTarget);
    const v = $('.csp'); v.addEventListener('dblclick', e => { const r = v.getBoundingClientRect(); burst(v, e.clientX - r.left, e.clientY - r.top); doLike(m, lk); });
    sd.innerHTML = detailHtml(m); wire(sd, m);
  }

  // ---------- launch ----------
  let pv = null;
  const pvOpt = () => ({ seed: S.seed, look: S.look, symbol: ($('#tk').value.trim() || 'TICKER').toUpperCase(), caption: $('#cap').value.trim() || 'pov: your coin just got a tok' });
  function syncPv() { const o = pvOpt(); if (pv) pv.set(o); $('#pvName').textContent = '@' + ($('#nm').value.trim() || 'yourcoin'); $('#pvSym').textContent = '$' + o.symbol; }
  seen($('.lprev'), () => Tok.ready().then(() => { if (!pv) pv = Tok.play($('#pv'), pvOpt()); syncPv(); }), () => { if (pv) { pv.stop(); pv = null; } });
  ['line', 'nm', 'tk', 'cap'].forEach(id => $('#' + id).addEventListener('input', syncPv));
  $('#tk').addEventListener('input', e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v !== e.target.value) e.target.value = v; });
  $$('#looks [data-l]').forEach(b => b.onclick = () => { S.look = b.dataset.l; $$('#looks [data-l]').forEach(x => x.classList.toggle('on', x === b)); syncPv(); });
  $('#reroll').onclick = () => { S.seed = Tok.newSeed(); syncPv(); };
  $('#dlBtn').onclick = () => save(pvOpt(), $('#dlBtn'));
  const buy = Cross.buyBox($('#buyBox'));
  function splitBox(gods) {
    const j = S.board || {}, pool = (j.lives && j.lives.alive) || 0, n = gods ? gods.length : Math.min(8, pool), has = n > 0, you = has ? 70 : 85;
    $('#split').innerHTML = `<div class="bars"><i style="width:${you}%"></i><i style="width:${has ? 15 : 0}%"></i><i style="width:15%"></i></div>
      <dl><div><dt>you</dt><dd>${you}%</dd></div><div><dt>first viewers</dt><dd>${has ? 15 : 0}%</dd><div class="vw">${Array.from({ length: 8 }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div></div><div><dt>house</dt><dd>15%</dd></div></dl>
      <p>${gods ? (gods.length ? 'Drawn just now: ' + gods.map(g => `${C.short(g.wallet)} (${g.stage})`).join(', ') + '.' : 'No viewers to draw yet, so their 15% is yours.') : has ? `${pool} viewer${pool === 1 ? '' : 's'} in the draw. 8 are drawn the moment you launch.` : 'No viewers yet, so the first viewers’ 15% stays with you.'}</p>`;
  }
  function goLabel() { const b = $('#goBtn'), j = S.board; if (j && !j.open) { b.disabled = true; b.textContent = 'Launching opens soon'; return; } b.disabled = false; b.textContent = C.S.me ? 'Launch it on pump.fun' : 'Connect wallet to launch'; }
  const status = (t, c) => { const s = $('#goStatus'); s.className = 'status' + (c ? ' ' + c : ''); s.innerHTML = t || ''; };
  $('#goBtn').onclick = async () => {
    if (!C.S.me) { await C.connect(); return; }
    const line = $('#line').value.trim(), name = $('#nm').value.trim(), symbol = $('#tk').value.trim().toUpperCase();
    if (line.length < 8) return status('Write what your coin is first: one line.', 'err');
    if (!name) return status('Give it a name.', 'err');
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return status('The ticker is 1–10 letters or numbers.', 'err');
    if (buy.over()) return status('Up to 5 SOL in the first buy.', 'err');
    const btn = $('#goBtn'), prog = $('#goProg'); btn.disabled = true; status(''); $('#goRes').hidden = true;
    try {
      await Tok.ready();
      const r = await Cross.run({ name, symbol, line, look: S.look, seed: S.seed, caption: $('#cap').value.trim(), x: $('#xh').value.trim(), devBuy: buy.lamports(), onStep: i => Cross.steps(prog, i), onDraw: m => splitBox(m.gods) });
      Cross.steps(prog, Cross.STEPS.length, true);
      const res = $('#goRes'); res.hidden = false;
      res.innerHTML = `<div class="res"><b>$${esc(symbol)} is live with its first tok.</b>${r.buyNote ? ' ' + esc(r.buyNote) : ''}<br><a href="/c/${r.mint}">Open it →</a> · <a href="https://pump.fun/coin/${r.mint}" target="_blank" rel="noopener">pump.fun ↗</a></div>`;
      status('Done.', 'ok'); S.seed = Tok.newSeed(); syncPv(); load();
    } catch (e) { status(esc(C.human(e)) + (e.mint ? ` <a href="/c/${e.mint}">Open it</a>` : ''), 'err'); }
    finally { btn.disabled = false; goLabel(); }
  };

  // ---------- viewers ----------
  function ladder() {
    const R = [['new', '1x', 'from day 0'], ['regular', '1.5x', 'from day 3'], ['fan', '2x', 'from day 10'], ['day one', '3x', 'from day 30']];
    $('#ladder').innerHTML = R.map((r, i) => `<div class="rung"><canvas data-i="${i}"></canvas><b>${r[0]}</b><div class="x">${r[1]}</div><small>${r[2]}</small></div>`).join('');
    C.reveal($('#viewers'));
    Tok.ready().then(() => $$('#ladder canvas').forEach(c => Tok.still(c, { seed: 'stage-' + c.dataset.i, look: 'glitch', symbol: ['NEW', 'REG', 'FAN', 'DAY1'][c.dataset.i] })));
  }
  const TOK = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'], CB = 'ComputeBudget111111111111111111111111111111';
  async function me() {
    const el = $('#me'), j = S.board || {};
    if (!C.S.me) { el.innerHTML = `<h3>Your viewer</h3><div class="big">not watching</div><p class="mut">Connect the wallet that holds your $TICKTOK.</p><button class="btn acc" id="meC" type="button">Connect wallet</button>`; $('#meC').onclick = () => C.connect(); return; }
    if (!j.life) { el.innerHTML = `<h3>Your viewer</h3><div class="big">soon</div><p class="mut">Joining opens when $TICKTOK launches.</p>`; return; }
    el.innerHTML = '<h3>Your viewer</h3><p class="mut">Reading…</p>';
    const r = await C.get('/api/born?w=' + C.S.me).catch(() => null);
    if (!r || !r.ok) { el.innerHTML = `<h3>Your viewer</h3><p class="mut">${esc((r && r.error) || 'Didn’t load. Try again.')}</p>`; return; }
    const l = r.life, min = r.minBurn || 10000, form = label => `<div class="burn"><input class="in" id="bAmt" inputmode="numeric" value="${min}"><button class="btn acc" id="bBtn" type="button">${label}</button></div><p class="mut sm2">You hold ${r.balance == null ? '—' : Number(r.balance).toLocaleString('en-US')} $TICKTOK. Joining burns at least ${min.toLocaleString('en-US')}.</p><p class="status" id="bSt"></p>`;
    if (!l) el.innerHTML = `<h3>Your viewer</h3><div class="big">not watching</div>${form('Burn and start watching')}`;
    else if (l.state === 'dead') el.innerHTML = `<h3>Your viewer</h3><div class="big">left</div><p class="mut">This wallet sold below what it held after joining. Coins it was first viewer of still pay it.</p>${form('Watch again')}`;
    else el.innerHTML = `<h3>Your viewer</h3><div class="big">${esc(l.stage)}</div><dl><div><dt>watching</dt><dd>${Math.floor(l.days || 0)} days</dd></div><div><dt>tickets</dt><dd>${l.mult}x</dd></div><div><dt>next</dt><dd>${l.next ? l.next.stage + ' in ' + Math.ceil(l.next.in) + 'd' : 'top stage'}</dd></div><div><dt>first viewer of</dt><dd>${(l.godchildren || []).length}</dd></div></dl>
      <div class="kids">${(l.godchildren || []).slice(0, 10).map(c => `<a href="/c/${c.mint}"><span>$${esc(c.symbol)}</span><span>${C.sol(c.vault_lamports || 0)} waiting</span></a>`).join('')}</div>${form('Burn more')}`;
    const b = $('#bBtn'); if (b) b.onclick = () => burn(r);
  }
  async function burn(info) {
    const st = (t, c) => { const s = $('#bSt'); if (s) { s.className = 'status' + (c ? ' ' + c : ''); s.textContent = t; } };
    const amt = Math.floor(Number(String($('#bAmt').value).replace(/[, _]/g, '')));
    if (!(amt >= (info.minBurn || 10000))) return st(`Joining burns at least ${(info.minBurn || 10000).toLocaleString('en-US')} $TICKTOK.`, 'err');
    const btn = $('#bBtn'); btn.disabled = true;
    try {
      st('Building the burn…');
      const r = await C.post('/api/born', { wallet: C.S.me, amount: amt }); if (!r.ok) throw new Error(r.error);
      const w3 = await C.loadWeb3(), tx = w3.VersionedTransaction.deserialize(Uint8Array.from(atob(r.tx), c => c.charCodeAt(0)));
      const msg = tx.message, keys = msg.staticAccountKeys.map(k => k.toBase58()); let ok = false;
      for (const ix of msg.compiledInstructions) {
        const prog = keys[ix.programIdIndex], d = ix.data; if (prog === CB) continue;
        if (!TOK.includes(prog) || d[0] !== 15 || ok) throw new Error('The burn isn’t what was shown, so nothing was signed.');
        let v = 0n; for (let i = 8; i >= 1; i--) v = v * 256n + BigInt(d[i]);
        const ks = ix.accountKeyIndexes.map(i => keys[i]);
        if (v !== BigInt(r.amount) || ks[1] !== r.mint || ks[2] !== C.S.me) throw new Error('The burn isn’t what was shown, so nothing was signed.');
        ok = true;
      }
      if (!ok) throw new Error('The burn is missing, so nothing was signed.');
      st('Waiting for your wallet…'); const [signed] = await C.signAll([tx]); const sig = await C.send(signed); st('Burning…'); await C.confirm(sig);
      st('Reading it from Solana…'); let v = null;
      for (let i = 0; i < 6; i++) { v = await C.post('/api/born', { wallet: C.S.me, sig }).catch(() => null); if (v && v.ok) break; await new Promise(z => setTimeout(z, 2000)); }
      if (!v || !v.ok) throw new Error((v && v.error) || 'The burn landed; it shows after the next check.');
      C.toast('You’re watching.'); load();
    } catch (e) { st(C.human(e), 'err'); btn.disabled = false; }
  }
  function vtop() {
    const e = (S.board && S.board.elders) || [];
    $('#vtop').innerHTML = `<h3>Longest watching</h3>` + (e.length ? `<table class="tbl"><thead><tr><th>#</th><th>wallet</th><th>stage</th><th>first viewer of</th></tr></thead><tbody>${e.map((x, i) => `<tr><td>${i + 1}</td><td>${C.short(x.wallet)}</td><td>${esc(x.stage)}</td><td>${x.kids}</td></tr>`).join('')}</tbody></table>` : `<p class="mut">${S.board && S.board.life ? 'Nobody is watching yet. The first one stays on top for a while.' : 'Opens when $TICKTOK launches.'}</p>`);
  }

  // ---------- live from pump.fun: the tape, the hero phones, the new-coins row ----------
  let born = 0, hold = false;
  const tape = $('#tape'), fresh = $('#births');
  fresh.addEventListener('mouseenter', () => { hold = true; }); fresh.addEventListener('mouseleave', () => { hold = false; });
  Live.on('status', up => {
    ['#tDot', '#kDot'].forEach(id => $(id).classList.toggle('on', up));
    if (!up && !born) { tape.innerHTML = '<span class="off">pump.fun’s live feed is offline right now. It reconnects on its own.</span>'; fresh.innerHTML = '<p class="mut">pump.fun’s live feed is offline right now. New coins show here when it’s back.</p>'; }
  });
  Live.on('birth', b => {
    born++; $('#bornN').textContent = born.toLocaleString('en-US');
    if (born === 1) { tape.innerHTML = ''; fresh.innerHTML = ''; }
    const s = document.createElement('span'); s.innerHTML = `<b>$${esc(symOf(b))}</b> ${esc(b.name || '')}`; s.onclick = () => tokAny(b); tape.appendChild(s);
    while (tape.children.length > 40) { tx += tape.firstChild.offsetWidth + 28; tape.firstChild.remove(); }
    heroBirth(b);
    if (hold) return;
    const d = document.createElement('button'); d.type = 'button'; d.className = 'fc';
    d.innerHTML = `<canvas></canvas><div class="fi"><b>${esc(b.name || symOf(b))}</b><span>$${esc(symOf(b))}</span><em>get its tok →</em></div>`;
    d.onclick = () => tokAny(b); fresh.prepend(d); Tok.still(d.querySelector('canvas'), anyOpt(b));
    while (fresh.children.length > 6) fresh.lastChild.remove();
  });
  Live.on('trade', t => {
    const it = $(`#feed .tk[data-m="${t.mint}"]`); if (!it) return;
    const v = it.querySelector('.tv'), b = document.createElement('div'); b.className = 'tb ' + t.side; b.textContent = t.side === 'buy' ? 'buy ↑' : 'sell ↓'; v.appendChild(b); setTimeout(() => b.remove(), 2300);
    const s = it.querySelector('.stp'); if (s && !s.classList.contains('ascended')) { s.className = 'stp alive'; s.innerHTML = '<i></i>live'; }
  });
  // the tape moves on its own clock; new coins join at the end, the oldest wrap round
  let tx = 0, last = 0;
  (function roll(now) {
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    const room = tape.parentNode.clientWidth;
    if (!document.hidden && born && tape.scrollWidth > room && !C.calm) {
      tx -= dt * 0.045; const f = tape.firstElementChild;
      if (f && tx + f.offsetWidth + 28 < 0) { tx += f.offsetWidth + 28; tape.appendChild(f); }
      tape.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
    }
    requestAnimationFrame(roll);
  })(0);
  Live.start();

  // any new coin on pump.fun gets a tok too: watch it and download it (it isn't launched here)
  let anyP = null;
  function tokAny(b) {
    const o = anyOpt(b), sym = o.symbol;
    C.sheet('$' + sym + ' · its tok', `<div class="anyw"><div class="phone sm"><canvas id="anyCv"></canvas></div><p class="mut sm2 center">A tok for ${esc(b.name || sym)}, just born on pump.fun. Download it and post it anywhere.</p><div class="dbtn"><button class="btn acc" id="anyDl" type="button">Download</button><a class="btn" href="https://pump.fun/coin/${esc(b.mint)}" target="_blank" rel="noopener">pump.fun ↗</a></div></div>`);
    Tok.ready().then(() => { if (anyP) anyP.stop(); if ($('#anyCv')) anyP = Tok.play($('#anyCv'), o); });
    $('#anyDl').onclick = e => save(o, e.currentTarget);
    C.closeSheet.after = () => { if (anyP) { anyP.stop(); anyP = null; } };
  }

  // ---------- load ----------
  function caBox() {
    const m = S.board && S.board.life, el = $('#caBox'); el.hidden = !m; if (!m) return;
    el.innerHTML = `<span>$TICKTOK</span><code>${C.short(m, 6)}</code><button type="button" id="caC">copy</button><a href="https://pump.fun/coin/${m}" target="_blank" rel="noopener">buy</a><a href="https://dexscreener.com/solana/${m}" target="_blank" rel="noopener">chart</a>`;
    $('#caC').onclick = () => C.copy(m);
  }
  let first = true;
  async function load() {
    const j = await C.get('/api/board').catch(() => null);
    S.board = j && (j.ok || j.offline) ? j : { coins: [], notes: [], elders: [], lives: { alive: 0 }, open: false };
    await Tok.ready(); feed(); splitBox(); goLabel(); caBox(); me(); vtop();
    if (first) { first = false; ladder(); const m = location.pathname.match(/^\/c\/([1-9A-HJ-NP-Za-km-z]{32,44})/); if (m) openCoin(m[1]); }
  }
  C.onWallet(() => { goLabel(); me(); });
  load();
  setInterval(() => {
    if (document.hidden) return;
    C.get('/api/board').then(j => {
      if (!j || !j.ok) return;
      const sig = b => JSON.stringify(((b && b.coins) || []).map(k => [k.mint, k.state, k.caption, k.pushed_at]));
      const changed = sig(j) !== sig(S.board); S.board = j; if (changed) feed(); vtop();
    }).catch(() => {});
  }, 60000);
})();
