/* File anonymiser · Meshlock toolkit
   Renders into every element with data-tool="anonymise". Used by /toolkit/anonymise/.
   Styles: assets/toolkit/anonymise.css. Excel files need /assets/vendor/exceljs.min.js (MIT) on the page.

   Everything happens in this browser. Files are read with FileReader, changed in memory and
   saved with a download link. Nothing is sent, stored or counted: no form, no request, no
   localStorage, no counting events. Reloading the page forgets it all.

   How it works:
     - every CSV, and every sheet of an Excel file, is one table; the visitor picks the header row
     - each column gets an action, suggested from its header and its values (SUGGEST below)
     - stand-ins are kept in one map per kind (name, code, email) for the whole run, so the same
       value gets the same stand-in in every column and every file added together
     - dates move by one offset in whole weeks, numbers to scale by one factor (both random per run)
     - the key (CSV) lists every stand-in next to its real value plus the two settings; adding it
       to a later run reuses them
     - the leak check looks for any real value from a swapped column anywhere else in the output
       (kept columns, headers, sheet and file names) and can swap those too
   Options on the element:
     data-offer-tag   fallback tag on the offer link (a stored tag still wins, see assets/site.js)
   For the site check: window.mlAnon exposes the pure helpers. */
(function(){
  'use strict';

  var ACTS = [
    ['keep', 'Keep'],
    ['name', 'Swap names'],
    ['code', 'Swap codes (same pattern)'],
    ['email', 'Swap emails'],
    ['date', 'Shift dates (whole weeks)'],
    ['scale', 'Scale numbers'],
    ['clear', 'Empty the column'],
    ['remove', 'Remove the column']
  ];
  var ACT_SHORT = { keep: 'kept as it was', name: 'swapped for stand-ins (names and text)', code: 'swapped for stand-ins with the same pattern',
    email: 'swapped for stand-in email addresses', date: 'dates moved by whole weeks (weekdays and gaps unchanged)',
    scale: 'numbers scaled by one hidden factor (order and proportions unchanged)', clear: 'emptied', remove: 'removed' };

  // ---------- small helpers ----------
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(n){ var a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return a[0] % n; }
  function pad(n, w){ n = String(n); while (n.length < w) n = '0' + n; return n; }
  function norm(v){ return String(v).trim().replace(/\s+/g, ' ').toLowerCase(); }
  function fmtInt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function isDate(v){ return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v); }
  function show(v){
    if (v === null || v === undefined) return '';
    if (isDate(v)) {
      var s = v.getUTCFullYear() + '-' + pad(v.getUTCMonth() + 1, 2) + '-' + pad(v.getUTCDate(), 2);
      if (v.getUTCHours() || v.getUTCMinutes()) s += ' ' + pad(v.getUTCHours(), 2) + ':' + pad(v.getUTCMinutes(), 2);
      return s;
    }
    return String(v);
  }
  function cut(s, n){ s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // ---------- CSV ----------
  function detectDelim(t){
    var lines = t.split(/\r?\n/).filter(function(l){ return l.trim(); }).slice(0, 8), best = ',', bestScore = 0;
    [',', ';', '\t', '|'].forEach(function(d){
      var counts = lines.map(function(l){ var q = false, n = 0; for (var i = 0; i < l.length; i++) { if (l[i] === '"') q = !q; else if (!q && l[i] === d) n++; } return n; });
      if (!counts.length || !counts[0]) return;
      var same = counts.filter(function(c){ return c === counts[0]; }).length, score = counts[0] * same;
      if (score > bestScore) { best = d; bestScore = score; }
    });
    return best;
  }
  function parseCSV(t, d){
    var rows = [], row = [], f = '', q = false, quoted = false, n = t.length, c;
    for (var i = 0; i < n; i++) {
      c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === '' && !quoted) { q = true; quoted = true; }
      else if (c === d) { row.push(f); f = ''; quoted = false; }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && t[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = ''; quoted = false;
      }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function toCSV(rows, d, eol){
    return rows.map(function(r){
      return r.map(function(v){
        v = v === null || v === undefined ? '' : show(v);
        return (v.indexOf(d) > -1 || /["\r\n]/.test(v) || /^\s|\s$/.test(v)) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(d);
    }).join(eol) + eol;
  }
  function decode(buf){
    var b = new Uint8Array(buf), bom = b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF;
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bom ? b.subarray(3) : b), bom: bom }; }
    catch (e) { return { text: new TextDecoder('windows-1252').decode(b), bom: true }; }   // write back as UTF-8 with a BOM so Excel shows £ right
  }

  // ---------- value kinds ----------
  var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var RX = {
    email: /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/,
    iso: /^(\d{4})([-\/.])(\d{1,2})\2(\d{1,2})((?:[T ].*)?)$/,
    dmy: /^(\d{1,2})([-\/.])(\d{1,2})\2(\d{4}|\d{2})((?: .*)?)$/,
    mon: /^(\d{1,2})([- ])([A-Za-z]{3,9})\2(\d{4}|\d{2})((?: .*)?)$/,
    num: /^(-?)([£$€]?)(-?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(%?)$/,
    code: /^(?=.*\d)(?!(?:\S+ ){2})[A-Za-z0-9][A-Za-z0-9\-\/._ ]{1,29}$/   // at most one space: postcodes and phones yes, sentences no
  };
  function monIndex(s){ var i = MON.indexOf(s.slice(0, 3).toLowerCase()); return (i > -1 && (s.length === 3 || MONTHS[i].toLowerCase() === s.toLowerCase() || (s.length === 4 && s.toLowerCase() === 'sept'))) ? i : -1; }
  function parseDate(s, order){
    var m, y, mo, d;
    if ((m = RX.iso.exec(s))) { y = +m[1]; mo = +m[3]; d = +m[4]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return { f: 'iso', m: m, y: y, mo: mo, d: d }; }
    if ((m = RX.mon.exec(s))) { mo = monIndex(m[3]) + 1; d = +m[1]; if (!mo || d < 1 || d > 31) return null; y = +m[4]; if (m[4].length === 2) y += 2000; return { f: 'mon', m: m, y: y, mo: mo, d: d }; }
    if ((m = RX.dmy.exec(s))) {
      var a = +m[1], b = +m[3];
      if (order === 'mdy') { mo = a; d = b; } else { d = a; mo = b; }
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      y = +m[4]; if (m[4].length === 2) y += 2000;
      return { f: order === 'mdy' ? 'mdy' : 'dmy', m: m, y: y, mo: mo, d: d };
    }
    return null;
  }
  function dateOrder(values){
    var dmy = false, mdy = false;
    values.forEach(function(v){ var m = typeof v === 'string' && RX.dmy.exec(v.trim()); if (!m) return; if (+m[1] > 12) dmy = true; else if (+m[3] > 12) mdy = true; });
    return mdy && !dmy ? 'mdy' : 'dmy';
  }
  function kindOf(v, order){
    if (isDate(v)) return 'date';
    if (typeof v === 'number') return 'num';
    var s = String(v).trim();
    if (!s) return '';
    if (RX.email.test(s)) return 'email';
    if (parseDate(s, order)) return 'date';
    if (RX.num.test(s)) return 'num';
    if (RX.code.test(s)) return 'code';
    return 'text';
  }

  // ---------- suggestions from header and values ----------
  var H = {
    note: /(note|comment|remark|instruction|memo|message|narrative|free ?text|special req)/i,
    money: /(price|cost|value|amount|total|net\b|gross|tax|margin|discount|\brate\b|£|gbp|revenue|sales\b|charge|fee|salary|wage|\bpay\b|spend|budget|turnover)/i,
    code: /(order|\bpo\b|p\.o\.|purchase|\bref|invoice|\binv\b|\bjob|works ?order|\bwo\b|account|\bacc\b|\bacct\b|\bid\b|number|\bno\b\.?|\bnum\b|code|sku|\bpart|item|batch|\blot\b|serial|tracking|consignment|\bvat\b|\breg\b|phone|\btel\b|telephone|mobile|\bfax\b|post ?code|postal|\bzip\b)/i,
    name: /(customer|client|\bcust\b|consignee|recipient|contact|company|account|supplier|vendor|haulier|carrier|courier|name|surname|forename|address|\baddr|street|road|town|city|county|ship ?to|bill ?to|deliver|sold ?to|attention|\battn|operator|employee|staff|\buser|driver|picker|packer|created ?by|entered ?by|modified ?by|approved ?by|person|signed|\brep\b|sales ?rep|agent|manager|buyer|description|product|project|site\b|branch|store|shop\b|title)/i,
    email: /e-?mail/i,
    qty: /(qty|quantity|\bcount\b|pcs|pieces|weight|\bkg\b|hours|\bhrs\b|mins|minutes|\bline\b|\bseq|sequence|\blevel\b)/i,
    desc: /(description|\bdesc\b|product|title)/i
  };
  function suggest(header, kinds){
    var h = String(header || ''), k = kinds.top, share = kinds.share;
    if (k === 'email' && share >= 0.6) return ['email', 'Looks like email addresses'];
    if (H.email.test(h)) return ['email', 'Header says email'];
    if (k === 'date' && share >= 0.6) return ['keep', 'Dates. Shift them if they say too much'];
    if (H.note.test(h)) return ['clear', 'Free text: names hide in notes'];
    if (H.money.test(h) && k === 'num' && share >= 0.6) return ['scale', 'Header looks like a price or amount'];
    if (H.qty.test(h) && k === 'num') return ['keep', ''];
    if (H.desc.test(h) && (k === 'text' || k === 'code')) return ['name', 'Header looks like a description'];
    if (H.code.test(h) && (k === 'code' || k === 'num') && share >= 0.5) return ['code', 'Header looks like a code, number or reference'];
    if (H.name.test(h) && (k === 'text' || k === 'code')) return ['name', 'Header looks like a name, place or description'];
    if (k === 'text' && share >= 0.6 && kinds.distinct > 5 && kinds.avgLen > 5) return ['keep', 'Text. Swap it if it names anyone'];
    return ['keep', ''];
  }
  function labelFrom(header){
    var s = String(header || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_]+/g, ' ').replace(/\b(name|full|the|of|no\.?|number|code|id)\b/gi, ' ').replace(/[^A-Za-z0-9 &]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) s = 'Value';
    s = s.split(' ').slice(0, 3).join(' ');
    s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return s.slice(0, 24);
  }

  // ---------- one run: maps, settings, transforms ----------
  function newRun(){
    var weeks = 8 + rnd(45);   // 8 to 52 weeks back
    var f = rnd(2) ? 0.62 + rnd(28) / 100 : 1.12 + rnd(34) / 100;   // never close to 1
    return { maps: { name: new Map(), code: new Map(), email: new Map() }, orig: { name: new Map(), code: new Map(), email: new Map() },
      used: new Set(), counters: {}, weeks: weeks, factor: Math.round(f * 1000) / 1000, keyLoaded: false };
  }
  function swapCode(s, keep, used){
    keep = Math.max(0, Math.min(keep || 0, s.length));
    var head = s.slice(0, keep), tail = s.slice(keep);
    if (!/[A-Za-z0-9]/.test(tail)) return s;
    var lead = (/^0+/.exec(tail) || [''])[0];   // leading zeros stay (phone numbers, padded codes)
    head += lead; tail = tail.slice(lead.length);
    if (!/[A-Za-z0-9]/.test(tail)) return s;
    for (var tries = 0; tries < 60; tries++) {
      var first = true, out = head + tail.replace(/[A-Za-z0-9]/g, function(ch){
        var r;
        if (/\d/.test(ch)) r = (first && ch !== '0') ? String(1 + rnd(9)) : String(rnd(10));
        else { r = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.charAt(rnd(24)); if (ch === ch.toLowerCase()) r = r.toLowerCase(); }
        first = false; return r;
      });
      if (out !== s && !used.has(norm(out))) return out;
    }
    return head + tail.replace(/[A-Za-z0-9]/g, function(ch){ return /\d/.test(ch) ? '0' : 'X'; });
  }
  function stand(run, kind, v, col){
    var key = norm(v);
    if (run.maps[kind].has(key)) return run.maps[kind].get(key);
    var out, n;
    if (kind === 'name') {
      var label = (col.label || 'Value').trim() || 'Value';
      n = run.counters[label] || 0;
      do { n++; out = label + ' ' + pad(n, 3); } while (run.used.has(norm(out)));
      run.counters[label] = n;
    } else if (kind === 'email') {
      n = run.counters['@'] || 0;
      do { n++; out = 'contact' + pad(n, 3) + '@example.com'; } while (run.used.has(norm(out)));
      run.counters['@'] = n;
    } else {
      out = swapCode(String(v).trim(), col.keep, run.used);
    }
    run.maps[kind].set(key, out); run.orig[kind].set(key, String(v).trim()); run.used.add(norm(out));
    return out;
  }
  function shiftDate(v, weeks, order){
    var ms = weeks * 7 * 864e5;
    if (isDate(v)) return new Date(v.getTime() - ms);
    if (typeof v !== 'string') return v;
    var p = parseDate(v.trim(), order);
    if (!p) return v;
    var t = new Date(Date.UTC(p.y, p.mo - 1, p.d) - ms), y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1, d = t.getUTCDate(), m = p.m;
    if (p.f === 'iso') return pad(y, 4) + m[2] + pad(mo, m[3].length) + m[2] + pad(d, m[4].length) + m[5];
    var yy = m[4].length === 2 ? pad(y % 100, 2) : String(y);
    if (p.f === 'mon') {
      var name = m[3].length > 4 ? MONTHS[mo - 1] : MONTHS[mo - 1].slice(0, m[3].length === 4 ? 3 : 3);
      if (m[3] === m[3].toUpperCase()) name = name.toUpperCase(); else if (m[3] === m[3].toLowerCase()) name = name.toLowerCase();
      return pad(d, m[1].length) + m[2] + name + m[2] + yy + m[5];
    }
    var a = p.f === 'mdy' ? pad(mo, m[1].length) : pad(d, m[1].length), b = p.f === 'mdy' ? pad(d, m[3].length) : pad(mo, m[3].length);
    return a + m[2] + b + m[2] + yy + m[5];
  }
  function decimals(n){ var s = String(n); if (/e/i.test(s)) return 2; var i = s.indexOf('.'); return i < 0 ? 0 : Math.min(s.length - i - 1, 6); }
  function scaleNum(v, f){
    if (typeof v === 'number') { var dp = decimals(v), p = Math.pow(10, dp); return Math.round(v * f * p) / p; }
    if (typeof v !== 'string') return v;
    var m = RX.num.exec(v.trim());
    if (!m) return v;
    var dp2 = m[5] ? m[5].length - 1 : 0, x = parseFloat(m[4].replace(/,/g, '') + (m[5] || '')) * f;
    var s = x.toFixed(dp2), ip = s.split('.')[0], dec = s.split('.')[1];
    if (m[4].indexOf(',') > -1) ip = fmtInt(ip);
    return m[1] + m[2] + m[3] + ip + (dec ? '.' + dec : '') + m[6];
  }
  function tx(run, v, col){
    if (v === null || v === undefined || v === '' || (typeof v === 'string' && !v.trim())) return v;
    switch (col.act) {
      case 'name': return stand(run, 'name', isDate(v) ? show(v) : v, col);
      case 'email': return stand(run, 'email', v, col);
      case 'code':
        var out = stand(run, 'code', isDate(v) ? show(v) : v, col);
        return (typeof v === 'number' && /^\d+$/.test(out)) ? Number(out) : out;
      case 'date': return shiftDate(v, run.weeks, col.order);
      case 'scale': return scaleNum(v, run.factor);
      case 'clear': return '';
      default: return v;
    }
  }

  // ---------- leak check ----------
  function reEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function leakPatterns(run){
    var list = [];
    ['name', 'code', 'email'].forEach(function(k){
      run.orig[k].forEach(function(o, key){
        if (key.length < 4) return;
        if (/^[\d\s]+$/.test(key) && key.replace(/\s/g, '').length < 5) return;
        list.push(key);
      });
    });
    list.sort(function(a, b){ return b.length - a.length; });
    var res = [];
    for (var i = 0; i < list.length; i += 400)
      res.push(new RegExp('(?<![A-Za-z0-9])(?:' + list.slice(i, i + 400).map(function(s){ return reEsc(s).replace(/ /g, '\\s+'); }).join('|') + ')(?![A-Za-z0-9])', 'gi'));
    return res;
  }
  function findLeak(res, s){
    if (typeof s !== 'string' || s.length < 4) return null;
    for (var i = 0; i < res.length; i++) { res[i].lastIndex = 0; var m = res[i].exec(s); if (m) return m[0]; }
    return null;
  }
  function fixLeak(run, res, s){
    res.forEach(function(re){
      re.lastIndex = 0;
      s = s.replace(re, function(m){
        var k = norm(m);
        return run.maps.name.get(k) || run.maps.email.get(k) || run.maps.code.get(k) || m;
      });
    });
    return s;
  }

  // ---------- key file ----------
  var KEY_HEAD = 'meshlock-anonymiser-key';
  function keyCSV(run){
    var rows = [[KEY_HEAD, 'v1', 'Keep this file. Never send it with the data.'], ['kind', 'real value', 'stand-in'],
      ['setting', 'date-shift-weeks', String(run.weeks)], ['setting', 'scale-factor', String(run.factor)]];
    ['name', 'code', 'email'].forEach(function(k){ run.maps[k].forEach(function(out, key){ rows.push([k, run.orig[k].get(key), String(out)]); }); });
    return '﻿' + toCSV(rows, ',', '\r\n');
  }
  function loadKey(run, rows){
    var n = 0;
    rows.slice(2).forEach(function(r){
      if (r[0] === 'setting') {
        if (r[1] === 'date-shift-weeks' && +r[2] > 0) run.weeks = +r[2];
        if (r[1] === 'scale-factor' && +r[2] > 0) run.factor = +r[2];
        return;
      }
      if (!run.maps[r[0]] || !r[1] || !r[2]) return;
      var key = norm(r[1]);
      run.maps[r[0]].set(key, r[2]); run.orig[r[0]].set(key, r[1]); run.used.add(norm(r[2])); n++;
      var m = /^(.*) (\d+)$/.exec(r[2]);
      if (r[0] === 'name' && m) run.counters[m[1]] = Math.max(run.counters[m[1]] || 0, +m[2]);
      m = /^contact(\d+)@example\.com$/.exec(r[2]);
      if (r[0] === 'email' && m) run.counters['@'] = Math.max(run.counters['@'] || 0, +m[1]);
    });
    run.keyLoaded = true;
    return n;
  }

  // ---------- Excel ----------
  function cellVal(cell){
    var v = cell.value;
    if (v === null || v === undefined) return '';
    if (isDate(v) || typeof v !== 'object') return v;
    if (v.richText) return v.richText.map(function(t){ return t.text; }).join('');
    if ('formula' in v || 'sharedFormula' in v) { var r = v.result; if (r === null || r === undefined) return ''; if (isDate(r) || typeof r !== 'object') return r; return r.error || ''; }
    if (v.hyperlink !== undefined) return (v.text && v.text.richText) ? v.text.richText.map(function(t){ return t.text; }).join('') : (v.text || '');
    if (v.error) return v.error;
    return String(v);
  }
  function sheetRows(ws){
    var rows = [], rc = ws.rowCount, cc = ws.columnCount;
    for (var r = 1; r <= rc; r++) {
      var row = ws.getRow(r), out = [];
      for (var c = 1; c <= cc; c++) out.push(cellVal(row.getCell(c)));
      while (out.length && out[out.length - 1] === '') out.pop();
      rows.push(out);
    }
    while (rows.length && !rows[rows.length - 1].length) rows.pop();
    return rows;
  }
  async function writeXlsx(f){
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(f.buf.slice(0));
    ['creator', 'lastModifiedBy', 'company', 'manager', 'title', 'subject', 'keywords', 'description', 'category'].forEach(function(p){ wb[p] = ''; });
    f.tables.forEach(function(t){
      var ws = wb.getWorksheet(t.sheet);
      if (!ws || !t.out) return;
      var out = t.out;
      t.cols.forEach(function(col){
        if (col.act === 'keep' || col.act === 'remove') return;
        for (var r = 1; r < out.length; r++) {
          var nv = out[r][col.i], cell = ws.getCell(t.hdr + r, col.i + 1);
          if (nv === undefined) continue;
          if (cellVal(cell) === '' && nv === '') continue;
          cell.value = nv === '' ? null : nv;
        }
      });
      t.fixed.forEach(function(k){ var p = k.split('|'); ws.getCell(t.hdr + +p[0], +p[1] + 1).value = out[+p[0]][+p[1]]; });
      // Links and cell notes can carry names: links become plain text, notes go
      ws.eachRow({ includeEmpty: false }, function(row){
        row.eachCell({ includeEmpty: false }, function(cell){
          if (cell._comment) cell._comment = undefined;
          var v = cell.value;
          if (v && typeof v === 'object' && !isDate(v) && v.hyperlink !== undefined) cell.value = cellVal(cell);
        });
      });
      ws.headerFooter = { differentFirst: false, differentOddEven: false, oddHeader: null, oddFooter: null, evenHeader: null, evenFooter: null, firstHeader: null, firstFooter: null };
      t.cols.filter(function(c){ return c.act === 'remove'; }).map(function(c){ return c.i; }).sort(function(a, b){ return b - a; })
        .forEach(function(i){ ws.spliceColumns(i + 1, 1); });
      if (t.hdr > 1) ws.spliceRows(1, t.hdr - 1);
      if (t.outSheet && t.outSheet !== t.sheet) ws.name = t.outSheet.slice(0, 31);
    });
    return wb.xlsx.writeBuffer();
  }

  // ---------- tables ----------
  function colLetter(i){ var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function buildCols(t){
    var hdr = t.src[t.hdr - 1] || [], body = t.src.slice(t.hdr), width = 0, old = {};
    (t.cols || []).forEach(function(c){ old[c.i + '|' + c.name] = c; });
    t.src.forEach(function(r){ if (r.length > width) width = r.length; });
    t.cols = [];
    for (var i = 0; i < width; i++) {
      var name = show(hdr[i] === undefined ? '' : hdr[i]).trim() || 'Column ' + colLetter(i);
      var vals = [], seen = new Set();
      for (var r = 0; r < body.length && vals.length < 300; r++) { var v = body[r][i]; if (v !== undefined && v !== '' && !(typeof v === 'string' && !v.trim())) vals.push(v); }
      var order = dateOrder(vals), tally = {}, len = 0;
      vals.forEach(function(v){ var k = kindOf(v, order); tally[k] = (tally[k] || 0) + 1; seen.add(norm(show(v))); len += show(v).length; });
      var top = '', best = 0;
      Object.keys(tally).forEach(function(k){ if (tally[k] > best) { best = tally[k]; top = k; } });
      var kinds = { top: top, share: vals.length ? best / vals.length : 0, distinct: seen.size, avgLen: vals.length ? len / vals.length : 0 };
      var sg = vals.length ? suggest(name, kinds) : ['keep', 'Empty column'];
      var prev = old[i + '|' + name];
      var samples = [], ss = new Set();
      vals.forEach(function(v){ var s = show(v); if (samples.length < 3 && !ss.has(s)) { ss.add(s); samples.push(s); } });
      t.cols.push({ i: i, name: name, kinds: kinds, order: order, sug: sg[0], why: sg[1], act: prev ? prev.act : sg[0],
        label: prev ? prev.label : labelFrom(name), keep: prev ? prev.keep : 0, samples: samples, count: vals.length });
    }
  }
  function runTable(run, t){
    var hdr = (t.src[t.hdr - 1] || []).slice(), out = [];
    out.push(t.cols.map(function(c){ return hdr[c.i] === undefined ? '' : hdr[c.i]; }));
    t.src.slice(t.hdr).forEach(function(row){
      out.push(t.cols.map(function(c){ var v = row[c.i]; return v === undefined ? '' : tx(run, v, c); }));
    });
    t.out = out; t.fixed = new Set(); t.outSheet = t.sheet;
  }
  function leakScan(run, files){
    var res = leakPatterns(run), hits = [];
    if (!res.length) return { res: res, hits: hits };
    files.forEach(function(f, fi){
      var base = f.outName.replace(/\.[^.]+$/, ''), m = findLeak(res, base.replace(/[_-]+/g, ' '));
      if (m) hits.push({ f: fi, where: 'file name', what: f.outName, m: m, fix: function(){ f.outName = fixLeak(run, res, base.replace(/[_-]+/g, ' ')).replace(/\s+/g, '-') + f.outName.slice(base.length); } });
      f.tables.forEach(function(t){
        if (!t.out) return;
        if (t.sheet) {
          var sm = findLeak(res, t.outSheet);
          if (sm) hits.push({ f: fi, where: 'sheet name', what: t.outSheet, m: sm, fix: function(){ t.outSheet = fixLeak(run, res, t.outSheet); } });
        }
        t.cols.forEach(function(c){
          if (c.act === 'remove' || c.act === 'clear') return;
          var swapped = c.act === 'name' || c.act === 'code' || c.act === 'email';
          // A swapped column holds only stand-ins, so only its header is checked
          for (var r = 0; r < (swapped ? 1 : t.out.length); r++) {
            var v = t.out[r][c.i];
            if (typeof v !== 'string') continue;
            var m2 = findLeak(res, v);
            if (m2) (function(r, c){
              hits.push({ f: fi, t: t, r: r, c: c, where: (t.sheet ? t.sheet + ' · ' : '') + c.name + ' · row ' + (t.hdr + r), what: v, m: m2,
                fix: function(){ t.out[r][c.i] = fixLeak(run, res, t.out[r][c.i]); t.fixed.add(r + '|' + c.i); } });
            })(r, c);
          }
        });
      });
    });
    return { res: res, hits: hits };
  }

  // ---------- page ----------
  var count = 0;
  function build(root){
    var id = 'an' + (++count), tag = root.getAttribute('data-offer-tag');
    var files = [], run = newRun(), keyName = '', done = false, lastScan = null;
    root.innerHTML =
      '<div class="an">' +
        '<div class="an-head"><span class="an-tag">File anonymiser</span><span class="an-sub-head">Runs in this browser · nothing is uploaded</span></div>' +
        '<div class="an-step"><div class="an-st"><span class="an-n">1</span>Add the files</div>' +
          '<label class="an-drop" for="' + id + 'f"><input type="file" id="' + id + 'f" class="an-file" multiple accept=".csv,.txt,.tsv,.xlsx,.xlsm">' +
            '<span class="an-drop-h">Choose files or drop them here</span>' +
            '<span class="an-drop-s">CSV or Excel (.xlsx). Add every file that shares the same customers at once, so they get the same stand-ins. Got a key from an earlier file? Add it too.</span></label>' +
          '<div class="an-files"></div><div class="an-msg" role="status"></div>' +
        '</div>' +
        '<div class="an-step an-cols-step" hidden><div class="an-st"><span class="an-n">2</span>Check each column</div>' +
          '<div class="an-hint">Suggestions come from the header and the values. Change any of them.</div><div class="an-tables"></div>' +
          '<div class="an-go-row"><button type="button" class="an-btn an-run">Anonymise</button><span class="an-stale" hidden>Settings changed. Press Anonymise again.</span></div>' +
        '</div>' +
        '<div class="an-step an-res-step" hidden aria-live="polite"><div class="an-st"><span class="an-n">3</span>Check the result</div><div class="an-res"></div></div>' +
        '<div class="an-step an-dl-step" hidden><div class="an-st"><span class="an-n">4</span>Save</div><div class="an-dl"></div></div>' +
        '<div class="an-actions"><button type="button" class="an-reset">Start again</button></div>' +
      '</div>';
    var $ = function(s){ return root.querySelector(s); };
    var input = $('.an-file'), drop = $('.an-drop');

    function msg(s, bad){ var m = $('.an-msg'); m.textContent = s || ''; m.classList.toggle('an-bad', !!bad); }
    function stale(){ if (done) { $('.an-stale').hidden = false; $('.an-res-step').classList.add('an-dim'); $('.an-dl-step').hidden = true; } }
    function outName(name, ext){ var b = name.replace(/\.[^.]+$/, ''); return b + '-anon.' + ext; }

    async function addFiles(list){
      msg('');
      var notes = [];
      for (var k = 0; k < list.length; k++) {
        var file = list[k], low = file.name.toLowerCase();
        try {
          if (/\.xls$/.test(low)) { notes.push(file.name + ': old .xls format. Open it in Excel and save it as .xlsx or CSV first.'); continue; }
          if (!/\.(csv|txt|tsv|xlsx|xlsm)$/.test(low)) { notes.push(file.name + ': only CSV and Excel (.xlsx) files can be read here.'); continue; }
          var buf = await file.arrayBuffer();
          if (/\.(csv|txt|tsv)$/.test(low)) {
            var dec = decode(buf), text = dec.text;
            if (text.slice(0, KEY_HEAD.length + 1).replace(/^"/, '').indexOf(KEY_HEAD) === 0) {
              var kn = loadKey(run, parseCSV(text, ','));
              keyName = file.name; notes.push('Key added: ' + kn + ' stand-ins will be reused.');
              files.forEach(function(f){ f.tables.forEach(function(t){ t.out = null; }); });
              continue;
            }
            var d = /\.tsv$/.test(low) ? '\t' : detectDelim(text), eol = /\r\n/.test(text.slice(0, 5000)) ? '\r\n' : '\n';
            var rows = parseCSV(text, d);
            if (!rows.length) { notes.push(file.name + ': the file is empty.'); continue; }
            var fr = { name: file.name, type: 'csv', delim: d, eol: eol, bom: dec.bom, outName: outName(file.name, 'csv') };
            fr.tables = [{ file: fr, sheet: null, src: rows, hdr: 1 }];
            buildCols(fr.tables[0]); files.push(fr);
          } else {
            if (!window.ExcelJS) { notes.push(file.name + ': the Excel reader did not load. Reload the page, or save the file as CSV.'); continue; }
            var wb = new window.ExcelJS.Workbook();
            await wb.xlsx.load(buf.slice(0));
            var fx = { name: file.name, type: 'xlsx', buf: buf, outName: outName(file.name, 'xlsx'), tables: [] };
            wb.eachSheet(function(ws){
              var srows = sheetRows(ws);
              if (!srows.length) return;
              var t = { file: fx, sheet: ws.name, hidden: ws.state && ws.state !== 'visible', src: srows, hdr: 1 };
              buildCols(t); fx.tables.push(t);
            });
            if (!fx.tables.length) { notes.push(file.name + ': no data found on any sheet.'); continue; }
            files.push(fx);
          }
        } catch (e) {
          notes.push(file.name + ': this file could not be read here' + (/password|encrypt/i.test(String(e && e.message)) ? ' (it is password protected).' : '. Save it as CSV and try again.'));
        }
      }
      done = false; renderAll();
      if (notes.length) msg(notes.join(' '), notes.some(function(n){ return !/^Key added/.test(n); }));
    }

    function renderFiles(){
      $('.an-files').innerHTML = files.map(function(f, i){
        var rows = f.tables.reduce(function(a, t){ return a + Math.max(0, t.src.length - t.hdr); }, 0);
        return '<div class="an-fl"><span class="an-fl-n">' + esc(f.name) + '</span><span class="an-fl-s">' + (f.type === 'xlsx' ? f.tables.length + (f.tables.length === 1 ? ' sheet · ' : ' sheets · ') : '') + fmtInt(rows) + ' rows</span>' +
          '<button type="button" class="an-x" data-rm="' + i + '" aria-label="Remove ' + esc(f.name) + '">×</button></div>';
      }).join('') + (keyName ? '<div class="an-fl an-fl-key"><span class="an-fl-n">' + esc(keyName) + '</span><span class="an-fl-s">key · stand-ins reused</span></div>' : '');
    }
    function colRow(ti, c){
      var opt = ACTS.map(function(a){ return '<option value="' + a[0] + '"' + (a[0] === c.act ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('');
      var extra = '';
      if (c.act === 'name') extra = '<label class="an-opt">Stand-in label <input type="text" class="an-in" data-label="' + ti + '|' + c.i + '" value="' + esc(c.label) + '" maxlength="24"></label><span class="an-eg">e.g. ' + esc(c.label || 'Value') + ' 001</span>';
      if (c.act === 'code') extra = '<label class="an-opt">Keep the first <input type="number" class="an-in an-num" min="0" max="20" data-keep="' + ti + '|' + c.i + '" value="' + c.keep + '"> characters</label><span class="an-eg">Only if a tool needs them, like a postcode area or an order type.</span>';
      var flag = c.sug !== 'keep';
      return '<div class="an-col' + (c.act === 'remove' ? ' an-off' : '') + '">' +
        '<div class="an-col-l"><div class="an-col-n">' + (flag ? '<span class="an-dot" title="Looks sensitive"></span>' : '') + esc(cut(c.name, 40)) + '</div>' +
          '<div class="an-col-s">' + (c.samples.length ? c.samples.map(function(s){ return esc(cut(s, 28)); }).join(' · ') : 'empty') + '</div>' +
          (c.why ? '<div class="an-why">' + esc(c.why) + '</div>' : '') + '</div>' +
        '<div class="an-col-r"><select class="an-sel" data-act="' + ti + '|' + c.i + '" aria-label="What to do with ' + esc(c.name) + '">' + opt + '</select>' + extra + '</div></div>';
    }
    function allTables(){ var a = []; files.forEach(function(f){ f.tables.forEach(function(t){ a.push(t); }); }); return a; }
    function renderTables(){
      var tables = allTables();
      $('.an-tables').innerHTML = tables.map(function(t, ti){
        return '<div class="an-tb">' +
          '<div class="an-tb-h"><span class="an-tb-n">' + esc(t.file.name) + (t.sheet ? ' · ' + esc(t.sheet) + (t.hidden ? ' (hidden sheet)' : '') : '') + '</span>' +
            '<label class="an-opt an-hdr">Header row <input type="number" class="an-in an-num" min="1" max="' + Math.min(30, t.src.length) + '" data-hdr="' + ti + '" value="' + t.hdr + '"></label></div>' +
          (t.hdr > 1 ? '<div class="an-eg an-above">Rows above the header are left out of the saved file.</div>' : '') +
          t.cols.map(function(c){ return colRow(ti, c); }).join('') + '</div>';
      }).join('');
    }
    function renderAll(){
      renderFiles();
      var has = files.length > 0;
      $('.an-cols-step').hidden = !has;
      if (has) renderTables();
      $('.an-stale').hidden = true;
      $('.an-res-step').hidden = !done || !has; $('.an-res-step').classList.remove('an-dim');
      $('.an-dl-step').hidden = !done || !has;
    }

    function preview(t){
      var cols = t.cols, before = t.src.slice(t.hdr - 1, t.hdr + 5), after = t.out.slice(0, 6);
      function tbl(rows, isAfter){
        return '<div class="an-pv-w"><table class="an-pv"><tbody>' + rows.map(function(r, ri){
          return '<tr>' + cols.map(function(c){
            if (isAfter && c.act === 'remove') return '';
            var v = show(r[c.i] === undefined ? '' : r[c.i]), ch = c.act !== 'keep' && ri > 0;
            var tag = ri === 0 ? 'th' : 'td';
            return '<' + tag + (ch ? ' class="' + (isAfter ? 'an-new' : 'an-old') + '"' : (c.act === 'remove' ? ' class="an-old"' : '')) + '>' + esc(cut(v, 30)) + '</' + tag + '>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
      }
      return '<div class="an-pv-h">Before</div>' + tbl(before, false) + '<div class="an-pv-h">After</div>' + tbl(after, true);
    }
    function renderResult(){
      var tables = allTables().filter(function(t){ return t.out; });
      var swaps = run.maps.name.size + run.maps.code.size + run.maps.email.size;
      var rows = tables.reduce(function(a, t){ return a + t.out.length - 1; }, 0);
      lastScan = leakScan(run, files);
      var hits = lastScan.hits;
      var html = '<div class="an-sum">' + files.length + (files.length === 1 ? ' file · ' : ' files · ') + fmtInt(rows) + ' rows · ' + fmtInt(swaps) + ' different values swapped</div>';
      html += '<div class="an-check ' + (hits.length ? 'an-check-bad' : 'an-check-ok') + '"><span class="an-stamp">' + (hits.length ? 'CHECK THESE' : 'NO REAL VALUES FOUND') + '</span>';
      if (hits.length) {
        html += '<div class="an-ch">' + hits.length + (hits.length === 1 ? ' place still holds' : ' places still hold') + ' a real value from a swapped column</div><ul class="an-hits">' +
          hits.slice(0, 8).map(function(h){ return '<li><span class="an-hw">' + esc(files[h.f].name + ' · ' + h.where) + '</span>' + esc(cut(h.what, 70)) + ' <span class="an-hm">' + esc(h.m) + '</span></li>'; }).join('') +
          (hits.length > 8 ? '<li class="an-more">and ' + (hits.length - 8) + ' more</li>' : '') + '</ul>' +
          '<button type="button" class="an-btn an-fix">Swap them there too</button>';
      } else {
        html += '<div class="an-ch">No real value from a swapped column turns up anywhere else: not in kept columns, headers, sheet names or file names.</div>';
      }
      html += '<div class="an-eye">The check only knows values from swapped columns. Look over free text, pictures and anything else it cannot see before sending.</div></div>';
      html += '<div class="an-pv-pick">' + (tables.length > 1 ? '<label class="an-opt">Preview <select class="an-sel an-pv-sel">' + tables.map(function(t, i){ return '<option value="' + i + '">' + esc(t.file.name + (t.sheet ? ' · ' + t.sheet : '')) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
      html += '<div class="an-pv-box">' + (tables.length ? preview(tables[0]) : '') + '</div>';
      $('.an-res').innerHTML = html;
      var sel = $('.an-pv-sel');
      if (sel) sel.addEventListener('change', function(){ $('.an-pv-box').innerHTML = preview(tables[+sel.value]); });
      var fix = $('.an-fix');
      if (fix) fix.addEventListener('click', function(){ hits.forEach(function(h){ h.fix(); }); renderResult(); renderDownloads(); });
    }
    function renderDownloads(){
      var html = files.map(function(f, i){
        return '<div class="an-dlf"><label class="an-opt an-dln">Save as <input type="text" class="an-in an-name" data-name="' + i + '" value="' + esc(f.outName) + '"></label>' +
          '<button type="button" class="an-btn an-save" data-save="' + i + '">Download</button></div>';
      }).join('');
      html += '<div class="an-dlf"><span class="an-dl-t">A short note for whoever gets the files: what each column holds now. No real values in it.</span><button type="button" class="an-btn an-btn-2 an-note">Download the note (.txt)</button></div>';
      html += '<div class="an-key"><span class="an-stamp">KEEP IT · DON\'T SEND IT</span><div class="an-ch">The key</div>' +
        '<div class="an-dl-t">Every stand-in next to its real value. It turns an answer full of stand-ins back into your own names. Keep it with you, and add it next time so the same customer gets the same stand-in.</div>' +
        '<button type="button" class="an-btn an-btn-2 an-keybtn">Download the key (.csv)</button></div>';
      html += '<div class="an-next">Need a tool built around files like these? <a href="/start/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#f=export">Tick it and get a one-page offer →</a></div>';
      $('.an-dl').innerHTML = html;
    }
    function save(blob, name){
      var a = document.createElement('a'), u = URL.createObjectURL(blob);
      a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(u); }, 4000);
    }
    function noteText(){
      var L = ['Anonymised files', 'Made with the Meshlock file anonymiser (meshlock.co.uk/toolkit/anonymise/) on ' + new Date().toISOString().slice(0, 10) + '.', ''];
      files.forEach(function(f){
        L.push(f.outName);
        f.tables.forEach(function(t){
          if (t.sheet) L.push('  Sheet: ' + (t.outSheet || t.sheet));
          t.cols.forEach(function(c){ L.push('  ' + (t.sheet ? '  ' : '') + c.name + ': ' + ACT_SHORT[c.act]); });
        });
        L.push('');
      });
      L.push('The same real value always got the same stand-in, in every column and every file above.');
      L.push('Codes kept their length and pattern: letters stayed letters, digits stayed digits.');
      return L.join('\r\n') + '\r\n';
    }

    // events
    input.addEventListener('change', function(){ if (input.files.length) addFiles([].slice.call(input.files)).then(function(){ input.value = ''; }); });
    ['dragenter', 'dragover'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.add('an-over'); }); });
    ['dragleave', 'drop'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.remove('an-over'); }); });
    drop.addEventListener('drop', function(ev){ if (ev.dataTransfer && ev.dataTransfer.files.length) addFiles([].slice.call(ev.dataTransfer.files)); });
    root.addEventListener('click', function(ev){
      var b = ev.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-rm')) { files.splice(+b.getAttribute('data-rm'), 1); done = false; renderAll(); return; }
      if (b.classList.contains('an-run')) {
        // Without a key every press starts fresh stand-ins (same hidden settings); with a key its stand-ins are kept
        if (!run.keyLoaded) { var w = run.weeks, f = run.factor; run = newRun(); run.weeks = w; run.factor = f; }
        allTables().forEach(function(t){ runTable(run, t); });
        done = true; renderAll(); renderResult(); renderDownloads();
        $('.an-res-step').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (b.hasAttribute('data-save')) {
        var fr = files[+b.getAttribute('data-save')];
        if (fr.type === 'csv') {
          var t = fr.tables[0], rows = t.out.map(function(r){ return t.cols.filter(function(c){ return c.act !== 'remove'; }).map(function(c){ return r[c.i]; }); });
          save(new Blob([(fr.bom ? '﻿' : '') + toCSV(rows, fr.delim, fr.eol)], { type: 'text/csv;charset=utf-8' }), fr.outName);
        } else {
          b.disabled = true; b.textContent = 'Preparing…';
          writeXlsx(fr).then(function(out){ save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fr.outName); })
            .catch(function(){ msg('This Excel file could not be saved. Save it as CSV and try again.', true); })
            .then(function(){ b.disabled = false; b.textContent = 'Download'; });
        }
        return;
      }
      if (b.classList.contains('an-note')) { save(new Blob([noteText()], { type: 'text/plain;charset=utf-8' }), 'anonymised-files-note.txt'); return; }
      if (b.classList.contains('an-keybtn')) { save(new Blob([keyCSV(run)], { type: 'text/csv;charset=utf-8' }), 'anonymiser-key-keep-private.csv'); return; }
      if (b.classList.contains('an-reset')) { files = []; run = newRun(); keyName = ''; done = false; msg(''); renderAll(); $('.an-res').innerHTML = ''; $('.an-dl').innerHTML = ''; return; }
    });
    root.addEventListener('change', function(ev){
      var el = ev.target, tables = allTables(), p;
      if (el.hasAttribute('data-act')) { p = el.getAttribute('data-act').split('|'); tables[+p[0]].cols[+p[1]].act = el.value; renderTables(); stale(); }
      else if (el.hasAttribute('data-hdr')) { var t = tables[+el.getAttribute('data-hdr')], v = Math.max(1, Math.min(+el.value || 1, t.src.length)); t.hdr = v; buildCols(t); renderTables(); stale(); }
      else if (el.hasAttribute('data-keep')) { p = el.getAttribute('data-keep').split('|'); tables[+p[0]].cols[+p[1]].keep = Math.max(0, Math.min(20, +el.value || 0)); stale(); }
      else if (el.hasAttribute('data-name')) { var fr = files[+el.getAttribute('data-name')], ext = fr.type === 'csv' ? '.csv' : '.xlsx'; var nm = el.value.trim().replace(/[\\\/:*?"<>|]+/g, '') || 'anonymised'; if (!new RegExp('\\' + ext + '$', 'i').test(nm)) nm += ext; fr.outName = nm; el.value = nm; renderResult(); }
    });
    root.addEventListener('input', function(ev){
      var el = ev.target;
      if (el.hasAttribute('data-label')) { var p = el.getAttribute('data-label').split('|'), c = allTables()[+p[0]].cols[+p[1]]; c.label = el.value; var eg = el.closest('.an-col-r').querySelector('.an-eg'); if (eg) eg.textContent = 'e.g. ' + (el.value.trim() || 'Value') + ' 001'; stale(); }
    });
  }

  window.mlAnon = { parseCSV: parseCSV, toCSV: toCSV, detectDelim: detectDelim, kindOf: kindOf, suggest: suggest, shiftDate: shiftDate, scaleNum: scaleNum, swapCode: swapCode, labelFrom: labelFrom };
  function init(){ document.querySelectorAll('[data-tool="anonymise"]').forEach(function(el){ if (!el.__an) { el.__an = true; build(el); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
