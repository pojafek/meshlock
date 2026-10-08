/* Cycle time calculator · Meshlock toolkit
   Renders into every element with data-tool="cycle-time". One file, used by /toolkit/cycle-time/
   and the machine data Field Note. Styles: assets/toolkit/cycle-calc.css.
   Add data-hash to the element to keep the inputs in the page link after # (so a bookmark or a
   home screen icon opens the same numbers). Nothing typed here is sent anywhere. */
(function(){
  'use strict';
  var EXAMPLE = { c: '43:39', n: '36', h: '8', q: '' };
  var NOTE = 'Full running is the ceiling. Your real number is lower by every stop the log shows.';
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

  // ---------- one calculator
  function build(root){
    var id = 'cc' + (++count), useHash = root.hasAttribute('data-hash');
    root.innerHTML =
      '<div class="cc">' +
        '<div class="cc-head"><span class="cc-tag">Cycle time calculator</span><span class="cc-sub-head">At full running</span></div>' +
        '<div class="cc-in">' +
          field('c', 'Cycle time', '', 'e.g. 43:39', 'text') +
          field('n', 'Parts per cycle', '', '1', 'numeric') +
          field('h', 'Shift length', ' (hours)', '8', 'decimal') +
          field('q', 'Order quantity', ' (optional)', 'optional', 'numeric') +
        '</div>' +
        '<div class="cc-out" aria-live="polite">' +
          stat('part', 'Time per part') + stat('hour', 'Parts per hour') +
          stat('shift', 'Parts per shift at full running') + stat('order', 'Time to finish the order') +
        '</div>' +
        '<div class="cc-note">' + NOTE + '</div>' +
        '<div class="cc-actions"><button type="button" class="cc-copy">Copy result</button><span class="cc-status" role="status"></span></div>' +
      '</div>';
    function field(k, label, extra, ph, mode){
      return '<div class="cc-f"><label for="' + id + k + '">' + label + (extra ? '<span class="o">' + extra + '</span>' : '') + '</label>' +
        '<input id="' + id + k + '" data-k="' + k + '" type="text" inputmode="' + mode + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + ph + '" aria-describedby="' + id + k + '-h ' + id + k + '-e">' +
        '<div class="cc-hint" id="' + id + k + '-h"></div><div class="cc-err" id="' + id + k + '-e"></div></div>';
    }
    function stat(k, label){
      return '<div class="cc-stat"><div class="cc-v" data-o="' + k + '"></div><div class="cc-k">' + label + '</div><div class="cc-x" data-x="' + k + '"></div></div>';
    }
    var $ = function(s){ return root.querySelector(s); };
    var inp = {}; ['c', 'n', 'h', 'q'].forEach(function(k){ inp[k] = $('[data-k="' + k + '"]'); });
    var out = $('.cc-out'), copy = $('.cc-copy'), status = $('.cc-status'), last = null;

    // Start values: the link after # (standalone page), else the worked example
    var start = Object.assign({}, EXAMPLE);
    if (useHash && /(^#|&)c=/.test(location.hash)) { start = { c: '', n: '', h: '', q: '' }; }
    if (useHash) location.hash.replace(/^#/, '').split('&').forEach(function(kv){
      var a = kv.split('='); if (a[0] in start) { try { start[a[0]] = decodeURIComponent(a[1] || ''); } catch(e){} }
    });
    Object.keys(inp).forEach(function(k){ inp[k].value = start[k]; inp[k].addEventListener('input', function(){ update(true); }); });

    function setErr(k, msg){
      $('#' + id + k + '-e').textContent = msg || '';
      inp[k].setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function hint(k, txt){ $('#' + id + k + '-h').textContent = txt || ''; }
    function show(k, v, x, empty){
      var el = $('[data-o="' + k + '"]'); el.textContent = v; el.classList.toggle('cc-empty', !!empty);
      $('[data-x="' + k + '"]').textContent = x || '';
    }

    function update(typed){
      var cRaw = inp.c.value, nRaw = inp.n.value, hRaw = inp.h.value, qRaw = inp.q.value;
      var c = parseCycle(cRaw), n = nRaw.trim() ? whole(nRaw) : 1, sh = parseShift(hRaw), q = qRaw.trim() ? whole(qRaw) : null;
      var ok = true;
      if (!cRaw.trim()) { setErr('c', 'Enter a cycle time, for example 43:39.'); ok = false; hint('c', ''); }
      else if (!(c > 0)) { setErr('c', 'Use a time like 43:39, 0:43:39, 43m 39s, or plain seconds like 2619.'); ok = false; hint('c', ''); }
      else { setErr('c'); hint('c', 'Read as ' + spoken(c) + ' · ' + group(Math.round(c * 10) / 10) + ' s'); }
      if (!(n >= 1)) { setErr('n', 'Parts per cycle must be a whole number, 1 or more.'); ok = false; } else setErr('n');
      if (!(sh > 0) || sh > 24 * 3600) { setErr('h', 'Shift length in hours, for example 8, 7.5 or 7:30 (up to 24).'); ok = false; hint('h', ''); }
      else { setErr('h'); hint('h', hRaw.trim() ? '' : 'Empty means 8 hours'); }
      if (q !== null && !(q >= 1)) { setErr('q', 'Order quantity must be a whole number of parts.'); ok = false; } else setErr('q');

      if (useHash && typed) {
        var h = ['c', 'n', 'h', 'q'].filter(function(k){ return inp[k].value.trim(); })
          .map(function(k){ return k + '=' + encodeURIComponent(inp[k].value.trim()); }).join('&');
        try { history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : '')); } catch(e){}
      }
      out.classList.toggle('is-off', !ok); copy.disabled = !ok; status.textContent = '';
      if (!ok) { ['part', 'hour', 'shift', 'order'].forEach(function(k){ show(k, ''); }); last = null; return; }

      var t = c / n, perHour = 3600 / t, perShift = sh / t, r = { c: cRaw.trim(), cs: c, n: n, sh: sh, q: q };
      r.part = perPart(t); r.hour = rate(perHour); r.shift = rate(perShift);
      show('part', r.part, n > 1 ? group(n) + ' parts per ' + clock(c) + ' cycle' : 'One part per cycle');
      show('hour', r.hour, '');
      show('shift', r.shift, 'In ' + hours(sh) + ', no stops');
      if (q) {
        var cycles = Math.ceil(q / n), total = cycles * c;
        r.order = spoken(total); r.orderX = group(cycles) + (cycles === 1 ? ' cycle' : ' cycles') + ' · ' + (Math.round(total / sh * 10) / 10) + ' shifts';
        show('order', r.order, r.orderX);
      } else { r.order = null; show('order', 'Add an order quantity', '', true); }
      last = r;
    }

    copy.addEventListener('click', function(){
      if (!last) return;
      var lines = [
        'Cycle time calculator · meshlock.co.uk/toolkit/cycle-time/',
        'Cycle time: ' + last.c + ' (' + spoken(last.cs) + ')',
        'Parts per cycle: ' + group(last.n),
        'Shift length: ' + hours(last.sh),
        'Order quantity: ' + (last.q ? group(last.q) : 'not set'),
        'Time per part: ' + last.part,
        'Parts per hour: ' + last.hour,
        'Parts per shift at full running: ' + last.shift,
        'Time to finish the order: ' + (last.order ? last.order + ' (' + last.orderX + ')' : 'no order quantity'),
        NOTE
      ], text = lines.join('\n');
      function done(){ status.textContent = 'Copied'; setTimeout(function(){ status.textContent = ''; }, 2500); }
      function fallback(){
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'absolute'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(e){ status.textContent = 'Copy not available here'; }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
    update();
  }

  function init(){ document.querySelectorAll('[data-tool="cycle-time"]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
