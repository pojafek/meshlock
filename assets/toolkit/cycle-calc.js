/* Cycle time calculator · Meshlock toolkit
   Renders into every element with data-tool="cycle-time". One file, used by /toolkit/cycle-time/
   and the machine data Field Note. Styles: assets/toolkit/cycle-calc.css.
   Options on the element:
     data-hash        keep the inputs in the page link after # (a bookmark or home screen icon reopens them)
     data-puzzle      offer "Use the puzzle's N%" once the Decode the log puzzle on the page is solved
                      (the puzzle fires the 'ml:puzzle' event with detail.pct)
     data-where       where "your machine records" links (default: the six places in the machine data note)
     data-note        link "the machine data note" in the running % helper to this address
     data-offer-tag   fallback tag on the "Get your real number" offer link (a stored tag still wins)
     data-remember    keep the inputs on this device (localStorage 'ml-cycle') and reopen with them next
                      time, when the link carries none (the toolkit page)
   Once the puzzle on the page is solved, its % fills the running % by itself if none is chosen yet.
   Print result uses assets/toolkit/print.js (one clean page). Copy for an email copies plain text.
   Nothing typed here is sent anywhere: no counting events, no form, values stay in this page
   (and, with data-remember, in this browser). */
(function(){
  'use strict';
  var EXAMPLE = { c: '43:39', n: '36', h: '8', d: '', q: '', r: '', m: '' };
  var NOTE = {
    none: 'This is the ceiling. No machine runs 100%. To plan real work you need your real running %, and that lives in your machine records.',
    guess: 'A guess plans the week on a number nobody checked.',
    measured: 'Planned on your measured running %. Keep measuring: it changes week to week.',
    puzzle: 'Planned on the puzzle\'s example shift. Your own machines have their own number, and it lives in your machine records.'
  };
  var MODE = { measured: 'measured', guess: 'guessed', puzzle: 'puzzle example' };
  var GUESS_START = 70;
  var count = 0;

  // ---------- parsing
  function num(s){ return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN; }
  // Units: 43m 39s, 1h 2m, 90s, 1.5h
  function units(s){
    var m = s.match(/^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?)?$/);
    if (!m || !(m[1] || m[2] || m[3])) return NaN;
    return (parseFloat(m[1] || 0) * 3600) + (parseFloat(m[2] || 0) * 60) + parseFloat(m[3] || 0);
  }
  // Cycle time: 43:39 (m:ss), 0:43:39 (h:mm:ss), 43m 39s, or plain seconds (2619) straight from a log
  function parseCycle(raw){
    var s = String(raw).trim().toLowerCase().replace(/,/g, '.');
    if (!s) return NaN;
    if (!isNaN(num(s))) return num(s);
    var m = s.match(/^(\d+):([0-5]\d(?:\.\d+)?)$/);
    if (m) return (+m[1]) * 60 + parseFloat(m[2]);
    m = s.match(/^(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)$/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
    return units(s);
  }
  // Shift length: plain hours (8, 7.5), h:mm (7:30) or units (7h 30m). Returns seconds.
  function parseShift(raw){
    var s = String(raw).trim().toLowerCase().replace(/,/g, '.');
    if (!s) return 8 * 3600;
    if (!isNaN(num(s))) return num(s) * 3600;
    var m = s.match(/^(\d+):([0-5]\d)$/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60;
    return units(s);
  }
  function whole(raw){ var s = String(raw).trim().replace(/[\s,]/g, ''); return /^\d+$/.test(s) ? parseInt(s, 10) : NaN; }

  // ---------- formatting
  function group(n){ return n.toLocaleString('en-GB'); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function clock(sec){ // 1:13, 43:39, 1:02:05
    var t = Math.round(sec), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
  }
  function perPart(sec){ return sec < 59.95 ? (Math.round(sec * 10) / 10).toFixed(1) + ' s' : clock(sec); }
  function spoken(sec){ // 43 m 39 s, 10 h 11 m
    var t = Math.round(sec), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    if (h) return h + ' h ' + m + ' m';
    return m ? m + ' m ' + s + ' s' : s + ' s';
  }
  function rate(v){ return v < 10 ? (Math.floor(v * 10) / 10).toFixed(1) : group(Math.floor(v)); }
  function hours(sec){ var h = sec / 3600; return (Math.round(h * 100) / 100) + ' h'; }
  function one(v){ return String(Math.round(v * 10) / 10); }
  function pctText(v){ return one(v) + '%'; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- one calculator
  function build(root){
    var id = 'cc' + (++count), useHash = root.hasAttribute('data-hash'), usePuzzle = root.hasAttribute('data-puzzle');
    var remember = root.hasAttribute('data-remember'), RKEY = 'ml-cycle';
    var where = root.getAttribute('data-where') || '/notes/your-machines-already-know.html#six-places';
    var note = root.getAttribute('data-note'), offerTag = root.getAttribute('data-offer-tag');
    var offer = '/start/' + (offerTag ? '?s=' + encodeURIComponent(offerTag) : '') + '#f=machines';
    var helper = 'Don\'t know it? Most people don\'t. That\'s what ' +
      (note ? '<a href="' + esc(note) + '">the machine data note</a>' : 'the machine data note') + ' is about.';
    root.innerHTML =
      '<div class="cc">' +
        '<div class="cc-head"><span class="cc-tag">Cycle time calculator</span><span class="cc-sub-head">Nothing you type leaves this page</span></div>' +
        '<div class="cc-in">' +
          field('c', 'Cycle time', '', 'e.g. 43:39', 'text') +
          field('n', 'Parts per cycle', '', '1', 'numeric') +
          field('h', 'Shift length', ' (hours)', '8', 'decimal') +
          field('d', 'Shifts per day', ' (optional)', '1', 'numeric') +
          field('q', 'Order quantity', ' (optional)', 'optional', 'numeric') +
          '<div class="cc-f cc-run" role="group" aria-labelledby="' + id + 'r-l">' +
            '<span class="cc-label" id="' + id + 'r-l">Your machine\'s real running %<span class="o"> (optional)</span></span>' +
            '<div class="cc-helper">' + helper + '</div>' +
            '<div class="cc-modes">' +
              '<button type="button" class="cc-mode" data-m="measured" aria-pressed="false">I measured it</button>' +
              '<button type="button" class="cc-mode" data-m="guess" aria-pressed="false">Guess</button>' +
              (usePuzzle ? '<button type="button" class="cc-mode" data-m="puzzle" aria-pressed="false" hidden>Use the puzzle\'s <span class="cc-pz"></span></button>' : '') +
            '</div>' +
            '<div class="cc-mpane" data-p="measured" hidden><label class="cc-label" for="' + id + 'r">Measured running %</label>' +
              '<div class="cc-pct"><input id="' + id + 'r" data-k="r" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 76" aria-describedby="' + id + 'r-e"><span>%</span></div>' +
              '<div class="cc-err" id="' + id + 'r-e"></div></div>' +
            '<div class="cc-mpane" data-p="guess" hidden><label class="cc-label" for="' + id + 'g">Your guess</label>' +
              '<div class="cc-range"><input id="' + id + 'g" data-k="g" type="range" min="10" max="100" step="1" value="' + GUESS_START + '"><output for="' + id + 'g" class="cc-gv">' + GUESS_START + '%</output></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-out" aria-live="polite">' +
          '<div class="cc-top">' + stat('part', 'Time per part') + stat('hour', 'Parts per hour') + '</div>' +
          '<div class="cc-row" data-row="ceil"><div class="cc-rowh">Ceiling at 100%</div>' +
            stat('cshift', 'Parts per shift') + stat('cday', 'Parts per day') + stat('corder', 'Time to finish the order') + '</div>' +
          '<div class="cc-row" data-row="plan"><div class="cc-rowh" data-o="planh">Planned at your real %</div>' +
            stat('pshift', 'Parts per shift') + stat('pday', 'Average parts per day') + stat('porder', 'Time to finish the order') + '</div>' +
        '</div>' +
        '<div class="cc-note"><span data-o="note"></span> <a class="cc-link" data-o="link" href="#"></a></div>' +
        '<div class="cc-actions"><button type="button" class="cc-print">Print result</button><button type="button" class="cc-copy">Copy for an email</button><span class="cc-status" role="status"></span>' +
          '<span class="cc-again" hidden>Your last numbers, kept on this device. <button type="button" class="cc-ex">Back to the example</button></span></div>' +
      '</div>';
    function field(k, label, extra, ph, mode){
      return '<div class="cc-f"><label for="' + id + k + '">' + label + (extra ? '<span class="o">' + extra + '</span>' : '') + '</label>' +
        '<input id="' + id + k + '" data-k="' + k + '" type="text" inputmode="' + mode + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + ph + '" aria-describedby="' + id + k + '-h ' + id + k + '-e">' +
        '<div class="cc-hint" id="' + id + k + '-h"></div><div class="cc-err" id="' + id + k + '-e"></div></div>';
    }
    function stat(k, label){
      return '<div class="cc-stat"><div class="cc-v" data-o="' + k + '"></div><div class="cc-k">' + label + '</div><div class="cc-x" data-x="' + k + '"></div><span class="cc-stamp" data-s="' + k + '" hidden></span></div>';
    }
    var $ = function(s){ return root.querySelector(s); };
    var inp = {}; ['c', 'n', 'h', 'd', 'q', 'r', 'g'].forEach(function(k){ inp[k] = $('[data-k="' + k + '"]'); });
    var out = $('.cc-out'), copy = $('.cc-copy'), prt = $('.cc-print'), status = $('.cc-status'), last = null;
    var mode = '', puzzlePct = null;

    // Start values: the link after # (standalone page), else the worked example
    var start = Object.assign({}, EXAMPLE), restored = false;
    if (useHash && /(^#|&)c=/.test(location.hash)) start = { c: '', n: '', h: '', d: '', q: '', r: '', m: '' };
    else if (remember) { try { var kept = JSON.parse(localStorage.getItem(RKEY) || 'null'); if (kept && kept.c) { start = Object.assign({ c: '', n: '', h: '', d: '', q: '', r: '', m: '' }, kept); restored = true; } } catch(e){} }
    if (useHash) location.hash.replace(/^#/, '').split('&').forEach(function(kv){
      var a = kv.split('='); if (a[0] in start) { try { start[a[0]] = decodeURIComponent(a[1] || ''); } catch(e){} }
    });
    ['c', 'n', 'h', 'd', 'q'].forEach(function(k){ inp[k].value = start[k]; });
    if (start.m === 'measured') { mode = 'measured'; inp.r.value = start.r; }
    else if (start.m === 'guess' && +start.r >= 10 && +start.r <= 100) { mode = 'guess'; inp.g.value = Math.round(+start.r); }
    ['c', 'n', 'h', 'd', 'q', 'r', 'g'].forEach(function(k){ inp[k].addEventListener('input', function(){ update(true); }); });

    // Running % modes: none, measured, guess, puzzle. Pressing the active one clears it. None blocks another.
    root.querySelectorAll('.cc-mode').forEach(function(b){
      b.addEventListener('click', function(){
        mode = (mode === b.getAttribute('data-m')) ? '' : b.getAttribute('data-m');
        update(true);
        if (mode === 'measured') inp.r.focus();
      });
    });
    if (usePuzzle) {
      // The puzzle's % fills in by itself, unless the reader already picked measured or a guess
      var offerPuzzle = function(pct){
        puzzlePct = pct; var b = $('.cc-mode[data-m="puzzle"]');
        b.querySelector('.cc-pz').textContent = pctText(pct); b.hidden = false;
        if (!mode) mode = 'puzzle';
        update(false);
      };
      if (typeof window.mlPuzzlePct === 'number') offerPuzzle(window.mlPuzzlePct);
      document.addEventListener('ml:puzzle', function(e){ if (e.detail && typeof e.detail.pct === 'number') offerPuzzle(e.detail.pct); });
    }

    function setErr(k, msg){
      $('#' + id + k + '-e').textContent = msg || '';
      inp[k].setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function hint(k, txt){ $('#' + id + k + '-h').textContent = txt || ''; }
    function show(k, v, x, empty, stamp){
      var el = $('[data-o="' + k + '"]'); el.textContent = v; el.classList.toggle('cc-empty', !!empty);
      $('[data-x="' + k + '"]').textContent = x || '';
      var st = $('[data-s="' + k + '"]'); st.hidden = !stamp; st.textContent = stamp || '';
    }

    function update(typed){
      var cRaw = inp.c.value, nRaw = inp.n.value, hRaw = inp.h.value, dRaw = inp.d.value, qRaw = inp.q.value;
      var c = parseCycle(cRaw), n = nRaw.trim() ? whole(nRaw) : 1, sh = parseShift(hRaw), q = qRaw.trim() ? whole(qRaw) : null;
      var d = dRaw.trim() ? whole(dRaw) : 1, ok = true, maxD = sh > 0 ? Math.floor(24 * 3600 / sh + 1e-9) : 1;
      if (!cRaw.trim()) { setErr('c', 'Enter a cycle time, for example 43:39.'); ok = false; hint('c', ''); }
      else if (!(c > 0)) { setErr('c', 'Use a time like 43:39, 0:43:39, 43m 39s, or plain seconds like 2619.'); ok = false; hint('c', ''); }
      else { setErr('c'); hint('c', 'Read as ' + spoken(c) + ' · ' + group(Math.round(c * 10) / 10) + ' s'); }
      if (!(n >= 1)) { setErr('n', 'Parts per cycle must be a whole number, 1 or more.'); ok = false; } else setErr('n');
      if (!(sh > 0) || sh > 24 * 3600) { setErr('h', 'Shift length in hours, for example 8, 7.5 or 7:30 (up to 24).'); ok = false; hint('h', ''); }
      else { setErr('h'); hint('h', hRaw.trim() ? '' : 'Empty means 8 hours'); }
      if (!(d >= 1) || (sh > 0 && d > maxD)) { setErr('d', 'Shifts per day: a whole number from 1 to ' + maxD + ' for this shift length.'); ok = false; hint('d', ''); }
      else { setErr('d'); hint('d', dRaw.trim() ? '' : 'Empty means 1 shift'); }
      if (q !== null && !(q >= 1)) { setErr('q', 'Order quantity must be a whole number of parts.'); ok = false; } else setErr('q');

      // Running %: which mode, and its value
      var p = null, rRaw = inp.r.value.trim().replace(/%$/, '').trim().replace(/,/g, '.');
      if (mode === 'puzzle' && puzzlePct === null) mode = '';
      root.querySelectorAll('.cc-mode').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-m') === mode ? 'true' : 'false'); });
      root.querySelectorAll('.cc-mpane').forEach(function(pn){ pn.hidden = pn.getAttribute('data-p') !== mode; });
      setErr('r');
      if (mode === 'measured') {
        var rv = /^\d+(\.\d+)?$/.test(rRaw) ? parseFloat(rRaw) : NaN;
        if (!rRaw) p = null;
        else if (!(rv > 0 && rv <= 100)) setErr('r', 'A running % is a number from 1 to 100, for example 76.');
        else p = rv;
      } else if (mode === 'guess') { p = +inp.g.value; $('.cc-gv').textContent = p + '%'; }
      else if (mode === 'puzzle') p = puzzlePct;

      if (remember && typed) {
        var keep = {}; ['c', 'n', 'h', 'd', 'q'].forEach(function(k){ keep[k] = inp[k].value.trim(); });
        if (mode === 'measured' && rRaw) { keep.r = rRaw; keep.m = 'measured'; }
        if (mode === 'guess') { keep.r = inp.g.value; keep.m = 'guess'; }
        try { if (keep.c) localStorage.setItem(RKEY, JSON.stringify(keep)); } catch(e){}
        $('.cc-again').hidden = true;
      }
      if (useHash && typed) {
        var parts = ['c', 'n', 'h', 'd', 'q'].filter(function(k){ return inp[k].value.trim(); })
          .map(function(k){ return k + '=' + encodeURIComponent(inp[k].value.trim()); });
        if (mode === 'measured' && rRaw) parts.push('r=' + encodeURIComponent(rRaw), 'm=measured');
        if (mode === 'guess') parts.push('r=' + inp.g.value, 'm=guess');
        try { history.replaceState(null, '', location.pathname + location.search + (parts.length ? '#' + parts.join('&') : '')); } catch(e){}
      }
      out.classList.toggle('is-off', !ok); copy.disabled = !ok; prt.disabled = !ok; status.textContent = '';
      var keys = ['part', 'hour', 'cshift', 'cday', 'corder', 'pshift', 'pday', 'porder'];
      if (!ok) { keys.forEach(function(k){ show(k, ''); }); setNote(''); last = null; return; }

      var t = c / n, r = { c: cRaw.trim(), cs: c, n: n, sh: sh, d: d, q: q, mode: mode, p: p };
      r.part = perPart(t); r.hour = rate(3600 / t);
      show('part', r.part, n > 1 ? group(n) + ' parts per ' + clock(c) + ' cycle' : 'One part per cycle');
      show('hour', r.hour, '');

      // Ceiling at 100%
      r.cshift = rate(sh / t); r.cday = rate(sh * d / t);
      show('cshift', r.cshift, 'In ' + hours(sh) + ', no stops');
      show('cday', r.cday, d === 1 ? '1 shift' : d + ' shifts');
      var cycles = q ? Math.ceil(q / n) : 0, run = cycles * c;
      if (q) { r.corder = spoken(run); r.corderX = group(cycles) + (cycles === 1 ? ' cycle' : ' cycles') + ' · ' + one(run / sh) + ' shifts'; show('corder', r.corder, r.corderX); }
      else { r.corder = null; show('corder', 'Add an order quantity', '', true); }

      // Planned at the real running %
      var stamp = mode === 'guess' ? 'GUESS' : (mode === 'puzzle' ? 'EXAMPLE' : '');
      $('[data-o="planh"]').textContent = p ? 'Planned at ' + pctText(p) + ' (' + MODE[mode] + ')' : 'Planned at your real %';
      $('[data-row="plan"]').classList.toggle('is-empty', !p);
      if (p) {
        var f = p / 100;
        r.pshift = rate(sh * f / t); r.pday = rate(sh * d * f / t);
        show('pshift', r.pshift, 'Running ' + hours(sh * f) + ' of ' + hours(sh), false, stamp);
        show('pday', r.pday, d === 1 ? '1 shift' : d + ' shifts', false, stamp);
        if (q) { var wall = run / f; r.porder = spoken(wall); var days = one(wall / sh / d); r.porderX = one(wall / sh) + ' shifts · ' + days + (days === '1' ? ' day' : ' days'); show('porder', r.porder, r.porderX, false, stamp); }
        else { r.porder = null; show('porder', 'Add an order quantity', '', true); }
      } else {
        ['pshift', 'pday', 'porder'].forEach(function(k){ show(k, 'Needs your running %', '', true); });
        r.pshift = r.pday = r.porder = null;
      }
      setNote(p ? mode : 'none');
      last = r;
    }
    function setNote(state){
      var t = $('[data-o="note"]'), a = $('[data-o="link"]');
      t.textContent = state ? NOTE[state] : '';
      if (state === 'guess') { a.textContent = 'Get your real number →'; a.setAttribute('href', offer); a.hidden = false; }
      else if (state === 'none' || state === 'puzzle') { a.textContent = 'Where to find it →'; a.setAttribute('href', where); a.hidden = false; }
      else { a.hidden = true; a.removeAttribute('href'); }
    }

    function lines(L){
      return [
        'Cycle time calculator · meshlock.co.uk/toolkit/cycle-time/',
        'Cycle time: ' + L.c + ' (' + spoken(L.cs) + ')',
        'Parts per cycle: ' + group(L.n),
        'Shift length: ' + hours(L.sh),
        'Shifts per day: ' + L.d,
        'Order quantity: ' + (L.q ? group(L.q) : 'not set'),
        'Real running %: ' + (L.p ? pctText(L.p) + ' (' + MODE[L.mode] + ')' : 'not set'),
        'Time per part: ' + L.part,
        'Parts per hour: ' + L.hour,
        'Ceiling at 100%: ' + L.cshift + ' parts per shift · ' + L.cday + ' parts per day · ' + (L.corder ? 'order in ' + L.corder + ' (' + L.corderX + ')' : 'no order quantity'),
        L.p ? 'Planned at ' + pctText(L.p) + ' (' + MODE[L.mode] + '): ' + L.pshift + ' parts per shift · ' + L.pday + ' parts per day on average · ' + (L.porder ? 'order in ' + L.porder + ' (' + L.porderX + ')' : 'no order quantity') : 'Planned: needs your real running %',
        NOTE[L.p ? L.mode : 'none']
      ];
    }
    copy.addEventListener('click', function(){
      if (!last) return;
      var text = lines(last).join('\n');
      function done(){ status.textContent = 'Copied. Paste it into an email or a message.'; setTimeout(function(){ status.textContent = ''; }, 4000); }
      function fallback(){
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'absolute'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(e){ status.textContent = 'Copy not available here'; }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
    // Print result: the inputs and both rows as one clean page (assets/toolkit/print.js)
    prt.addEventListener('click', function(){
      if (!last || !window.mlPrint) return;
      var L = last, e = window.mlPrint.esc;
      var row = function(k, v){ return '<tr><th>' + e(k) + '</th><td>' + e(v) + '</td></tr>'; };
      var html = '<table class="ccp">' +
        '<tr><td colspan="2" class="ccp-h">Inputs</td></tr>' +
        row('Cycle time', L.c + ' (' + spoken(L.cs) + ')') + row('Parts per cycle', group(L.n)) + row('Shift length', hours(L.sh)) +
        row('Shifts per day', L.d) + row('Order quantity', L.q ? group(L.q) : 'not set') +
        row('Real running %', L.p ? pctText(L.p) + ' (' + MODE[L.mode] + ')' : 'not set') +
        '<tr><td colspan="2" class="ccp-h">Per part</td></tr>' + row('Time per part', L.part) + row('Parts per hour', L.hour) +
        '<tr><td colspan="2" class="ccp-h">Ceiling at 100%</td></tr>' + row('Parts per shift', L.cshift) + row('Parts per day', L.cday) +
        row('Time to finish the order', L.corder ? L.corder + ' · ' + L.corderX : 'no order quantity') +
        '<tr><td colspan="2" class="ccp-h">' + (L.p ? 'Planned at ' + e(pctText(L.p)) + ' (' + MODE[L.mode] + ')' : 'Planned at your real %') + '</td></tr>' +
        (L.p ? row('Parts per shift', L.pshift) + row('Average parts per day', L.pday) + row('Time to finish the order', L.porder ? L.porder + ' · ' + L.porderX : 'no order quantity')
             : row('Planned numbers', 'need your real running %')) +
        '</table><p class="ccp-note">' + e(NOTE[L.p ? L.mode : 'none']) + '</p>' +
        '<style>.ccp{width:100%;border-collapse:collapse;font-size:13px}.ccp th,.ccp td{text-align:left;padding:6px 8px;border-bottom:1px solid #C9CDC0}' +
        '.ccp th{font-weight:400;color:#565C58;width:45%}.ccp td{font-weight:600}.ccp .ccp-h{font:500 10.5px/1.4 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#171A1D;border-bottom:1.5px solid #171A1D;padding-top:14px}' +
        '.ccp-note{font-size:12.5px;color:#565C58;margin:12px 0 0}</style>';
      window.mlPrint({ title: 'Cycle time calculator', tool: '/toolkit/cycle-time/', fallback: root.getAttribute('data-offer-tag'), html: html });
    });
    if (restored) $('.cc-again').hidden = false;
    $('.cc-ex').addEventListener('click', function(){
      try { localStorage.removeItem(RKEY); } catch(e){}
      ['c', 'n', 'h', 'd', 'q'].forEach(function(k){ inp[k].value = EXAMPLE[k]; });
      mode = ''; $('.cc-again').hidden = true; update(true);
    });
    update(false);
  }

  function init(){ document.querySelectorAll('[data-tool="cycle-time"]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
