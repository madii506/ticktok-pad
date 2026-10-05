// ticktok: the For You feed, launching, viewers, and every coin's details, in one page.
(function () {
  'use strict';
  const C = window.Core, $ = C.$, $$ = C.$$, esc = C.esc;
  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3.1 1.7-2 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    cmt: '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2.5 6.6 2.5 11c0 2.4 1.2 4.5 3.1 6l-.8 3.6 3.9-2c1 .3 2.1.4 3.3.4 5.5 0 9.5-3.6 9.5-8s-4-8-9.5-8z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M14 4v4C7 8.5 3.5 12.6 3 19c2.2-3.3 5.4-4.9 11-5v4l7-7z"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16 6.3 10.3l1.4-1.4 3.3 3.3zM4 18h16v2H4z"/></svg>',
  };
  const LABEL = { alive: 'live', asleep: 'quiet', dead: 'dead', ascended: 'graduated', unborn: 'not live yet' };
  const S = { board: null, active: null, players: new Map(), liked: C.store.get('tt-liked') || {}, look: 'glitch', seed: Tok.newSeed(), focus: null, kid: new Map() };
  const fmt = n => (n == null ? '0' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
  const pushedNow = k => k.pushed_at && Date.now() - new Date(k.pushed_at) < 36e5;
  const optOf = k => ({ seed: k.seed, look: k.look, symbol: k.symbol, caption: k.caption || k.line, state: k.state });
  const usd = k => (k.mcap_sol != null && S.board && S.board.solUsd ? C.usd(k.mcap_sol * S.board.solUsd) : '—');

  // ---------- views ----------
  function route() {
    const m = location.pathname.match(/^\/c\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (m) S.focus = m[1];
    const v = (location.hash.replace(/^#\/?/, '') || 'feed').split('/')[0];
    const view = ['launch', 'viewers', 'how'].includes(v) ? v : 'feed';
    $$('.view').forEach(x => { x.hidden = x.id !== 'v-' + view; });
    $$('.snav a, .tabbar a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
    if (view === 'feed') resume(); else pauseAll();
    if (view === 'launch') startPreview(); else stopPreview();
    if (view === 'viewers') { ladder(); me(); vtop(); }
  }
  addEventListener('hashchange', route);

  // ---------- the feed ----------
  const order = ks => ks.slice().sort((a, b) => {
    const s = k => (pushedNow(k) ? 1e9 : 0) + (k.likes || 0) * 3 + (k.state === 'alive' || k.state === 'ascended' ? 20 : 0) - (k.state === 'dead' ? 60 : 0);
    return s(b) - s(a) || new Date(b.born_at) - new Date(a.born_at);
  });
  function itemHtml(k) {
    return `<article class="it" data-m="${k.mint}"><div class="stage"><div class="vid"><canvas></canvas>
      <div class="badges">${pushedNow(k) ? '<span class="pushed">pushed by the algorithm</span>' : ''}<span class="stp ${k.state}"><i></i>${LABEL[k.state] || k.state}</span></div>
      <div class="info"><b>@${esc(k.name)}</b><div class="ln">${esc(k.caption || k.line || '')}</div><div class="snd">♪<div class="mq"><span>original sound – $${esc(k.symbol)}</span><span>original sound – $${esc(k.symbol)}</span></div></div></div></div>
      <div class="rail"><a class="ava" href="/c/${k.mint}" title="${esc(k.name)}"><canvas></canvas><i>+</i></a>
        <button class="rb like ${S.liked[k.mint] ? 'on' : ''}" type="button" aria-label="Like"><span class="ic">${ICON.heart}</span><span class="n">${fmt(k.likes)}</span></button>
        <button class="rb cmt" type="button" aria-label="Replies"><span class="ic">${ICON.cmt}</span><span>reply</span></button>
        <button class="rb shr" type="button" aria-label="Share"><span class="ic">${ICON.share}</span><span>share</span></button>
        <button class="rb dl" type="button" aria-label="Download the tok"><span class="ic">${ICON.dl}</span><span>save</span></button>
        <div class="disc"><span></span></div></div></div></article>`;
  }
  const HOWTO = [
    { seed: 'how-1', look: 'glitch', symbol: 'LAUNCH', caption: 'launch a coin. it’s born with its own tok.' },
    { seed: 'how-2', look: 'chart', symbol: 'POST', caption: 'every 6 hours it writes a new caption.' },
    { seed: 'how-3', look: 'zoom', symbol: 'PUSH', caption: 'every hour the algorithm pushes one to the top.' },
    { seed: 'how-4', look: 'hearts', symbol: 'VIEW', caption: '8 first viewers earn 15% of its fees forever.' },
  ];
  function introHtml() {
    return HOWTO.map((h, i) => `<article class="it" data-m="how-${i}"><div class="stage"><div class="vid"><canvas></canvas>
      <div class="badges"><span class="stp unborn"><i></i>how it works · ${i + 1}/4</span></div>
      <div class="info"><b>ticktok</b><div class="ln">${i === 3 ? 'No coins yet. The feed fills up with real coins as they launch.' : 'Swipe up for the next step.'}</div></div>
      ${i === 3 || i === 0 ? '<a class="btn acc cta" href="#/launch">Launch the first one</a>' : ''}</div>
      <div class="rail"><a class="ava" href="#/how"><canvas></canvas><i>?</i></a>
        <button class="rb shr" type="button"><span class="ic">${ICON.share}</span><span>share</span></button>
        <button class="rb dl" type="button"><span class="ic">${ICON.dl}</span><span>save</span></button><div class="disc"><span></span></div></div></div></article>`).join('');
  }
  const INTRO = HOWTO[0];
  const howOf = m => { const r = /^how-(\d)$/.exec(m); return r ? HOWTO[+r[1]] : null; };
  const coinOf = m => (S.board && S.board.coins || []).find(k => k.mint === m);
  function feed() {
    pauseAll(); S.players.clear();
    const ks = order((S.board && S.board.coins) || []), el = $('#feed');
    el.innerHTML = ks.length ? ks.map(itemHtml).join('') : introHtml();
    $$('.it', el).forEach(it => {
      const m = it.dataset.m, k = howOf(m) ? null : coinOf(m), o = k ? optOf(k) : (howOf(m) || INTRO);
      Tok.still(it.querySelector('.vid canvas'), o);
      Tok.still(it.querySelector('.ava canvas'), { seed: o.seed, look: 'glitch', symbol: o.symbol });
      const like = it.querySelector('.like'); if (like) like.onclick = () => doLike(m, like);
      it.querySelector('.shr').onclick = () => share(k);
      it.querySelector('.dl').onclick = e => save(o, e.currentTarget);
      const cm = it.querySelector('.cmt'); if (cm) cm.onclick = () => openDetail(m, true);
      const v = it.querySelector('.vid'); let lastTap = 0;
      const tap = (x, y) => { if (!k) return; burst(v, x, y); if (!S.liked[m]) doLike(m, like); else pop(like); };
      v.addEventListener('dblclick', e => { const r = v.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); });
      v.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 300) { const t = e.changedTouches[0], r = v.getBoundingClientRect(); tap(t.clientX - r.left, t.clientY - r.top); } lastTap = now; }, { passive: true });
    });
    io && $$('.it', el).forEach(it => io.observe(it));
    if (ks.length) Live.watch(ks.filter(k => k.state !== 'ascended').map(k => k.mint));
    if (S.focus) { const it = el.querySelector(`[data-m="${S.focus}"]`); if (it) { it.scrollIntoView(); openDetail(S.focus, false); } else loadDetail(S.focus).then(() => renderDetail(S.focus)); }
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    const it = e.target, m = it.dataset.m;
    if (e.isIntersecting && e.intersectionRatio > .6) { playItem(it); if (!howOf(m)) { S.active = m; renderDetail(m); loadDetail(m).then(() => { if (S.active === m) renderDetail(m); }); } }
    else stopItem(it);
  }), { threshold: [0, .6, 1] }) : null;
  function playItem(it) {
    if (S.players.has(it) || $('#v-feed').hidden) return;
    const m = it.dataset.m, k = coinOf(m), o = k ? optOf(k) : (howOf(m) || INTRO);
    S.players.set(it, Tok.play(it.querySelector('.vid canvas'), o));
  }
  function stopItem(it) { const p = S.players.get(it); if (p) { p.stop(); S.players.delete(it); } }
  function pauseAll() { S.players.forEach(p => p.stop()); S.players.clear(); }
  function resume() { const its = $$('#feed .it'); for (const it of its) { const r = it.getBoundingClientRect(); if (r.top > -r.height / 2 && r.top < innerHeight / 2) { playItem(it); break; } } }
  function burst(v, x, y) { const b = document.createElement('div'); b.className = 'burst'; b.style.left = x + 'px'; b.style.top = y + 'px'; b.innerHTML = ICON.heart; v.appendChild(b); setTimeout(() => b.remove(), 950); }
  function pop(btn) { if (!btn) return; btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  async function doLike(m, btn) {
    pop(btn); if (S.liked[m]) return;
    S.liked[m] = 1; C.store.set('tt-liked', S.liked); btn && btn.classList.add('on');
    const r = await C.post('/api/like', { mint: m }).catch(() => null);
    if (r && r.ok && btn) { btn.querySelector('.n').textContent = fmt(r.likes); const k = coinOf(m); if (k) k.likes = r.likes; }
    else if (r && !r.ok) C.toast(r.error);
  }
  async function share(k) {
    const url = k ? location.origin + '/c/' + k.mint : location.origin, text = k ? `$${k.symbol} got a tok` : 'every ticker gets a tok.';
    if (navigator.share) { try { await navigator.share({ title: 'ticktok', text, url }); return; } catch {} }
    C.copy(url);
  }
  async function save(o, btn) {
    const lab = btn && btn.querySelector('span:last-child'), was = lab && lab.textContent;
    try {
      await Tok.ready(); if (btn) btn.disabled = true;
      const r = await Tok.record(o, 8, p => { if (lab) lab.textContent = Math.round(p * 100) + '%'; });
      const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = `${String(o.symbol || 'tok').toLowerCase()}-tok.${r.ext}`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); C.toast('Your tok is downloading.');
    } catch (e) { C.toast(C.human(e)); }
    finally { if (btn) btn.disabled = false; if (lab) lab.textContent = was; }
  }

  // ---------- a coin's details: the right panel on wide screens, a sheet on phones ----------
  async function loadDetail(m) {
    const c = S.kid.get(m); if (c && Date.now() - c.at < 30000) return c.j;
    const j = await C.get('/api/kid?mint=' + m).catch(() => null);
    if (j && j.ok) S.kid.set(m, { at: Date.now(), j }); return j;
  }
  function detailHtml(m) {
    const c = S.kid.get(m), k = (c && c.j && c.j.coin) || coinOf(m); if (!k) return '<p class="mut">Loading…</p>';
    const j = c && c.j, gods = (k.gods || []), st = k.status && k.status !== 'live' ? 'unborn' : k.state;
    const comments = (j && j.comments) || [];
    return `<div class="dh"><canvas id="dAva"></canvas><div><b>${esc(k.name)}</b><span>$${esc(k.symbol)} · ${LABEL[st] || st}</span></div></div>
      <dl class="dstat"><div><dt>mcap</dt><dd>${usd(k)}</dd></div><div><dt>likes</dt><dd>${fmt(k.likes)}</dd></div><div><dt>to pay out</dt><dd>${C.sol(k.vault_lamports || 0)}</dd></div></dl>
      <div class="mut" style="font-size:12px">first viewers</div><div class="vw">${Array.from({ length: 8 }, (_, i) => `<i class="${i < gods.length ? 'on' : ''}" title="${gods[i] ? C.short(gods[i].wallet) : ''}"></i>`).join('')}</div>
      <div class="dbtn" style="margin-top:14px"><a class="btn sm acc" href="https://pump.fun/coin/${k.mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn sm" href="https://dexscreener.com/solana/${k.mint}" target="_blank" rel="noopener">chart ↗</a><button class="btn sm" type="button" data-copy="${k.mint}">copy CA</button><button class="btn sm" type="button" data-pay="${k.mint}" ${k.status === 'live' ? '' : 'disabled'}>pay out</button></div>
      <div class="cmts">${comments.length ? comments.map(x => `<div class="cm"><q>${esc(x.q || '')}</q><p>${esc(x.text)}</p></div>`).join('') : '<p class="mut" style="margin:0;font-size:13px">No replies yet. Comment and it answers.</p>'}</div>
      <div class="ask"><input class="in" maxlength="200" placeholder="add a comment…" data-ask="${k.mint}"><button class="btn sm acc" type="button" data-send="${k.mint}">send</button></div>`;
  }
  function wire(root, m) {
    const k = (S.kid.get(m) && S.kid.get(m).j && S.kid.get(m).j.coin) || coinOf(m);
    const av = root.querySelector('#dAva'); if (av && k) Tok.still(av, { seed: k.seed, look: 'glitch', symbol: k.symbol });
    $$('[data-copy]', root).forEach(b => b.onclick = () => C.copy(b.dataset.copy));
    $$('[data-pay]', root).forEach(b => b.onclick = async () => { b.disabled = true; try { const r = await Cross.feed(m); if (r) C.toast('Paid out to everyone in its split.'); S.kid.delete(m); } catch (e) { C.toast(C.human(e)); } b.disabled = false; });
    const inp = root.querySelector('[data-ask]'), send = root.querySelector('[data-send]');
    const go = async () => {
      const q = inp.value.trim(); if (q.length < 2) return; send.disabled = true;
      const r = await C.post('/api/talk', { mint: m, ask: q }).catch(() => null); send.disabled = false;
      if (!r || !r.ok) { C.toast((r && r.error) || 'No reply this time.'); return; }
      inp.value = ''; const c = S.kid.get(m); if (c && c.j) (c.j.comments = c.j.comments || []).unshift({ q, text: r.text }); renderDetail(m); if (root.closest && root.closest('#sheetBody')) { root.innerHTML = detailHtml(m); wire(root, m); }
    };
    if (send) { send.onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); }
  }
  function renderDetail(m) { const el = $('#detail'); if (!el || getComputedStyle($('#panel')).display === 'none') return; el.innerHTML = detailHtml(m); wire(el, m); }
  async function openDetail(m, sheet) {
    await loadDetail(m);
    if (sheet && getComputedStyle($('#panel')).display === 'none') { const k = coinOf(m); C.sheet(k ? '$' + k.symbol : 'coin', '<div id="sd"></div>'); const sd = $('#sd'); sd.innerHTML = detailHtml(m); wire(sd, m); }
    else { renderDetail(m); const a = $('#detail [data-ask]'); if (sheet && a) a.focus(); }
  }

  // ---------- launch ----------
  let pv = null;
  const pvOpt = () => ({ seed: S.seed, look: S.look, symbol: ($('#tk').value.trim() || 'TICKER').toUpperCase(), caption: $('#cap').value.trim() || 'pov: your coin just got a tok' });
  function syncPv() { const o = pvOpt(); if (pv) pv.set(o); $('#pvName').textContent = '@' + ($('#nm').value.trim() || 'yourcoin'); $('#pvSym').textContent = '$' + o.symbol; }
  function startPreview() { Tok.ready().then(() => { if (!pv && !$('#v-launch').hidden) pv = Tok.play($('#pv'), pvOpt()); syncPv(); }); }
  function stopPreview() { if (pv) { pv.stop(); pv = null; } }
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
      res.innerHTML = `<div class="res"><b>$${esc(symbol)} is live with its first tok.</b>${r.buyNote ? ' ' + esc(r.buyNote) : ''}<br><a href="/c/${r.mint}">See it on For You →</a> · <a href="https://pump.fun/coin/${r.mint}" target="_blank" rel="noopener">pump.fun ↗</a></div>`;
      status('Done.', 'ok'); S.seed = Tok.newSeed(); syncPv(); load();
    } catch (e) { status(esc(C.human(e)) + (e.mint ? ` <a href="/c/${e.mint}">Open it</a>` : ''), 'err'); }
    finally { btn.disabled = false; goLabel(); }
  };

  // ---------- viewers ----------
  function ladder() {
    const R = [['new', '1x', 'from day 0'], ['regular', '1.5x', 'from day 3'], ['fan', '2x', 'from day 10'], ['day one', '3x', 'from day 30']];
    $('#ladder').innerHTML = R.map((r, i) => `<div class="rung"><canvas data-i="${i}"></canvas><b>${r[0]}</b><div class="x">${r[1]}</div><small>${r[2]}</small></div>`).join('');
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
    const l = r.life, min = r.minBurn || 10000, form = label => `<div class="burn"><input class="in" id="bAmt" inputmode="numeric" value="${min}"><button class="btn acc" id="bBtn" type="button">${label}</button></div><p class="mut" style="font-size:13px;margin:8px 0 0">You hold ${r.balance == null ? '—' : Number(r.balance).toLocaleString('en-US')} $TICKTOK. Joining burns at least ${min.toLocaleString('en-US')}.</p><p class="status" id="bSt"></p>`;
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

  // ---------- live ----------
  let births = 0;
  Live.on('status', up => { $$('.pbox h4 .dot').forEach(d => d.classList.toggle('on', up)); if (!up && !births) $('#births').innerHTML = '<p class="mut" style="margin:0">pump.fun’s live feed is offline right now.</p>'; });
  Live.on('birth', b => {
    births++; $('#bornN').textContent = births.toLocaleString('en-US');
    const el = $('#births'); if (births === 1) el.innerHTML = '';
    const d = document.createElement('div'); d.innerHTML = `<b>${esc(b.name || 'unnamed')}</b><span>$${esc(b.symbol || '?')}</span>`; d.style.cursor = 'pointer'; d.title = 'Make its tok'; d.onclick = () => tokAny(b); el.prepend(d); while (el.children.length > 10) el.lastChild.remove();
  });
  Live.on('trade', t => {
    const it = $(`#feed .it[data-m="${t.mint}"]`); if (!it) return;
    const v = it.querySelector('.vid'), b = document.createElement('div'); b.className = 'tb ' + t.side; b.textContent = t.side === 'buy' ? 'buy ↑' : 'sell ↓'; v.appendChild(b); setTimeout(() => b.remove(), 2300);
    const s = it.querySelector('.stp'); if (s && !s.classList.contains('ascended')) { s.className = 'stp alive'; s.innerHTML = '<i></i>live'; }
  });
  Live.start();

  // any new coin on pump.fun gets a tok too: preview it and download it (it isn't launched here)
  let anyP = null;
  function tokAny(b) {
    const sym = String(b.symbol || 'TICKER').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase() || 'TICKER', o = { seed: b.mint, look: Tok.LOOKS[(b.mint || '').length % 4], symbol: sym, caption: `pov: $${sym} just got a tok` };
    C.sheet('$' + sym + ' · its tok', `<div style="display:grid;gap:12px;justify-items:center"><div class="phone" style="width:240px"><canvas id="anyCv"></canvas></div><p class="mut" style="margin:0;font-size:13px;text-align:center">A tok for ${esc(b.name || sym)}, made from its ticker. Download it and post it anywhere.</p><div class="dbtn" style="width:100%"><button class="btn acc" id="anyDl" type="button">Download</button><a class="btn" href="https://pump.fun/coin/${esc(b.mint)}" target="_blank" rel="noopener">pump.fun ↗</a></div></div>`);
    Tok.ready().then(() => { if (anyP) anyP.stop(); anyP = Tok.play($('#anyCv'), o); });
    $('#anyDl').onclick = e => save(o, e.currentTarget);
    C.closeSheet.after = () => { if (anyP) { anyP.stop(); anyP = null; } };
  }

  // ---------- load ----------
  function caBox() {
    const m = S.board && S.board.life, el = $('#caBox'); el.hidden = !m; if (!m) return;
    el.innerHTML = `$TICKTOK<br><span style="color:#fff">${C.short(m, 6)}</span><div class="row"><button type="button" id="caC">copy</button><a href="https://pump.fun/coin/${m}" target="_blank" rel="noopener">buy</a><a href="https://dexscreener.com/solana/${m}" target="_blank" rel="noopener">chart</a></div>`;
    $('#caC').onclick = () => C.copy(m);
  }
  async function load() {
    const j = await C.get('/api/board').catch(() => null);
    S.board = j && (j.ok || j.offline) ? j : { coins: [], notes: [], elders: [], lives: { alive: 0 }, open: false };
    await Tok.ready(); feed(); splitBox(); goLabel(); caBox(); route();
  }
  C.onWallet(() => { goLabel(); if (!$('#v-viewers').hidden) me(); });
  load();
  setInterval(() => { if (document.hidden) return; C.get('/api/board').then(j => { if (j && j.ok) { const fresh = JSON.stringify((j.coins || []).map(k => [k.mint, k.state, k.caption, k.pushed_at])) !== JSON.stringify(((S.board && S.board.coins) || []).map(k => [k.mint, k.state, k.caption, k.pushed_at])); S.board = j; if (fresh && !$('#v-feed').hidden) feed(); } }).catch(() => {}); }, 60000);
})();
